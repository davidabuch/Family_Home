FROM node:22-alpine
RUN apk add --no-cache git
WORKDIR /app
ARG FAMILY_HOME_BUILD_REV=20261010-0115
RUN echo "Build revision: $FAMILY_HOME_BUILD_REV" && git clone --depth 1 https://github.com/davidabuch/Family_Home.git /tmp/family-home \
 && cp /tmp/family-home/package.json /tmp/family-home/server.js ./ \
 && cp -r /tmp/family-home/lib /tmp/family-home/public ./ \
 && rm -rf /tmp/family-home
COPY start.mjs ./start.mjs
EXPOSE 8099
CMD ["node", "/app/start.mjs"]
