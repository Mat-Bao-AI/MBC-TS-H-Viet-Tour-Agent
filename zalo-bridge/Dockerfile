FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p storage

EXPOSE 4000

CMD ["node", "src/server.js"]
