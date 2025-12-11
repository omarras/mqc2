// src/models/Scan.js
import mongoose from "mongoose";

const ScanSchema = new mongoose.Schema(
    {
        runId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Run",
            required: true
        },

        urlOld: { type: String, required: true },
        urlNew: { type: String, required: true },

        // IMPORTANT: new field for rescan lineage
        parentScanId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Scan",
            default: null
        },

        deleted: { type: Boolean, default: false },

        status: {
            type: String,
            enum: ["pending", "running", "completed", "failed"],
            default: "pending"
        },

        metadata: {
            type: Object,
            default: {
                lastReplicationDate: null,
                lastScreenshotReplicationDate: null
            }
        },

        checkConfig: {
            type: Object,
            default: {}
        },

        results: {
            type: Object,
            default: {}
        },

        error: { type: String, default: null },

        createdAt: { type: Date, default: Date.now },
        completedAt: { type: Date, default: null }
    },
    { minimize: false }
);

export const Scan = mongoose.model("Scan", ScanSchema);
