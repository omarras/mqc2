// src/textComparison/step2_visibility/platformVisibilityRules.js

/**
 * Platform-specific visibility rules for Step 2.
 *
 * These rules determine which CSS classes or attributes
 * indicate that content is hidden *even if not explicitly
 * styled inline*.
 *
 * Step 2 already handles:
 * - display:none
 * - visibility:hidden
 * - opacity:0
 * - aria-hidden="true"
 * - [hidden]
 *
 * This file supplements those with platform-specific class patterns.
 */

export const PLATFORM_VISIBILITY = {
    AEM: {
        /**
         * HIDDEN CLASS PREFIXES
         * If a class STARTS WITH any of these, strip the element.
         * Example: "u-hidden", "u-hidden-md", "hiddenLink"
         */
        hiddenClassPrefixes: [
            "u-hidden",
            "p-hidden",
            "hidden",
            "aem-hidden",
            "visuallyhidden"
        ],

        /**
         * FULL CLASS MATCHES
         * If a class EXACTLY EQUALS one of these, strip the element.
         */
        hiddenClassEquals: [
            "u-visually-hidden",
            "sr-only",
            "screen-reader-text"
        ]
    },

    ContentStack: {
        hiddenClassPrefixes: [
            "cs-hidden",
            "u-hidden",
            "hidden"
        ],
        hiddenClassEquals: [
            "visually-hidden",
            "sr-only"
        ]
    }
};
