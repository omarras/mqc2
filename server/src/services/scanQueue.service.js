// src/services/scanQueue.service.js

import PQueue from "p-queue";
import { FAST_CONCURRENCY, SLOW_CONCURRENCY } from "../config/env.js";

export const fastQueue = new PQueue({
    concurrency: FAST_CONCURRENCY,
    autoStart: true
});

fastQueue.on("error", err => {
    console.error("[fastQueue] Error:", err);
});

export const slowQueue = new PQueue({
    concurrency: SLOW_CONCURRENCY,
    autoStart: true
});

slowQueue.on("error", err => {
    console.error("[slowQueue] Error:", err);
});
