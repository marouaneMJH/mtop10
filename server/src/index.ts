import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cron from "node-cron";
import { Server } from "http";
import routes from "./routes";
import { forceRefreshCache, getCachedTracks } from "./cache";

const app = express();
const PORT = Number.parseInt(process.env.PORT || "5000", 10) || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongo:27017/music";

// Middleware
app.use(
    cors({
        origin: ["http://localhost:5173", "http://localhost:3000"], // Allow frontend dev servers
        credentials: true,
    }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// API routes
app.use("/api", routes);

// Root health check
app.get("/", (req, res) => {
    res.json({
        service: "Music Top 10 API",
        version: "1.0.0",
        status: "running",
        timestamp: new Date().toISOString(),
    });
});

// Container health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "Music Top 10 API",
        timestamp: new Date().toISOString(),
    });
});

// 404 handler
app.use("*", (req, res) => {
    res.status(404).json({
        error: "Not Found",
        message: `Route ${req.method} ${req.originalUrl} not found`,
        availableRoutes: [
            "GET /",
            "GET /health",
            "GET /api/tracks",
            "GET /api/tracks/:id",
            "POST /api/refresh",
            "GET /api/health",
        ],
    });
});

// Global error handler
app.use(
    (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) => {
        console.error("Global error handler:", err);

        res.status(500).json({
            error: "Internal Server Error",
            message: err.message || "Unknown error occurred",
            timestamp: new Date().toISOString(),
        });
    },
);

/**
 * Connect to MongoDB with exponential backoff retry
 */
async function connectToMongoDB(maxRetries: number = 10): Promise<void> {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            console.log(
                `Attempting MongoDB connection (attempt ${retries + 1}/${maxRetries})...`,
            );

            await mongoose.connect(MONGO_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                family: 4, // Use IPv4, skip IPv6
            });

            console.log(" Connected to MongoDB successfully");

            // Set up connection event listeners
            mongoose.connection.on("error", (err) => {
                console.error("MongoDB connection error:", err);
            });

            mongoose.connection.on("disconnected", () => {
                console.warn("⚠️ MongoDB disconnected");
            });

            mongoose.connection.on("reconnected", () => {
                console.log(" MongoDB reconnected");
            });

            return;
        } catch (error) {
            retries++;
            const delay = Math.min(1000 * Math.pow(2, retries), 30000); // Exponential backoff, max 30s

            console.error(
                `MongoDB connection failed (attempt ${retries}/${maxRetries}):`,
                error instanceof Error ? error.message : error,
            );

            if (retries >= maxRetries) {
                console.error(
                    "🚨 Max MongoDB connection retries reached. Exiting...",
                );
                process.exit(1);
            }

            console.log(` Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

/**
 * Initialize the cache with data if MongoDB is empty
 */
async function initializeCache(): Promise<void> {
    try {
        console.log("Checking if cache initialization is needed...");

        const cachedData = await getCachedTracks();

        if (!cachedData || cachedData.tracks.length === 0) {
            console.log(
                "📥 No cached data found. Initializing cache with fresh data...",
            );
            await forceRefreshCache();
            console.log(" Cache initialized successfully");
        } else {
            console.log(` Found ${cachedData.tracks.length} tracks in cache`);
        }
    } catch (error) {
        console.error("Failed to initialize cache:", error);
        // Don't exit here - the API can still work, just without initial data
    }
}

/**
 * Set up cron job for automatic cache refresh
 * Schedule: '0 * * * *' (every hour on the hour)
 */
function setupCronJob(): void {
    console.log("⏰ Setting up hourly cache refresh cron job...");

    // Schedule: every hour on the hour
    cron.schedule(
        "0 * * * *",
        async () => {
            try {
                console.log("[CRON] Starting hourly cache refresh...");
                const result = await forceRefreshCache();
                console.log(
                    ` [CRON] Cache refresh completed - ${result.tracks.length} tracks updated`,
                );
            } catch (error) {
                console.error("[CRON] Cache refresh failed:", error);
            }
        },
        {
            scheduled: true,
            timezone: "America/New_York", // Apple Music charts are US-based
        },
    );

    console.log(" Cron job scheduled successfully");
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
        console.log(`\n Received ${signal}. Starting graceful shutdown...`);

        if (!server) {
            console.warn("⚠️ HTTP server was not initialized. Exiting...");
            process.exit(0);
        }

        // Stop accepting new connections
        server.close(async (err: Error | undefined) => {
            if (err) {
                console.error("Error during server shutdown:", err);
                process.exit(1);
            }

            console.log(" Server closed");

            // Close MongoDB connection
            try {
                await mongoose.connection.close();
                console.log(" MongoDB connection closed");
            } catch (error) {
                console.error("Error closing MongoDB connection:", error);
            }

            console.log(" Graceful shutdown completed");
            process.exit(0);
        });

        // Force exit if graceful shutdown takes too long
        setTimeout(() => {
            console.error("🚨 Forced shutdown after 30 seconds");
            process.exit(1);
        }, 30000);
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
    try {
        console.log("Starting Music Top 10 API Server...");
        console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(` MongoDB URI: ${MONGO_URI}`);
        console.log(` Port: ${PORT}`);

        // Connect to MongoDB
        await connectToMongoDB();

        // Initialize cache if needed
        await initializeCache();

        // Set up automatic refresh cron job
        setupCronJob();

        // Set up graceful shutdown
        setupGracefulShutdown();

        // Start Express server
        server = app.listen(PORT, "0.0.0.0", () => {
            console.log(` Server is running on http://0.0.0.0:${PORT}`);
            console.log(`API endpoints available at:`);
            console.log(`   - GET  http://localhost:${PORT}/api/tracks`);
            console.log(`   - GET  http://localhost:${PORT}/api/tracks/:id`);
            console.log(`   - POST http://localhost:${PORT}/api/refresh`);
            console.log(`   - GET  http://localhost:${PORT}/api/health`);
            console.log(` Ready to serve Top 10 Electronic tracks!`);
        });
    } catch (error) {
        console.error("🚨 Failed to start server:", error);
        process.exit(1);
    }
}

let server: Server | null = null;

// Start the application
if (require.main === module) {
    startServer().catch((error) => {
        console.error("🚨 Unhandled startup error:", error);
        process.exit(1);
    });
}
