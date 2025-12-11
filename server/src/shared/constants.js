// server/src/shared/constants.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All screenshots go here (relative to server/src)
export const TMP_DIR =
    process.env.TMP_DIR || path.join(process.cwd(), "tmp");

// Simple desktop UA – can be tuned later if needed
export const UA_DESKTOP =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

export const UA_MOBILE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) " +
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 " +
    "Mobile/15E148 Safari/604.1";

export const MOBILE_VIEWPORT = {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
};

// URLs containing any of these snippets will be blocked as trackers
export const TRACKER_PATTERNS = [
    'googletagmanager.com',
    'google-analytics.com',
    'doubleclick.net',
    'analytics.google.com',
    'gtm.js',
    'facebook.net',
    'snap.licdn.com',
    'bat.bing.com',
    'static.ads-twitter.com',
    'adobedtm.com',
    'omtrdc.net',
    'demdex.net',
    'everesttech.net',
    'scorecardresearch.com',
    'hotjar.com',
    'segment.com',
    'mixpanel.com',
    'newrelic.com',
    'nr-data.net',
    'akamaihd.net/boomerang',
    'perimeterx.net',
    'cloudflareinsights.com'
];
