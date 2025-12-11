// src/textComparison/step1_excludes/excludeEngine.js

import * as cheerio from "cheerio";
import { extractDeepText } from "../helpers/textExtractors.js";

/**
 * Filter out garbage structural sequences such as:
 * "div span label", "li a div", "p p div", etc.
 * Keeps only human-visible text with letters in it.
 */
function filterMeaningfulText(arr) {
    if (!arr || !arr.length) return [];

    return arr.filter(t => {
        if (!t || typeof t !== "string") return false;

        const trimmed = t.trim();
        if (!trimmed) return false;

        // must contain at least one letter
        if (!/[A-Za-zÀ-ž]/.test(trimmed)) return false;

        // reject sequences made only of tag names
        if (/^(div|span|li|a|p|section|header|footer|button|img|figure|label)(\s|$)/i.test(trimmed))
            return false;

        return true;
    });
}

/**
 * Apply platform excludes with deep text extraction + meaningful filtering.
 */
export function applyPlatformExcludes($, rules, debugCollector = null) {

    for (const rule of rules) {
        let removedNodes = [];

        switch (rule.type) {
            case "selector":
            case "tag": {
                const nodes = $(rule.value).toArray();
                removedNodes = collectAndRemove($, nodes);
                break;
            }

            case "attrEquals": {
                const nodes = [];
                $(`[${rule.attr}]`).each((_, el) => {
                    if ($(el).attr(rule.attr) === rule.equals) nodes.push(el);
                });
                removedNodes = collectAndRemove($, nodes);
                break;
            }

            case "attrContains": {
                const nodes = [];
                $(`[${rule.attr}]`).each((_, el) => {
                    const val = $(el).attr(rule.attr) || "";
                    if (val.includes(rule.contains)) nodes.push(el);
                });
                removedNodes = collectAndRemove($, nodes);
                break;
            }

            case "commentRange": {
                removedNodes = stripCommentRange($, rule.start, rule.end);
                break;
            }
        }

        if (!debugCollector) continue;

        // extract deep text for each removed node
        let extracted = removedNodes.map(n => extractDeepText($, n));

        // flatten 2D arrays
        extracted = extracted
            .flat()
            .map(t => (Array.isArray(t) ? t : [t]))
            .flat()
            .filter(Boolean);

        // remove garbage structural chunks
        const meaningful = filterMeaningfulText(extracted);

        // do NOT push debug entry if nothing meaningful
        if (meaningful.length === 0) continue;

        debugCollector.push({
            rule,
            removedCount: removedNodes.length,
            removedText: meaningful.map(t => [t])
        });
    }
}

/* ---------- Helpers ---------- */

function collectAndRemove($, nodes) {
    if (!nodes) return [];

    if (!Array.isArray(nodes)) {
        if (nodes.cheerio) nodes = nodes.toArray();
        else nodes = [nodes];
    }

    const removed = [];

    nodes.forEach(el => {
        if (el) {
            removed.push(el);
            $(el).remove();
        }
    });

    return removed;
}

function stripCommentRange($, startMarker, endMarker) {
    const root = $.root()[0];
    const flat = flattenDomTree(root);

    let startNode = null;
    let endNode = null;

    for (const n of flat) {
        if (n.type === "comment") {
            const t = (n.data || "").trim();
            if (t.includes(startMarker)) startNode = n;
            if (t.includes(endMarker)) endNode = n;
            if (startNode && endNode) break;
        }
    }

    if (!startNode || !endNode) return [];

    const parent = findSectionParent(startNode);

    if (parent) {
        const removed = [parent];
        $(parent).remove();
        return removed;
    }

    return stripBetweenComments($, startMarker, endMarker);
}

function stripBetweenComments($, startMarker, endMarker) {
    const root = $.root()[0];
    const flat = flattenDomTree(root);

    let active = false;
    const removed = [];

    for (const node of flat) {
        if (node.type === "comment") {
            const t = (node.data || "").trim();

            if (t.includes(startMarker)) {
                active = true;
                removed.push(node);
                continue;
            }

            if (t.includes(endMarker)) {
                removed.push(node);
                active = false;
                continue;
            }
        }

        if (active && node.type !== "comment") removed.push(node);
    }

    removed.forEach(n => $(n).remove());
    return removed;
}

function findSectionParent(n) {
    let cur = n.parent;

    while (cur) {
        if (
            cur.type === "tag" &&
            ["div", "section", "header", "footer", "nav"].includes(cur.name)
        ) {
            return cur;
        }
        cur = cur.parent;
    }
    return null;
}

function flattenDomTree(node, out = []) {
    if (!node) return out;
    out.push(node);
    if (node.children) node.children.forEach(c => flattenDomTree(c, out));
    return out;
}
