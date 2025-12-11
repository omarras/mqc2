export const PLATFORM_EXCLUDES = {
    AEM: [
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
        { type: "tag", value: "title" },
        { type: "tag", value: "header" },
        { type: "tag", value: "footer" },
        {
            type: "attrEquals",
            attr: "data-testid",
            equals: "newsletter-subscribe-form"
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
