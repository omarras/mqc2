export const PLATFORM_EXCLUDES = {
    AEM: [
        { type: "selector", value: ".pv-slider__header" },
        { type: "selector", value: ".pv-slider__wrapper" },
        { type: "selector", value: ".p-st36-category-support-navigation" },
        { type: "selector", value: ".pv-pc63-category-reference" },
        { type: "selector", value: ".pv-n31-article-cards" },
        { type: "selector", value: ".p-pc05v2-product-cards" },
        { type: "tag", value: "figcaption" },
        { type: "tag", value: "script" },
        { type: "tag", value: "title" },
        {
            type: "attrContains",
            attr: "data-testid",
            contains: "breadcrumb"
        },
        {
            type: "commentRange",
            start: "HEADER SECTION START",
            end: "HEADER SECTION END"
        },
        {
            type: "commentRange",
            start: "FOOTER SECTION START",
            end: "FOOTER SECTION END"
        }
    ],
    ContentStack: [
        { type: "selector", value: ".navigation-bar" },
        { type: "selector", value: ".swiper" },
        { type: "tag", value: "title" },
        { type: "tag", value: "header" },
        { type: "tag", value: "footer" },
        {
            type: "attrEquals",
            attr: "data-testid",
            equals: "newsletter-subscribe-form"
        },
        {
            type: "attrEquals",
            attr: "data-testid",
            equals: "support-navigation"
        },
        {
            type: "attrContains",
            attr: "aria-label",
            contains: "Breadcrumbs"
        },
        {
            type: "attrContains",
            attr: "data-testid",
            contains: "breadcrumb"
        },
        {
            type: "attrContains",
            attr: "data-testid",
            contains: "usp-bar"
        }
    ]
};
