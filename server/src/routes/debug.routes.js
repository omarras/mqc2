// src/routes/debug.routes.js
//
// Debug-only routes (disabled in production).
// Exposes a single endpoint that runs:
//   - Step 1: platform excludes
//   - Step 2: visibility filtering
//   - Word counts per stage
//
// Controller: debugExcludes (full Step-1 + Step-2 debug)
//

import { Router } from "express";
import { debugExcludes } from "../controllers/debug.controller.js";

const router = Router();

// Unified text-clean debugging endpoint:
router.post("/text-clean", debugExcludes);

export default router;
