// src/services/sse.service.js

class SSEManager {
    constructor() {
        // Map<runId, Set<response>>
        this.clients = new Map();
    }

    /**
     * Register a new SSE client under a runId
     */
    addClient(runId, res) {
        const key = String(runId);

        if (!this.clients.has(key)) {
            this.clients.set(key, new Set());
        }

        this.clients.get(key).add(res);

        // Clean client on disconnect
        reqCleanup(res, () => {
            this.removeClient(key, res);
        });

        // Send initial connection notice
        res.write(`event: hello\n`);
        res.write(`data: {"connected": true}\n\n`);
    }

    /**
     * Remove client from runId group
     */
    removeClient(runId, res) {
        const key = String(runId);
        if (!this.clients.has(key)) return;

        const set = this.clients.get(key);
        set.delete(res);

        if (set.size === 0) {
            this.clients.delete(key);
        }
    }

    /**
     * Broadcast an event to all clients listening on this runId
     */
    broadcast(runId, payload) {
        const key = String(runId);
        const clients = this.clients.get(key);
        if (!clients || clients.size === 0) return;

        const evt = payload.event || "message";
        const json = JSON.stringify(payload);

        for (const res of clients) {
            try {
                res.write(`event: ${evt}\n`);
                res.write(`data: ${json}\n\n`);
            } catch (err) {
                // client is dead → remove it
                this.removeClient(key, res);
            }
        }
    }

    /**
     * Optional heartbeat to prevent proxies from killing SSE
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

/**
 * Ensures we unregister SSE clients when their connection closes.
 */
function reqCleanup(res, onClose) {
    // Express `res` inherits from the underlying socket.
    res.on("close", onClose);
    res.on("finish", onClose);
    res.on("end", onClose);
}

export const sseManager = new SSEManager();
