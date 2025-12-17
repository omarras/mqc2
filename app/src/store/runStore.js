import { defineStore } from "pinia";
import * as api from "../api/runs.js";
import { deepSet } from "../utils/deepSet.js";

export const useRunStore = defineStore("runStore", {
    state: () => ({
        runs: [],               // list of historical runs
        currentRun: null,       // full run object from backend
        scans: {},              // rowIndex / scanId → result object (live updates)
        sse: null               // EventSource instance
    }),

    actions: {
        async loadRuns() {
            this.runs = await api.listRuns();
        },

        async openRun(runId, live = false) {
            // Load run metadata + latest scans from DB
            this.currentRun = await api.getRun(runId);

            // Populate initial scans from database
            this.scans = {};
            for (const scan of this.currentRun.scans || []) {
                if (!scan) continue;

                // 👇 use normalized scanId (fallback to _id for safety)
                const id = scan.scanId || scan._id;
                if (!id) continue;

                this.scans[id] = {
                    ...(this.scans[id] || {}),
                    ...scan
                };
            }

            if (!live) return;

            // Close previous SSE connection
            if (this.sse) this.sse.close();

            const ev = new EventSource(`/console/ph-pse/mqc/api/runs/${runId}/stream`);
            this.sse = ev;

            //
            // ROW START
            //
            ev.addEventListener("row-start", (raw) => {
                const msg = JSON.parse(raw.data);
                const id = msg.rowIndex;
                if (!id) return;

                this.scans[id] = {
                    ...(this.scans[id] || {}),
                    status: "pending"
                };
            });

            //
            // ROW UPDATE (pageDataCheck – lightweight phase)
            //
            ev.addEventListener("row-update", (e) => {
                const msg = JSON.parse(e.data);

                console.log("[SSE row-update]", msg);

                const { rowIndex, key, data } = msg;

                const prev = this.scans[rowIndex] || { _id: rowIndex };
                const next = { ...prev };

                deepSet(next, key, data);

                console.log(
                    "[STORE] after row-update",
                    rowIndex,
                    key,
                    next.metadata?.dsStatus,
                    next.dsStatusRaw
                );

                this.scans[rowIndex] = next;
            });

            //
            // ROW RESULT (heavy pipeline step – text, links, seo, screenshots, etc.)
            //
            ev.addEventListener("row-result", (raw) => {
                const msg = JSON.parse(raw.data);
                const id = msg.rowIndex;
                const stepKey = msg.key;
                if (!id || !stepKey) return;

                // Map raw SSE keys to normalized properties used by the UI & row-final
                const keyMap = {
                    "text-comparison": "text",
                    "link-checker": "links",
                    "seo": "seo",
                    "screenshot": "screenshotDesktop",
                    "screenshot-mobile": "screenshotMobile"
                };

                const mappedKey = keyMap[stepKey] || stepKey;

                this.scans[id] = {
                    ...(this.scans[id] || {}),
                    [mappedKey]: msg.data,
                    status: "running"
                };
            });

            //
            // ROW FINAL (full normalized scan result)
            //
            ev.addEventListener("row-final", (raw) => {
                const msg = JSON.parse(raw.data);
                const id = msg.rowIndex;
                if (!id) return;

                // msg.data already has: urls, pageDataCheck, text, links, seo,
                // screenshotDesktop, screenshotMobile
                this.scans[id] = {
                    ...(this.scans[id] || {}),
                    ...msg.data,
                    metadata: {
                        ...msg.data.metadata,
                        dsStatus: this.scans[id]?.metadata?.dsStatus ?? msg.data.metadata?.dsStatus
                    },
                    status: "completed"
                };
            });

            //
            // ROW ERROR
            //
            ev.addEventListener("row-error", (raw) => {
                const msg = JSON.parse(raw.data);
                const id = msg.rowIndex;
                if (!id) return;

                this.scans[id] = {
                    ...(this.scans[id] || {}),
                    status: "failed",
                    error: msg.message ?? msg.data ?? "Unknown error"
                };
            });
        }
    }
});
