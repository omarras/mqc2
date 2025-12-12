// src/services/runQueue.service.js

import PQueue from "p-queue";

export const runQueue = new PQueue({
    concurrency: 1,
    autoStart: true
});

runQueue.on("error", (err) => {
    console.error("[runQueue] Error:", err);
});
