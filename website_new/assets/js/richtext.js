// =============================================
// RICH TEXT for ability descriptions (rank pages, character stat block, rank editor)
//   **negrita**   *cursiva*   líneas que empiezan por "- " → lista   salto de línea → <br>
// =============================================

function formatRichText(text) {
    if (!text) return text;
    const inline = s => s
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?![*\w])/g, '$1<em>$2</em>');

    const out = [];
    let para = [];
    let list = null;
    const flushPara = () => { if (para.length) { out.push(para.join('<br>')); para = []; } };
    const flushList = () => { if (list) { out.push(`<ul class="rt-list">${list.join('')}</ul>`); list = null; } };

    for (const line of String(text).replace(/\r/g, '').split('\n')) {
        const item = /^\s*[-•]\s+(.*)$/.exec(line);
        if (item) {
            flushPara();
            (list || (list = [])).push(`<li>${inline(item[1])}</li>`);
        } else if (!line.trim()) {
            flushList(); flushPara();
        } else {
            flushList();
            para.push(inline(line));
        }
    }
    flushList(); flushPara();
    // Paragraphs separated by a line break; lists are block elements already
    return out.reduce((acc, part, i) => {
        const prevIsList = i > 0 && out[i - 1].startsWith('<ul');
        const sep = i === 0 || part.startsWith('<ul') || prevIsList ? '' : '<br>';
        return acc + sep + part;
    }, '');
}
