# Runs the whole thing: backend API + realtime + the web app.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001 DATA_FILE=/data/db.json
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
VOLUME /data
EXPOSE 3001
CMD ["node", "server/index.js"]
