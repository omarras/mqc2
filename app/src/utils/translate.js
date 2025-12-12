export async function translateToEnglish(text) {
    if (!text) return "";

    const url =
        "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t" +
        `&sl=auto&tl=en&q=${encodeURIComponent(text)}`;

    const res = await fetch(url);
    const data = await res.json();

    // Join all returned text segments
    return data[0].map(x => x[0]).join("");
}
