FROM node:20-alpine AS builder

WORKDIR /app

COPY . .

# Install Node deps
RUN npm ci

# Dummy DATABASE_URL for build (Prisma generate needs a valid-looking URL)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NODE_ENV=production

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN NEXT_IGNORE_TYPE_ERRORS=true npm run build


FROM node:20-alpine

# Install PostgreSQL for embedded mode (when no DATABASE_URL is provided)
RUN apk add --no-cache postgresql16 postgresql16-contrib su-exec

WORKDIR /app
COPY --from=builder /app ./
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
