/**
 * markdown.js
 *
 * Minimaler Markdown→HTML-Renderer für die Modul-Doku-Seiten. Reine
 * String-Verarbeitung, keine DOM-Abhängigkeit — läuft im Browser genauso
 * wie unter Node.
 *
 * Unterstützt: #/##/### Headings, Absätze, **bold**, *italic*, `code`,
 * [text](url), Fenced Code Blocks (mit Best-Effort-Syntax-Highlighting),
 * GFM-Tabellen, flache Listen (-/* bzw. 1.), Blockquotes (> ...).
 *
 * @example
 *   import { parseReadme } from './markdown.js';
 *   const doc = parseReadme(markdownText);
 *   // doc → { title, tagline, intro, sections: [{ id, label, titleHtml, html }] }
 */

// ── Öffentliche API ──────────────────────────────────────────────────────────

/**
 * Parst eine komplette readme.md in Titel, Tagline, Intro und Sections.
 * Sections = jeweils ein `##`-Block (Slug der Überschrift wird zur `id`).
 * @param {string} markdown
 * @returns {{title:string, tagline:string, intro:string, sections:{id:string,label:string,titleHtml:string,html:string}[]}}
 */
export function parseReadme(markdown) {
    const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');

    let i = 0;
    let title = '';

    // 1. Erste H1 finden
    while (i < lines.length && !/^#\s+/.test(lines[i])) i++;
    if (i < lines.length) {
        title = lines[i].replace(/^#\s+/, '').trim();
        i++;
    }

    // 2. Blockquote direkt nach der H1 (nach Leerzeilen) → Tagline
    while (i < lines.length && lines[i].trim() === '') i++;
    let tagline = '';
    if (i < lines.length && /^>\s?/.test(lines[i])) {
        const tagLines = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
            tagLines.push(lines[i].replace(/^>\s?/, ''));
            i++;
        }
        tagline = inline(escapeHtml(tagLines.join(' ').trim()));
    }

    // 3. Intro: alles bis zur ersten `##`-Überschrift
    const introLines = [];
    while (i < lines.length && !/^##\s+/.test(lines[i])) {
        introLines.push(lines[i]);
        i++;
    }
    const intro = mdToHtml(introLines.join('\n'));

    // 4. Sections: je ein `##`-Block
    const sections = [];
    const seenSlugs = new Set();
    while (i < lines.length) {
        const m = lines[i].match(/^##\s+(.+)$/);
        if (!m) { i++; continue; }
        const headingRaw = m[1].trim();
        i++;
        const bodyLines = [];
        while (i < lines.length && !/^##\s+/.test(lines[i])) {
            bodyLines.push(lines[i]);
            i++;
        }
        sections.push({
            id: uniqueSlug(slugify(headingRaw), seenSlugs),
            label: stripInlineMarkup(headingRaw),
            titleHtml: inline(escapeHtml(headingRaw)),
            html: mdToHtml(bodyLines.join('\n')),
        });
    }

    return { title, tagline, intro, sections };
}

// ── Block-Parser ─────────────────────────────────────────────────────────────

/**
 * Wandelt einen beliebigen Markdown-Textblock in HTML um (Absätze, Listen,
 * Tabellen, Code-Blocks, Headings, Blockquotes).
 * @param {string} text
 * @returns {string}
 */
function mdToHtml(text) {
    // Horizontale Trenner sind reine Quelltext-Optik — Sections übernehmen das.
    const lines = text
        .replace(/^\s*([-*_])\1{2,}\s*$/gm, '')
        .split('\n');

    const out = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (line.trim() === '') { i++; continue; }

        // Fenced Code Block
        const fence = line.match(/^```(\w*)/);
        if (fence) {
            const lang = fence[1];
            const code = [];
            i++;
            while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
            i++; // schließendes ```
            out.push(`<pre><code>${highlightCode(lang, code.join('\n'))}</code></pre>`);
            continue;
        }

        // Heading (### und tiefer — # und ## sind bereits auf Doc-Ebene konsumiert)
        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            const level = heading[1].length;
            out.push(`<h${level}>${inline(escapeHtml(heading[2].trim()))}</h${level}>`);
            i++;
            continue;
        }

        // Blockquote → Callout
        if (/^>\s?/.test(line)) {
            const qLines = [];
            while (i < lines.length && /^>\s?/.test(lines[i])) { qLines.push(lines[i].replace(/^>\s?/, '')); i++; }
            out.push(
                `<div class="callout"><span class="msr">info</span><p>${inline(escapeHtml(qLines.join(' ').trim()))}</p></div>`
            );
            continue;
        }

        // Tabelle (GFM): Header-Zeile + Trennzeile
        if (line.includes('|') && lines[i + 1] && /^[\s|:-]+$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
            const headerCells = splitRow(line);
            i += 2; // Header + Trennzeile
            const bodyRows = [];
            while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
                bodyRows.push(splitRow(lines[i]));
                i++;
            }
            out.push(renderTable(headerCells, bodyRows));
            continue;
        }

        // Liste (flach): -, * oder "1."
        if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
            const ordered = /^\s*\d+\.\s+/.test(line);
            const items = [];
            while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
                i++;
            }
            const tag = ordered ? 'ol' : 'ul';
            out.push(`<${tag}>${items.map(it => `<li>${inline(escapeHtml(it))}</li>`).join('')}</${tag}>`);
            continue;
        }

        // Absatz: zusammenhängende Zeilen bis zur nächsten Leerzeile/Block-Markierung
        const paraLines = [];
        while (
            i < lines.length &&
            lines[i].trim() !== '' &&
            !/^```/.test(lines[i]) &&
            !/^#{1,6}\s+/.test(lines[i]) &&
            !/^>\s?/.test(lines[i]) &&
            !/^\s*([-*]|\d+\.)\s+/.test(lines[i])
        ) {
            paraLines.push(lines[i]);
            i++;
        }
        out.push(`<p>${inline(escapeHtml(paraLines.join(' ').trim()))}</p>`);
    }

    return out.join('\n');
}

function splitRow(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function renderTable(headerCells, bodyRows) {
    const thead = `<tr>${headerCells.map(c => `<th>${inline(escapeHtml(c))}</th>`).join('')}</tr>`;
    const tbody = bodyRows
        .map(row => `<tr>${row.map(c => `<td>${inline(escapeHtml(c))}</td>`).join('')}</tr>`)
        .join('');
    return `<table>${thead}${tbody}</table>`;
}

// ── Inline-Formatierung ──────────────────────────────────────────────────────

/**
 * Wendet Inline-Markdown (code/bold/italic/links) auf bereits HTML-escapten Text an.
 * @param {string} escaped
 */
function inline(escaped) {
    return escaped
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/**
 * Entfernt Markdown-Auszeichnungen, liefert reinen Text (für Nav-Labels/section-label).
 * @param {string} raw
 */
function stripInlineMarkup(raw) {
    return raw
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

/**
 * HTML-Escape für &, <, > (für Text-Inhalte ausreichend, keine Attribute).
 * @param {string} s
 */
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Slugs ────────────────────────────────────────────────────────────────────

function slugify(text) {
    return stripInlineMarkup(text)
        .toLowerCase()
        .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'section';
}

function uniqueSlug(base, seen) {
    let slug = base, n = 2;
    while (seen.has(slug)) { slug = `${base}-${n++}`; }
    seen.add(slug);
    return slug;
}

// ── Syntax-Highlighting (Best-Effort) ────────────────────────────────────────
// Nutzt die in appdata/versioning.css bereits vorhandenen Klassen .kw/.str/.cmt/.fn/.num.

const LANG_RULES = {
    js: [
        ['cmt', /\/\/[^\n]*|\/\*[\s\S]*?\*\//],
        ['str', /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/],
        ['kw', /\b(?:const|let|var|function|return|import|from|export|default|new|await|async|if|else|for|while|class|extends|typeof|instanceof|true|false|null|undefined|this|static|get|set|try|catch|finally|throw|switch|case|break|continue|of|in|yield|super)\b/],
        ['num', /\b\d+(?:\.\d+)?\b/],
        ['fn', /\b[A-Za-z_$][\w$]*(?=\s*\()/],
    ],
    css: [
        ['cmt', /\/\*[\s\S]*?\*\//],
        ['str', /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/],
        ['kw', /@[\w-]+/],
        ['fn', /(?:--[\w-]+|[a-z-]+)(?=\s*:)/i],
        ['num', /-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms|deg)?/],
    ],
    html: [
        ['cmt', /&lt;!--[\s\S]*?--&gt;/],
        ['str', /"[^"]*"|'[^']*'/],
        ['kw', /&lt;\/?[a-zA-Z][\w-]*/],
        ['fn', /\s[a-zA-Z][\w-]*(?=\s*=)/],
    ],
    bash: [
        ['cmt', /#[^\n]*/],
        ['str', /"(?:\\.|[^"\\])*"|'[^']*'/],
    ],
};

const LANG_ALIASES = {
    javascript: 'js', mjs: 'js', ts: 'js', typescript: 'js',
    xml: 'html', sh: 'bash', shell: 'bash',
};

/**
 * Best-Effort-Syntax-Highlighting für einen Code-Block.
 * @param {string} lang - Sprachkürzel aus dem Fence (z.B. "js")
 * @param {string} code - roher (unescapter) Code-Inhalt
 * @returns {string} HTML-Inhalt für <code>
 */
function highlightCode(lang, code) {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const key = LANG_ALIASES[lang] || lang;
    const rules = LANG_RULES[key];
    if (!rules) return escaped;

    const combined = new RegExp(rules.map(([, re]) => `(${re.source})`).join('|'), 'g');
    return escaped.replace(combined, (...args) => {
        const full = args[0];
        const groups = args.slice(1, 1 + rules.length);
        const idx = groups.findIndex(g => g !== undefined);
        if (idx === -1) return full;
        return `<span class="${rules[idx][0]}">${full}</span>`;
    });
}
