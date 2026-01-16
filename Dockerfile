# Custom Dockerfile for Railway deployment of WebSocket proxy
# Bypasses Nixpacks to avoid Next.js cache mount conflicts

FROM node:20-slim

WORKDIR /app

# Copy only the files needed for the WebSocket proxy
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (tsx is in devDependencies but needed for runtime)
RUN npm ci

# Copy WebSocket proxy server
COPY src/server ./src/server

# Expose the proxy port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8081/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the WebSocket proxy with tsx
CMD ["node", "--require", "tsx/cjs", "--import", "tsx/esm", "src/server/birdeye-proxy.ts"]
