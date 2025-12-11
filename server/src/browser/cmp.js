// Cookie consent helpers: auto-accept, hide overlays, detect vendor, wait for TrustArc iframe

export async function autoAcceptCookies(page, { aggressive = false } = {}) {
    const quick = [
        '#onetrust-accept-btn-handler',
        'button#onetrust-accept-btn-handler',
        '#CybotCookiebotDialogBodyButtonAccept',
        '[data-didomi-action="agree"]',
        'button:has-text("Accept all")',
        'button:has-text("Accept All")',
        'button:has-text("Accept & continue")',
        'button:has-text("I agree")',
        'button:has-text("Agree")',
        'button:has-text("Accepteren")',
        'button:has-text("Alles accepteren")'
    ]
    for (const sel of quick) {
        const btn = page.locator(sel).first()
        if (await btn.count() > 0) {
            await btn.click({ timeout: 1000 }).catch(() => {})
            await page.waitForTimeout(250)
        }
    }

    const trustArcFrame = await waitForFrame(
        page,
        f =>
            /trustarc/i.test(f.url()) ||
            /trustarc_cm/i.test(f.name() || '') ||
            /consent(?:-pref)?\.trustarc\.com/i.test(f.url()),
        3000
    )

    if (trustArcFrame) {
        const trustArcSelectors = [
            '#truste-consent-button',
            'a#truste-consent-button',
            'a.truste-button1',
            'button:has-text("Accept All")',
            'button:has-text("I Agree")',
            'a:has-text("I Agree")'
        ]
        for (const sel of trustArcSelectors) {
            const el = trustArcFrame.locator(sel).first()
            if (await el.count() > 0) {
                await el.click({ timeout: 1500 }).catch(() => {})
                await page.waitForTimeout(350)
                break
            }
        }
    }

    const langBtns = [
        'button[aria-label*="accept" i]',
        'button[aria-label*="agree" i]'
    ]
    for (const sel of langBtns) {
        const btn = page.locator(sel).first()
        if (await btn.count() > 0) {
            await btn.click({ timeout: 800 }).catch(() => {})
        }
    }

    if (aggressive) {
        await hideSelectors(page, [
            '.truste_box_overlay', '.truste_overlay', '.truste_popframe',
            '#onetrust-banner-sdk', '.ot-sdk-container',
            '#CybotCookiebotDialog', '#CybotCookiebotDialogBody',
            '.didomi-popup', '[data-didomi-popup-open]',
            '.cookie-consent', '#cookie-consent', '.consent-banner'
        ]).catch(() => {})
    }
}

export async function waitForFrame(page, predicate, timeout = 3000) {
    const end = Date.now() + timeout
    for (const f of page.frames()) if (predicate(f)) return f
    while (Date.now() < end) {
        const f = page.frames().find(predicate)
        if (f) return f
        await page.waitForTimeout(100)
    }
    return null
}

export async function hideSelectors(page, selectors = []) {
    const clean = selectors.filter(Boolean)
    if (!clean.length) return
    const css = `${clean.join(', ')} { display: none !important; visibility: hidden !important; }`
    await page.addStyleTag({ content: css }).catch(() => {})
}

export function detectConsent(html = '', reqUrls = []) {
    const s = String(html)
    const has = (re) => re.test(s)
    const anyIn = (re) => (reqUrls || []).some(u => re.test(u))

    const trustarc =
        has(/trustarc|truste_/i) ||
        anyIn(/consent(?:-pref)?\.trustarc\.com|trustarc/i)

    const onetrust =
        has(/onetrust|ot-sdk/i) ||
        anyIn(/onetrust|cookieconsent/i)

    const cookiebot =
        has(/cookiebot|CybotCookiebot/i) ||
        anyIn(/cookiebot/i)

    const didomi =
        has(/didomi/i) ||
        anyIn(/didomi/i)

    const vendor = trustarc ? 'TrustArc' :
        onetrust ? 'OneTrust' :
            cookiebot ? 'Cookiebot' :
                didomi ? 'Didomi' : null

    return { trustarc, onetrust, cookiebot, didomi, any: !!vendor, vendor }
}
