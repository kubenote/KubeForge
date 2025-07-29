FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN NEXT_IGNORE_TYPE_ERRORS=true npm run build

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app ./
ENV NODE_ENV=production

EXPOSE 3000

# Start the Next.js app
CMD ["npm", "start"]
