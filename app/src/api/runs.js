const BASE = "/console/ph-pse/mqc/api";

export async function createSingle(payload) {
    const res = await fetch(`${BASE}/runs/single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    return res.json();
}

export async function createBulk({ runName, checkConfig, file }) {
  const formData = new FormData();

  if (runName) formData.append("runName", runName);
  if (checkConfig) {
    formData.append("checkConfig", JSON.stringify(checkConfig));
  }

  // ⬇️ THIS is the important change
  formData.append("file", file); // was "csv"

  const res = await fetch(`${BASE}/runs/bulk`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bulk run failed: ${res.status} ${res.statusText} – ${text}`);
  }

  return res.json(); // { runId, totalRows, validScans, skipped }
}

export async function createFetch(payload) {
    const body = {
        ...payload,
        checkConfig: payload.checkConfig
            ? JSON.stringify(payload.checkConfig)
            : undefined
    };

    const res = await fetch(`${BASE}/runs/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    return res.json();
}

export async function listRuns() {
    const res = await fetch(`${BASE}/runs`);
    return res.json();
}

export async function getRun(runId) {
    const res = await fetch(`${BASE}/runs/${runId}`);
    return res.json();
}

export function streamRun(runId, onMessage) {
    const ev = new EventSource(`${BASE}/runs/${runId}/stream`);
    ev.onmessage = onMessage;
    return ev;
}

export async function rerun(runId) {
    const res = await fetch(`${BASE}/runs/${runId}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    return res.json();
}

export async function rescan(runId, scanIds) {
    const res = await fetch(`${BASE}/runs/${runId}/rescan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanIds })
    });
    return res.json();
}

export async function addScans(runId, scans) {
    const res = await fetch(`${BASE}/runs/${runId}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scans })
    });
    return res.json();
}

export async function updateScan(runId, scanId, payload) {
    const res = await fetch(`${BASE}/runs/${runId}/scans/${scanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    return res.json();
}

export async function deleteScans(runId, scanIds) {
    const res = await fetch(`${BASE}/runs/${runId}/scans`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanIds })
    });
    return res.json();
}

export async function updateDsStatus(runId, scanId, dsStatus) {
    console.log(
        "[API:updateDsStatus] sending",
        { runId, scanId, dsStatus }
    );

    const res = await fetch(
        `${BASE}/runs/${runId}/scans/${scanId}/ds-status`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dsStatus })
        }
    );

    const text = await res.text();

    console.log(
        "[API:updateDsStatus] response",
        res.status,
        text
    );

    if (!res.ok) {
        throw new Error(text || `Failed to update dsStatus (${res.status})`);
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

