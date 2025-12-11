// src/services/scanQueue.service.js

import PQueue from "p-queue";
import { FAST_CONCURRENCY, SLOW_CONCURRENCY } from "../config/env.js";

export const fastQueue = new PQueue({
    concurrency: FAST_CONCURRENCY,
});

export const slowQueue = new PQueue({
    concurrency: SLOW_CONCURRENCY,
});
