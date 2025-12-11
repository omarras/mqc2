// src/routes/run.routes.js
import { Router } from "express";
import * as controller from "../controllers/run.controller.js";
import * as localesController from "../controllers/locales.controller.js";
import multer from "multer";

const upload = multer();
const router = Router();

// -------------------------------------------------------------
// LOCALES ENDPOINT
// -------------------------------------------------------------
router.get("/locales/countries", localesController.listCountries);

// -------------------------------------------------------------
// CREATE RUNS
// -------------------------------------------------------------
router.post("/single", controller.single);
router.post("/bulk", upload.single("file"), controller.bulk);
router.post("/fetch", controller.fetchCSV);

// -------------------------------------------------------------
// RUN-LEVEL STREAM (must come BEFORE '/:id')
// -------------------------------------------------------------
router.get("/:id/stream", controller.streamRun);

// -------------------------------------------------------------
// RUN-LEVEL OPERATIONS
// -------------------------------------------------------------
router.get("/", controller.list);
router.get("/:id", controller.get);

router.post("/:id/rescan", controller.rescan);
router.post("/:id/rerun", controller.rerun);

// -------------------------------------------------------------
// SCAN-LEVEL CRUD
// -------------------------------------------------------------
router.post("/:id/scans", controller.addScans);
router.patch("/:runId/scans/:scanId", controller.updateScan);
router.delete("/:runId/scans", controller.deleteScans);

export default router;
