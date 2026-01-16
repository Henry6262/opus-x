#!/usr/bin/env node
/**
 * Birdeye WebSocket Proxy Server
 *
 * Secure proxy that hides Birdeye API key from clients
 * Uses Redis pub/sub to share data across multiple clients
 *
 * Run: node src/server/birdeye-proxy.ts
 * Or: npm run ws:proxy
 */

import { config } from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { parse } from "url";
import { createClient, RedisClientType } from "redis";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Configuration
const PORT = parseInt(process.env.BIRDEYE_PROXY_PORT || "8081");
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const USE_REDIS = process.env.USE_REDIS === "true";

if (!BIRDEYE_API_KEY) {
    console.error("❌ BIRDEYE_API_KEY environment variable is required");
    process.exit(1);
}

// Types
interface ClientConnection {
    id: string;
    ws: WebSocket;
    birdeyeWs: WebSocket | null;
    subscribedTokens: Set<string>;
    lastActivity: number;
}

interface BirdeyeMessage {
    type: string;
    data: {
        address?: string;
        price?: number;
        priceChange24h?: number;
        volume24h?: number;
        liquidity?: number;
        mc?: number;
    };
}

// State
const connections = new Map<string, ClientConnection>();
let redisPublisher: RedisClientType | null = null;
let redisSubscriber: RedisClientType | null = null;

// Initialize Redis (optional)
async function initRedis() {
    if (!USE_REDIS) {
        console.log("ℹ️  Redis disabled - running without caching");
        return;
    }

    try {
        console.log("🔄 Connecting to Redis...");

        const redisOptions = {
            url: REDIS_URL,
            ...(REDIS_PASSWORD && { password: REDIS_PASSWORD }),
        };

        redisPublisher = createClient(redisOptions);
        redisSubscriber = createClient(redisOptions);

        await redisPublisher.connect();
        await redisSubscriber.connect();

        console.log("✅ Redis connected successfully");

        // Subscribe to token update channels
        redisSubscriber.pSubscribe("birdeye:token:*", (message, channel) => {
            // Forward Redis messages to subscribed clients
            const tokenAddress = channel.replace("birdeye:token:", "");

            connections.forEach((conn) => {
                if (conn.subscribedTokens.has(tokenAddress) && conn.ws.readyState === WebSocket.OPEN) {
                    conn.ws.send(message);
                }
            });
        });

        console.log("✅ Redis pub/sub ready for token updates");
    } catch (error) {
        console.error("❌ Redis connection failed:", error);
        console.log("ℹ️  Continuing without Redis...");
        redisPublisher = null;
        redisSubscriber = null;
    }
}

// Create HTTP server for WebSocket
const server = createServer((req, res) => {
    const { pathname } = parse(req.url || "");

    if (pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            connections: connections.size,
            redis: USE_REDIS ? (redisPublisher?.isReady ? "connected" : "disconnected") : "disabled",
            uptime: process.uptime(),
        }));
    } else {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Birdeye WebSocket Proxy Server\nConnect via ws://localhost:" + PORT);
    }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (clientWs: WebSocket, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    console.log(`✅ Client connected: ${clientId}`);

    // Create connection object
    const connection: ClientConnection = {
        id: clientId,
        ws: clientWs,
        birdeyeWs: null,
        subscribedTokens: new Set(),
        lastActivity: Date.now(),
    };

    connections.set(clientId, connection);

    // Connect to Birdeye WebSocket (with API key hidden from client)
    const chain = new URL(req.url || "", "http://localhost").searchParams.get("chain") || "solana";
    const birdeyeWsUrl = `wss://public-api.birdeye.so/socket/${chain}?x-api-key=${BIRDEYE_API_KEY}`;

    const birdeyeWs = new WebSocket(birdeyeWsUrl);
    connection.birdeyeWs = birdeyeWs;

    // Handle Birdeye WebSocket open
    birdeyeWs.on("open", () => {
        console.log(`🔗 Birdeye connected for ${clientId}`);
        clientWs.send(JSON.stringify({
            type: "PROXY_CONNECTED",
            message: "Connected to Birdeye (API key secured)",
        }));
    });

    // Forward messages from Birdeye to client
    birdeyeWs.on("message", async (data: Buffer) => {
        const message = data.toString();

        // Send to client
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(message);
        }

        // Publish to Redis for other clients (if enabled)
        if (redisPublisher?.isReady) {
            try {
                const parsed: BirdeyeMessage = JSON.parse(message);

                if (parsed.type === "TOKEN_STATS_DATA" && parsed.data?.address) {
                    const channel = `birdeye:token:${parsed.data.address}`;
                    await redisPublisher.publish(channel, message);

                    // Also cache the latest data
                    await redisPublisher.setEx(
                        `birdeye:cache:${parsed.data.address}`,
                        300, // 5 minutes TTL
                        message
                    );
                }
            } catch (err) {
                // Ignore parse errors
            }
        }
    });

    // Handle messages from client to Birdeye
    clientWs.on("message", async (data: Buffer) => {
        connection.lastActivity = Date.now();

        try {
            const message = JSON.parse(data.toString());

            // Track token subscriptions
            if (message.type === "SUBSCRIBE_TOKEN_STATS" && message.data?.address) {
                const addresses = Array.isArray(message.data.address)
                    ? message.data.address
                    : [message.data.address];

                addresses.forEach(addr => connection.subscribedTokens.add(addr));
                console.log(`📊 ${clientId} subscribed to ${addresses.length} tokens`);

                // Check Redis cache for instant data
                if (redisPublisher?.isReady) {
                    for (const addr of addresses) {
                        const cached = await redisPublisher.get(`birdeye:cache:${addr}`);
                        if (cached && clientWs.readyState === WebSocket.OPEN) {
                            clientWs.send(cached);
                        }
                    }
                }
            }

            // Unsubscribe tracking
            if (message.type === "UNSUBSCRIBE_TOKEN_STATS" && message.data?.address) {
                const addresses = Array.isArray(message.data.address)
                    ? message.data.address
                    : [message.data.address];

                addresses.forEach(addr => connection.subscribedTokens.delete(addr));
                console.log(`📊 ${clientId} unsubscribed from ${addresses.length} tokens`);
            }

            // Forward to Birdeye
            if (birdeyeWs.readyState === WebSocket.OPEN) {
                birdeyeWs.send(JSON.stringify(message));
            }
        } catch (err) {
            console.error(`❌ Error processing client message:`, err);
        }
    });

    // Cleanup on disconnect
    const cleanup = () => {
        console.log(`❌ Client disconnected: ${clientId}`);
        connections.delete(clientId);

        if (birdeyeWs.readyState === WebSocket.OPEN) {
            birdeyeWs.close();
        }
    };

    clientWs.on("close", cleanup);
    birdeyeWs.on("close", cleanup);

    birdeyeWs.on("error", (error) => {
        console.error(`❌ Birdeye error for ${clientId}:`, error);
        clientWs.send(JSON.stringify({
            type: "PROXY_ERROR",
            message: "Birdeye connection error",
        }));
    });

    clientWs.on("error", (error) => {
        console.error(`❌ Client error ${clientId}:`, error);
    });
});

// Cleanup inactive connections every 5 minutes
setInterval(() => {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutes

    connections.forEach((conn, id) => {
        if (now - conn.lastActivity > timeout) {
            console.log(`⏰ Closing inactive connection: ${id}`);
            conn.ws.close();
            if (conn.birdeyeWs) {
                conn.birdeyeWs.close();
            }
            connections.delete(id);
        }
    });
}, 5 * 60 * 1000);

// Start server
async function start() {
    await initRedis();

    server.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Birdeye WebSocket Proxy Server                       ║
║                                                            ║
║   Port:        ${PORT}                                        ║
║   Redis:       ${USE_REDIS ? "Enabled" : "Disabled"}                                     ║
║   WebSocket:   ws://localhost:${PORT}                         ║
║   Health:      http://localhost:${PORT}/health                ║
║                                                            ║
║   🔒 API Key:   Secured (not exposed to clients)          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
        `);
    });
}

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down...");

    // Close all client connections
    connections.forEach((conn) => {
        conn.ws.close();
        if (conn.birdeyeWs) {
            conn.birdeyeWs.close();
        }
    });

    // Close Redis
    if (redisPublisher) await redisPublisher.quit();
    if (redisSubscriber) await redisSubscriber.quit();

    server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
    });
});

start().catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
});
