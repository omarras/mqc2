// src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { connectMongo } from "./config/mongo.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { TMP_DIR } from "./shared/constants.js";
import { recoverRunningRuns } from "./services/run.service.js";
import { recoverDanglingScans } from "./services/scan.service.js";

const app = express();

const API_BASE_PATH = process.env.API_BASE_PATH || "/api";

// --- middlewares ---
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "5mb" }));

// --- request logging ---
app.use((req, res, next) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6; // ns → ms
        const ts = new Date().toISOString();

        console.log(
            `[${ts}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs.toFixed(
                1
            )} ms)`
        );
    });

    next();
});

// --- static serving of screenshots under API base path ---
app.use(
    `${API_BASE_PATH}/tmp`,
    express.static(TMP_DIR, {
        // Defaults we care about
        etag: true,
        lastModified: true,
        cacheControl: true,
        maxAge: 0,
        setHeaders: (res, filePath) => {
            // Option 1: absolutely no caching anywhere
            res.setHeader("Cache-Control", "no-store");

            // If you prefer revalidation instead of zero cache, you could do:
            // res.setHeader("Cache-Control", "no-cache");
        }
    })
);

// --- API routes mounted under configurable base path ---
app.use(API_BASE_PATH, routes);

// error handler must come last
app.use(errorHandler);

// connect to database only when NOT running tests
if (process.env.NODE_ENV !== "test") {
    await connectMongo();
}

await recoverDanglingScans();
await recoverRunningRuns();
console.log("[R1] Recovery complete → background engine active.");

// start server
if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 5177;
    app.listen(PORT, () => {
        console.log(`MQC2 backend running on port ${PORT}`);
        console.log(`API base path: ${API_BASE_PATH}`);
        console.log(`Screenshots served from: ${API_BASE_PATH}/tmp`);
    });
}

export default app;