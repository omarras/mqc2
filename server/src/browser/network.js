import fs from 'node:fs';
import path from 'node:path';
import { TRACKER_PATTERNS, TMP_DIR } from '../shared/constants.js';
import { urlToPath } from '../shared/url-utils.js';
import { autoAcceptCookies } from './cmp.js';

export async function setupRouting(page, { blockTrackers, blockImagesForHtml }) {
    await page.route('**/*', (route) => {
        const req = route.request();
        const url = req.url();
        const type = req.resourceType();

        if (blockTrackers && TRACKER_PATTERNS.some(p => url.includes(p))) {
            return route.abort();
        }
        if (blockImagesForHtml && (type === 'image' || type === 'media' || type === 'font')) {
            return route.abort();
        }
        route.continue();
    });
}

export async function gotoFast(page, url, { timeout = 15000 } = {}) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    // help trigger consent banners quickly
    await autoAcceptCookies(page, { aggressive: true }).catch(() => {});
    await page.waitForTimeout(800);
}

export async function takeShot(page, urlOrKey) {
    fs.mkdirSync(TMP_DIR, { recursive: true });

    const base = urlToPath(urlOrKey);      // e.g. 7c528e54e...-aem-desktop
    const filename = `${base}.png`;       // ⬅ no timestamp anymore
    const shotPath = path.join(TMP_DIR, filename);

    console.log("[takeShot] saving screenshot to:", shotPath);

    await page.screenshot({
        path: shotPath,
        type: "png",
        fullPage: true
    });

    return shotPath;
}

export async function waitForNetworkIdle(page, ms = 2000) {
    await page.waitForLoadState('networkidle', { timeout: ms }).catch(() => {});
}
