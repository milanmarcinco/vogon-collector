# Stage 1: Install dependencies
FROM node:25.6.0-alpine3.22 AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:25.6.0-alpine3.22 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Stage 3: Production runner
FROM node:25.6.0-alpine3.22
WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/build/package.json /app/build/package-lock.json ./build

WORKDIR /app/build
RUN npm ci --omit="dev"

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT [ "./entrypoint.sh" ]
