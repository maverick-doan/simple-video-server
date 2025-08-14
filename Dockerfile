FROM node:20-alpine

RUN apk add --no-cache ffmpeg

RUN rm -rf /var/cache/apk/* && rm -rf /tmp/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

RUN npm install -g tsx
COPY tsconfig.json ./
COPY src ./src
RUN mkdir -p ./uploads/originals ./uploads/derived

ENV NODE_ENV=development
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "dev"]