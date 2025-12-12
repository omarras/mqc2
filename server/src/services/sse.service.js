// src/services/sse.service.js

class SSEManager {
    constructor() {
        // Map<runId, Set<response>>
        this.clients = new Map();
    }

    /**
     * Register SSE response for a given runId.
     */
    addClient(runId, res) {
        const key = String(runId);

        if (!this.clients.has(key)) {
            this.clients.set(key, new Set());
        }

        this.clients.get(key).add(res);

        // Cleanup on disconnect
        const cleanup = () => {
            this.removeClient(key, res);
        };

        res.on("close", cleanup);
        res.on("finish", cleanup);

        // Do NOT send hello here.
        // Controller already sends hello on connect.
    }

    /**
     * Remove a response client from registry.
     */
    removeClient(runId, res) {
        const key = String(runId);

        if (!this.clients.has(key)) return;

        const group = this.clients.get(key);
        group.delete(res);

        if (group.size === 0) {
            this.clients.delete(key);
        }
    }

    /**
     * Send event to all connected SSE clients under a runId.
     */
    broadcast(runId, payload) {
        const key = String(runId);
        const clients = this.clients.get(key);

        if (!clients || clients.size === 0) return;

        const evt = payload.event || "message";
        const data = JSON.stringify(payload);

        for (const res of clients) {
            try {
                res.write(`event: ${evt}\n`);
                res.write(`data: ${data}\n\n`);
            } catch (err) {
                // connection is dead
                this.removeClient(key, res);
            }
        }
    }

    /**
     * Keep-alive heartbeats so proxies don't kill SSE.
     */
    startHeartbeats(intervalMs = 25000) {
        setInterval(() => {
            for (const [runId, clients] of this.clients.entries()) {
                for (const res of clients) {
                    try {
                        res.write(`event: heartbeat\n`);
                        res.write(`data: {}\n\n`);
                    } catch {
                        this.removeClient(runId, res);
                    }
                }
            }
        }, intervalMs);
    }
}

export const sseManager = new SSEManager();
