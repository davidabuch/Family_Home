ARG BUILD_FROM=node:22-alpine
FROM ${BUILD_FROM}
WORKDIR /app
COPY package.json server.js ./
COPY lib ./lib
COPY public ./public
COPY family_home/start.mjs ./start.mjs
EXPOSE 8099
CMD ["node", "/app/start.mjs"]
