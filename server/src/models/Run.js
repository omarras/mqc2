// src/models/Run.js
import mongoose from "mongoose";

const RunSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["single", "bulk", "fetch"],
            required: true
        },

        runName: { type: String, default: null },
        runNameAuto: { type: String, default: () => `run-${Date.now()}` },

        status: {
            type: String,
            enum: ["pending", "running", "completed"],
            default: "pending"
        },

        scans: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Scan"
            }
        ],

        totalScans: { type: Number, default: 0 },

        // These counters represent ONLY latest-generation scans
        completedScans: { type: Number, default: 0 },
        failedScans: { type: Number, default: 0 },

        // Used only for runs of type "fetch"
        fetchRequest: {
            type: Object,
            default: null
        },

        createdAt: { type: Date, default: Date.now },
        completedAt: { type: Date, default: null }
    },
    { minimize: false }
);

export const Run = mongoose.model("Run", RunSchema);
