import { waitForNetworkIdle } from './network.js';

export async function prepareForScreenshot(page, {
    imagesWaitMs = 6000,
    lazyScroll = true,
    waitNetworkIdle = true,
    networkIdleMs = 2000
} = {}) {
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await page.waitForLoadState('load', { timeout: 4000 }).catch(() => {});

    await reTriggerImageLoads(page).catch(() => {});
    await forceEagerImages(page).catch(() => {});
    await preloadBackgroundImages(page).catch(() => {});
    await fireScrollResize(page).catch(() => {});

    if (lazyScroll) {
        await page.evaluate(async () => {
            const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
            const step = Math.ceil(window.innerHeight * 0.8);
            for (let y = 0; y < h; y += step) {
                window.scrollTo(0, y);
                await new Promise(r => setTimeout(r, 120));
            }
            window.scrollTo(0, 0);
        }).catch(() => {});
    }

    if (waitNetworkIdle) {
        await waitForNetworkIdle(page, networkIdleMs).catch(() => {});
    }

    if (imagesWaitMs > 0) {
        await page.waitForTimeout(imagesWaitMs).catch(() => {});
    }

    await ensureImagesDecoded(page, imagesWaitMs).catch(() => {});
}

// --- helpers copied from your previous file (trimmed to essentials) ---

async function reTriggerImageLoads(page) {
    await page.evaluate(() => {
        const imgs = Array.from(document.images || []);
        for (const img of imgs) {
            try {
                if (img.currentSrc || img.src || img.srcset) {
                    const src = img.currentSrc || img.src || '';
                    const set = img.srcset || '';
                    if (set) { img.srcset = ''; img.srcset = set; }
                    if (src) { const tmp = img.src; img.src = ''; img.src = src || tmp; }
                    if (img.loading === 'lazy') img.loading = 'eager';
                }
            } catch {}
        }
        const sources = Array.from(document.querySelectorAll('picture source'));
        for (const s of sources) {
            try {
                const ds = s.getAttribute('data-srcset') || s.getAttribute('data-src') || '';
                if (ds && !s.srcset) s.srcset = ds;
            } catch {}
        }
    });
}

async function forceEagerImages(page) {
    await page.evaluate(() => {
        const imgs = Array.from(document.images || []);
        for (const img of imgs) {
            try {
                if (img.loading === 'lazy') img.loading = 'eager';
                if (!img.src && img.dataset?.src) img.src = img.dataset.src;
                if (!img.srcset && img.dataset?.srcset) img.srcset = img.dataset.srcset;
                if (!img.src && img.dataset?.original) img.src = img.dataset.original;
            } catch {}
        }
    });
}

async function preloadBackgroundImages(page) {
    await page.evaluate(async () => {
        const urls = new Set();
        const all = Array.from(document.querySelectorAll('*'));
        for (const el of all) {
            try {
                const cs = getComputedStyle(el);
                const bg = cs.backgroundImage || '';
                const matches = Array.from(bg.matchAll(/url\((?:'|")?([^'")]+)(?:'|")?\)/g));
                for (const m of matches) {
                    const u = m[1];
                    if (u && !u.startsWith('data:')) {
                        try { urls.add(new URL(u, location.href).href); } catch {}
                    }
                }
            } catch {}
        }
        await Promise.allSettled(Array.from(urls).map(u => new Promise(res => {
            const im = new Image();
            im.onload = im.onerror = () => res();
            im.crossOrigin = 'anonymous';
            im.src = u;
        })));
    });
}

async function fireScrollResize(page) {
    await page.evaluate(() => {
        window.dispatchEvent(new Event('scroll', { bubbles: true }));
        window.dispatchEvent(new Event('resize', { bubbles: true }));
        document.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
}

async function ensureImagesDecoded(page, timeout = 4000) {
    await page.waitForFunction(() => {
        const imgs = Array.from(document.images || []);
        if (imgs.length === 0) return true;
        return imgs.every(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    }, null, { timeout }).catch(() => {});

    await page.evaluate(async () => {
        const imgs = Array.from(document.images || []);
        const decoders = imgs
            .filter(img => img.decode && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0)
            .map(img => img.decode().catch(() => {}));
        if (decoders.length) await Promise.allSettled(decoders);
    }).catch(() => {});
}
