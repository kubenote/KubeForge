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

WORKDIR /app
COPY --from=builder /app ./

ENV NODE_ENV=production

EXPOSE 3000
CMD sh -c "npx prisma migrate deploy && node scripts/ensure-schemas.js && npm start"
