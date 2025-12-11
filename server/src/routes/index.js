// src/routes/index.js
import { Router } from "express";
import runRoutes from "./run.routes.js";
import { healthCheck } from "../controllers/health.controller.js";
import debugRoutes from "./debug.routes.js";
import localesRoutes from "../routes/locales.routes.js";


const router = Router();

router.get("/health", healthCheck);
router.use("/runs", runRoutes);
if (process.env.NODE_ENV !== "production") {
    router.use("/debug", debugRoutes);
}
router.use("/locales", localesRoutes);

export default router;

