FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run db:generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
