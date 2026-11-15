# Imagen mínima para desplegar el bot (sin dependencias que instalar).
FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src

# Las citas se guardan en /data: monta ahí un volumen para que sobrevivan a los reinicios.
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production PORT=3000 DATA_FILE=/data/citas.json
VOLUME /data
EXPOSE 3000

USER node
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/server.js"]
