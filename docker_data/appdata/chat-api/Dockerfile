# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN apk add --no-cache openssl libc6-compat
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built application
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy public files
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

# Start application
CMD ["node", ".output/server/index.mjs"] 