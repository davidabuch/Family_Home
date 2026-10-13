"""Reproduce the stale remote-clone layer and test the production version key.

Only the git-clone network transport is replaced by a moving loopback archive.
Docker caching, ARG handling, packaging COPYs and installed assets are real.
No application process or Home Assistant command runs.
"""
import functools
import hashlib
import http.server
import io
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import threading
import uuid

ROOT = Path(__file__).resolve().parents[1]
CLONE = 'git clone --depth 1 https://github.com/davidabuch/Family_Home.git /tmp/family-home'
PREFIX = 'RUN test -n "$BUILD_VERSION" && echo "Build version: $BUILD_VERSION; revision: $FAMILY_HOME_BUILD_REV"'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def run(*args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-6000:])
    return result.stdout


def archive(path, source):
    with tarfile.open(path, 'w') as stream:
        for name in ['package.json', 'server.js', 'lib', 'public']:
            stream.add(ROOT / name, arcname=name, filter=lambda info: None if info.name == 'public/app.js' else info)
        info = tarfile.TarInfo('public/app.js')
        info.size = len(source)
        stream.addfile(info, io.BytesIO(source))


def main():
    if not shutil.which('docker'):
        raise RuntimeError('Docker is required for the actual build-cache regression')
    run('docker', 'info', '--format', '{{.ServerVersion}}')
    current = (ROOT / 'public/app.js').read_bytes()
    stale = b"/* prior release */ const poolLink = 'Pool & Spa';\n"
    assert b'poolLink' not in current and b'Open Family Music' in current
    production = (ROOT / 'family_home/Dockerfile').read_text()
    assert CLONE in production and PREFIX in production
    broken = production.replace('ARG BUILD_VERSION\n', '').replace(PREFIX, 'RUN echo "Build revision: $FAMILY_HOME_BUILD_REV"')
    tags = []
    with tempfile.TemporaryDirectory(prefix='family-home-build-cache-') as directory:
        root = Path(directory)
        context = root / 'context'
        context.mkdir()
        shutil.copy(ROOT / 'family_home/start.mjs', context / 'start.mjs')
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=directory))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        transport = f'mkdir -p /tmp/family-home && wget -qO- http://127.0.0.1:{server.server_port}/source.tar | tar -xf - -C /tmp/family-home'
        prefix = 'family-home-cache-regression-' + uuid.uuid4().hex[:12]

        def build(recipe, version, label):
            (context / 'Dockerfile').write_text(recipe.replace(CLONE, transport))
            tag = prefix + ':' + label
            tags.append(tag)
            run('docker', 'build', '--network=host', '--build-arg', 'BUILD_VERSION=' + version, '-t', tag, str(context))
            # Read only the packaged public asset. Never start server.js.
            data = subprocess.check_output(['docker', 'run', '--rm', '--network=none', '--entrypoint', 'node', tag,
                                            '-e', 'process.stdout.write(require("node:fs").readFileSync("/app/public/app.js"))'])
            return data

        try:
            archive(root / 'source.tar', stale)
            assert build(broken, '0.1.35', 'broken35') == stale
            archive(root / 'source.tar', current)
            assert build(broken, '0.1.36', 'broken36') == stale, 'Baseline must reproduce stale-layer reuse'
            print('REPRODUCED: undeclared BUILD_VERSION reuses obsolete assets across releases')
            archive(root / 'source.tar', stale)
            assert build(production, '0.1.35', 'fixed35') == stale
            archive(root / 'source.tar', current)
            actual = build(production, '0.1.36', 'fixed36')
            assert actual == current, 'Version change must fetch and package the current asset'
            print('PASS: production Dockerfile packages current Pool-free/Music-preserving assets')
            print('Packaged app.js SHA256: ' + hashlib.sha256(actual).hexdigest())
        finally:
            server.shutdown()
            for tag in tags:
                subprocess.run(['docker', 'image', 'rm', tag], capture_output=True)


if __name__ == '__main__':
    main()
