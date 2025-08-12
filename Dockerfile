FROM node:20-alpine AS builder

WORKDIR /app

# Install git (Alpine doesn't include it by default)
RUN apk add --no-cache git

COPY . .

# Clone the submodule
RUN git submodule update --init --recursive

# Install Node deps
RUN npm ci

# Set environment variables for build
ENV DATABASE_URL="file:./dev.db"
ENV DATABASE_URL_DEMO="file:./demo.db"
ENV NODE_ENV=production
ENV DEMO_MODE=true

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN NEXT_IGNORE_TYPE_ERRORS=true npm run build


FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app ./

# Runtime environment variables
ENV NODE_ENV=production
ENV DATABASE_URL="file:./dev.db"
ENV DATABASE_URL_DEMO="file:./demo.db"

# Ensure database directory exists and run migrations
RUN mkdir -p prisma && npx prisma migrate deploy

EXPOSE 3000
CMD ["npm", "start"]
