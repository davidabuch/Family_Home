# Changelog

## 0.1.44

- Show compact three-column child-account settings tiles directly on the administrator's Family Home landing page.
- Link each tile to the corresponding member's room and accessory settings without exposing controls to non-admin users.


## 0.1.43

- Add compact three-column member shortcut tiles to the administrator page.
- Select each member's room and accessory settings directly, using their stable account ID.
- Keep existing account management and permission enforcement unchanged.


## 0.1.42

- Keep yellow light and blue fan/shade icons colored on active white tiles, matching the HomeKit visual convention.
- Override legacy white SVG glyph styling without changing control behavior or the approved OFF tiles.

## 0.1.41

- Improve iPhone readability with larger accessory labels and statuses, tighter cards, and higher placement.
- Use clearer, lower-blur glass with stronger white text contrast.
- Use yellow light glyphs and blue fan/shade glyphs in both on and off states.

## 0.1.40

- Improve iPhone glass translucency with thinner specular borders, clearer neutral cards and blue active states.
- Replace broken CSS-mask tab squares with inline SVG navigation icons for dynamically generated room tabs.
- Preserve Home Assistant accessory controls, permissions and photo backgrounds.

## 0.1.39

- Add three optimized Sculptural White room photographs and frosted glass accessory tiles.
- Update room navigation and decorate the active profile tab without changing access permissions or device commands.
- Explicitly allowlist and serve photo assets with the correct WebP MIME type; include presentation regression checks.

## 0.1.38

- Crop approved originals to full-bleed squares without borders, padding, pre-rounded corners or distortion.
- Add public Apple touch and precomposed icon routes, versioned v2 references, and refreshed PWA/favicons.
- Verify unchanged originals, pixels, dimensions, local/remote handler equality and existing security regressions.

## 0.1.37

- Use the verified approved artwork for Apple touch icons, browser favicons and 192/512px PWA icons.
- Serve identical icon bytes on local and remote origins; preserve authentication and controls.
