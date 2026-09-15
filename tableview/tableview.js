/**
 * tableView.js – Sort, Group, Filter & Search (zustandslos, DOM-attributgesteuert)
 * ============================================================================
 *
 * Der komplette Zustand liegt in HTML-Attributen. Das Modul hält keinerlei
 * eigenen State – jedes render() liest die Tabelle frisch aus dem DOM.
 * Externe JS-Änderungen an der Tabelle sind daher jederzeit möglich.
 *
 * ── Attribute auf <table> ────────────────────────────────────────────────────
 *   t-search            Suchfeld einblenden (erst ab >7 Datenzeilen sichtbar)
 *   t-summarize="bottom"  Position der Zusammenfassungszeile: "bottom" (Default) | "top"
 *   t-open="a|b"        (intern) offene Gruppenpfade
 *
 * ── Attribute auf den Zellen der ersten Zeile (<th> oder <td>) ───────────────
 *   t-sort              Spalte sortierbar
 *   t-sort="asc|desc"   aktive Sortierung (nur eine Spalte gleichzeitig)
 *   t-group             Spalte gruppierbar
 *   t-group="active"    aktive Gruppierung
 *   t-split=","         Mehrfachwerte in der Zelle an "," trennen (Multi-Group)
 *   t-filter            Spalte filterbar
 *   t-filter='{"min":"5"}'  aktiver Filter (JSON)
 *   t-type="date|num|string"  Datentyp; fehlt er, wird er erkannt und gesetzt
 *                             (automatisch gesetzte tragen zusätzlich t-type-auto)
 *   t-sum  / t-mean     Summe / Mittelwert der Spalte (nur t-type="num")
 *   t-min  / t-max      Kleinster / größter Wert (t-type="num" oder "date")
 *                       Der Attributwert überschreibt die Beschriftung:
 *                       t-sum="Gesamt" → "Gesamt 1.234,50"
 *                       Berechnet wird immer über die aktuell sichtbaren Zeilen.
 *
 * ── Autoerkennung ───────────────────────────────────────────────────────────
 *   Standardmäßig werden alle Tabellen im Dokument automatisch initialisiert und
 *   neu eingefügte per MutationObserver nachgezogen. Abschalten über die
 *   Import-URL:
 *       import { prepareTables } from './tableview.js?autodetect=false';
 *       <script src="tableview.js?autodetect=false" type="module"></script>
 *   Dann greift nur noch prepareTables(scope) bzw. startAutodetect().
 *
 * ── Icons ───────────────────────────────────────────────────────────────────
 *   Default sind reine UTF-8-Zeichen – keine Icon-Schrift nötig. setIcons()
 *   nimmt genau einen Parameter: einen Set-Namen oder eine eigene Map, deren
 *   Werte als Markup eingesetzt werden.
 *       import { setIcons } from './tableview.js';
 *       setIcons('default-msr');   // Material Symbols, <span class="msr">…
 *       setIcons({ search: '<span class="meine-font">xyz</span>', open: '▾' });
 *   oder direkt beim Import:  ./tableview.js?icons=msr
 *
 * ── Gespeicherte Ansichten ──────────────────────────────────────────────────
 *   Läuft ohne Zutun: der Schlüssel kommt aus der id bzw. den Spaltennamen,
 *   gespeichert wird pro Seitenpfad. Gesichert wird nur Sortierung und
 *   Gruppierung (inkl. Reihenfolge), nie der Auf-/Zuklapp-Zustand, und nur
 *   wenn der Nutzer es auslöst:
 *       <button t-view-save>Ansicht merken</button>
 *       <button t-view-reset>Zurücksetzen</button>
 *       <button t-view-share>Link kopieren</button>
 *   Ziel ist localStorage plus URL; die URL abschalten mit
 *       ./tableview.js?viewurl=false
 *
 * ── Attribut das auf <td> geschrieben wird ───────────────────────────────────
 *   t-value             numerischer Wert (Zahl bzw. Timestamp) für date/num
 *
 * ── Filter-Objekt je Datentyp (alle Bedingungen UND-verknüpft) ───────────────
 *   date  { min, max, eq }          Werte als YYYY-MM-DD
 *   num   { min, max, eq }
 *   string{ contains, starts, ends, eq }
 *
 * ── Öffentliche API ─────────────────────────────────────────────────────────
 *   prepareTables(scope)              Init (passiert auch automatisch)
 *   startAutodetect(scope)            Autoerkennung nachträglich anschalten
 *   setIcons(set|map)                 Icon-Set wechseln
 *   getIcons()                        aktuelles Set auslesen
 *   saveView / loadView / resetView   gespeicherte Ansicht
 *   shareUrl(table)                   teilbarer Link auf die aktuelle Ansicht
 *   renderTable(table)                Pipeline neu ausführen
 *   checkType(table, col)             → { type, values }  (+ schreibt t-value/t-type)
 *   sortTable(table, col, dir)        dir: 'asc' | 'desc' | 'none'
 *   groupTable(table, col, active)    active: true | false | undefined(=toggle)
 *   filterTable(table, col, filter)   filter: Objekt oder null (löschen)
 */

const SEP = '\x1f';
const MIN_ROWS_SEARCH = 7;

/**
 * Autoerkennung an/aus – steuerbar über die Import-URL:
 *   ./tableview.js?autodetect=false   →  nur noch manuelles prepareTables()
 * Alles außer false/0/off/no (case-insensitiv) gilt als "an".
 */
/**
 * Gespeicherte Ansichten zusätzlich in die URL schreiben – damit der Nutzer
 * seine Sicht weitergeben kann. Abschalten über die Import-URL:
 *   ./tableview.js?viewurl=false   →  nur noch localStorage
 */
const VIEW_URL = (() => {
    try {
        const v = new URL(import.meta.url).searchParams.get('viewurl');
        return v === null || !/^(false|0|off|no|nein|aus)$/i.test(v.trim());
    } catch {
        return true;
    }
})();

const AUTODETECT = (() => {
    try {
        const v = new URL(import.meta.url).searchParams.get('autodetect');
        return v === null || !/^(false|0|off|no|nein|aus)$/i.test(v.trim());
    } catch {
        return true;
    }
})();

/** Offene Gruppenpfade aus t-open lesen (JSON-Liste – Pfade dürfen alles enthalten). */
function openPaths(table) {
    try {
        const l = JSON.parse(table.getAttribute('t-open') || '[]');
        return new Set(Array.isArray(l) ? l : []);
    } catch {
        return new Set();
    }
}

function setOpenPaths(table, set) {
    table.setAttribute('t-open', JSON.stringify([...set]));
}

/* ══════════════════════════════════════════════════════════════════════════
   Icons – zwei mitgelieferte Sets, eigene Maps jederzeit möglich
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Verwendete Schlüssel:
 *   sort asc desc group filter clear open closed remove search deepOpen
 *   deepClosed viewSave viewReset
 *
 * Jeder Wert ist der Inhalt des Icon-Spans – ein UTF-8-Zeichen, aber genauso
 * gut eigenes Markup:  search: '<span class="meine-font">xyz</span>'
 */
export const ICON_SETS = {
    'default-utf8': {
        sort: '⇅', asc: '↑', desc: '↓',
        group: '☰', filter: '▽', clear: '⊘',
        open: '▾', closed: '▸', remove: '✕', search: '⌕',
        deepOpen: '⊞', deepClosed: '⊟',
        viewSave: '★', viewReset: '↺'
    },
    'default-msr': {
        sort:   '<span class="msr">unfold_more</span>',
        asc:    '<span class="msr">arrow_upward</span>',
        desc:   '<span class="msr">arrow_downward</span>',
        group:  '<span class="msr">workspaces</span>',
        filter: '<span class="msr">filter_alt</span>',
        clear:  '<span class="msr">filter_alt_off</span>',
        open:   '<span class="msr">expand_more</span>',
        closed: '<span class="msr">chevron_right</span>',
        remove: '<span class="msr">close</span>',
        search: '<span class="msr">search</span>',
        deepOpen:   '<span class="msr">unfold_more</span>',
        deepClosed: '<span class="msr">unfold_less</span>',
        viewSave:   '<span class="msr">bookmark_add</span>',
        viewReset:  '<span class="msr">restart_alt</span>'
    }
};

const ICON_KEYS = Object.keys(ICON_SETS['default-utf8']);

let ICO = { ...ICON_SETS['default-utf8'] };

/**
 * Icon-Set wechseln. Wirkt sofort auf alle bereits gerenderten Tabellen.
 * Genau ein Parameter – entweder der Name eines mitgelieferten Sets oder
 * eine eigene Map:
 *
 *   setIcons('default-utf8')                    reine UTF-8-Zeichen (Default)
 *   setIcons('default-msr')                     Material Symbols über .msr
 *   setIcons({ search: '<span class="ph">x</span>', open: '▾' })
 *
 * Eine Map wird über das aktuelle Set gelegt: was nicht drinsteht bleibt wie
 * es war, unbekannte Schlüssel werden gemeldet. Die Werte werden als Markup
 * eingesetzt – eine eigene Icon-Font-Klasse gehört also direkt in den Wert.
 */
export function setIcons(icons) {
    let map = icons;

    if (typeof icons === 'string') {
        map = ICON_SETS[icons] || ICON_SETS[`default-${icons}`];
        if (!map) {
            console.warn(`[tableView] Unbekanntes Icon-Set "${icons}" – erlaubt sind `
                + `${Object.keys(ICON_SETS).map(k => `"${k}"`).join(', ')} oder eine eigene Map.`);
            return;
        }
    }
    if (!map || typeof map !== 'object') {
        console.warn('[tableView] setIcons() erwartet einen Set-Namen oder eine Map.');
        return;
    }

    const unknown = Object.keys(map).filter(k => !ICON_KEYS.includes(k));
    if (unknown.length) {
        console.warn(`[tableView] Unbekannte Icon-Schlüssel: ${unknown.join(', ')} – `
            + `erlaubt sind ${ICON_KEYS.join(', ')}.`);
    }

    ICO = { ...ICO, ...map };
    paintIcons(document);
}

/** Aktuelles Set auslesen (Kopie). */
export function getIcons() {
    return { ...ICO };
}

// Set schon beim Import wählbar:  ./tableview.js?icons=msr
(() => {
    try {
        const v = new URL(import.meta.url).searchParams.get('icons');
        if (v) setIcons(v.trim().toLowerCase());
    } catch { /* nichts zu tun */ }
})();

/** Alle Spans mit data-tv-ico neu befüllen – auch Popovers außerhalb der Tabelle. */
function paintIcons(root) {
    root.querySelectorAll?.('[data-tv-ico]').forEach(el => {
        const key = el.dataset.tvIco;
        if (!(key in ICO)) return;
        if (el.innerHTML !== ICO[key]) el.innerHTML = ICO[key];
    });
}

const FIELDS = {
    date: [
        { op: 'min', label: 'Ab (≥)',   type: 'date' },
        { op: 'max', label: 'Bis (≤)',  type: 'date' },
        { op: 'eq',  label: 'Genau am', type: 'date' }
    ],
    num: [
        { op: 'min', label: 'Von (≥)',   type: 'number' },
        { op: 'max', label: 'Bis (≤)',   type: 'number' },
        { op: 'eq',  label: 'Genau (=)', type: 'number' }
    ],
    string: [
        { op: 'contains', label: 'Enthält',     type: 'text' },
        { op: 'starts',   label: 'Beginnt mit', type: 'text' },
        { op: 'ends',     label: 'Endet auf',   type: 'text' },
        { op: 'eq',       label: 'Ist genau',   type: 'text' }
    ]
};

const OP_SHORT = { min: '≥', max: '≤', eq: '=', contains: '∋', starts: '^', ends: '$' };

/** Spalten-Zusammenfassungen – ausgegeben wird in der Attributreihenfolge der Zelle. */
const AGGS = [
    { attr: 't-sum',  key: 'sum',  label: 'Σ',   types: ['num'] },
    { attr: 't-mean', key: 'mean', label: '⌀',   types: ['num'] },
    { attr: 't-min',  key: 'min',  label: 'Min', types: ['num', 'date'] },
    { attr: 't-max',  key: 'max',  label: 'Max', types: ['num', 'date'] }
];

const NUM_FMT = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

/** t-min="-" (oder none/off/ohne/kein) → Wert ohne Beschriftung ausgeben. */
const NO_LABEL = /^(-|none|off|false|no|ohne|kein|keine)$/i;

let uid = 0;
const busy = new WeakSet();
const observers = new WeakMap();
const lastQuery = new WeakMap();

/* ══════════════════════════════════════════════════════════════════════════
   Zugriff auf die Tabelle – erste Zeile = Kopfzeile, Rest = Daten
   ══════════════════════════════════════════════════════════════════════════ */

/** Zellen der Kopfzeile (erste <tr> der Tabelle). */
function headCells(table) {
    const row = table.querySelector('tr');
    return row ? [...row.children].filter(c => c.matches('th, td')) : [];
}

/** Alle echten Datenzeilen (ohne Kopf-, Such-, Gruppen-, Klon-, Leer- und Summenzeile). */
function dataRows(table) {
    const head = table.querySelector('tr');
    return [...table.querySelectorAll('tr')].filter(tr =>
        tr !== head &&
        !tr.classList.contains('tv-search-row') &&
        !tr.classList.contains('tv-group-row') &&
        !tr.classList.contains('tv-clone') &&
        !tr.classList.contains('tv-summary-row') &&
        !tr.classList.contains('tv-empty-row'));
}

/**
 * Container, in den Datenzeilen gehängt werden.
 * Reihenfolge: vorhandene Datenzeilen → <tbody> → Elternknoten der Kopfzeile.
 * Der tbody-Schritt ist wichtig für (noch) leere Tabellen – sonst landen
 * generierte Zeilen im <thead>.
 */
function rowBox(table) {
    return dataRows(table)[0]?.parentNode
        || table.tBodies?.[0]
        || table.querySelector('tr')?.parentNode;
}

/** Wert einer Zelle (data-sort-value hat Vorrang vor dem Text). */
function cellValue(tr, col) {
    const td = tr.children[col];
    if (!td) return '';
    return (td.dataset.sortValue ?? td.textContent).trim();
}

/** Beschriftung einer Kopfzelle (ohne die Icon-Leiste). */
function colName(cell) {
    if (!cell) return '';
    return [...cell.childNodes]
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent).join(' ').trim() || cell.textContent.trim();
}

/* ══════════════════════════════════════════════════════════════════════════
   Der eine Parser: String → Zahl (für 'date' Timestamp, für 'num' Zahl)
   ══════════════════════════════════════════════════════════════════════════ */

export function toNumber(str, type) {
    if (str === null || str === undefined) return null;
    const v = String(str).trim();
    if (!v) return null;

    if (type === 'date') {
        // ISO: 2024-03-01 / 2024-03-01T08:30 / 2024-03-01 08:30:00
        let m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
        if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));

        // Deutsch: 01.03.2024 / 1.3.24 / 01.03.2024 08:30
        m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
        if (m) {
            let y = +m[3];
            if (y < 100) y += y < 70 ? 2000 : 1900;
            return Date.UTC(y, +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
        }
        return null;
    }

    // num: Währungs-/Prozentzeichen weg, deutsche Schreibweise umbauen
    let n = v.replace(/[\s\u00a0€$%]/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(n)) n = n.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d+,\d+$/.test(n))             n = n.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(n)) return null;
    return parseFloat(n);
}

/* ══════════════════════════════════════════════════════════════════════════
   checkType – erkennt den Spaltentyp, schreibt t-type und t-value
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Prüft eine Spalte komplett durch und liefert { type, values }.
 * values = alle Zellwerte in der aktuellen Reihenfolge.
 *
 * Reihenfolge der Erkennung: erst date, dann num, sonst string.
 * Ein bereits von Hand gesetztes t-type gewinnt; passt es nicht zu den
 * Daten, gibt es eine Warnung in der Console.
 * Bei date/num bekommt jedes <td> den numerischen Wert als t-value.
 */
export function checkType(table, col, rows) {
    rows = rows || dataRows(table);
    const cell   = headCells(table)[col];
    const values = rows.map(tr => cellValue(tr, col));
    const filled = values.filter(v => v !== '');

    // ── 1. Typ aus den Daten erkennen: date → num → string ──────────────────
    let detected = 'string';
    if (filled.length) {
        if      (filled.every(v => toNumber(v, 'date') !== null)) detected = 'date';
        else if (filled.every(v => toNumber(v, 'num')  !== null)) detected = 'num';
    }

    // ── 2. Handgesetztes t-type hat Vorrang (t-type-auto = von uns gesetzt) ──
    const declared = cell?.getAttribute('t-type');
    const isAuto   = cell?.hasAttribute('t-type-auto');
    let manual = null;
    if (declared && !isAuto) {
        // Schreibweisen wie int/integer/number/float/text auf unsere drei Typen mappen
        const d = declared.toLowerCase();
        manual = /^(date|datetime|time)$/.test(d)              ? 'date'
               : /^(num|int|integer|number|float|zahl)$/.test(d) ? 'num'
               : /^(string|text|str)$/.test(d)                 ? 'string'
               : null;
        if (!manual) {
            console.warn(`[tableView] Spalte ${col} ("${colName(cell)}"): unbekanntes `
                + `t-type="${declared}" – erkannt wird stattdessen "${detected}".`);
        }
    }
    const type = manual || detected;

    if (manual && manual !== detected && detected !== 'string') {
        console.warn(`[tableView] Spalte ${col} ("${colName(cell)}") ist als t-type="${manual}" `
            + `deklariert, erkannt wurde aber "${detected}".`);
    }

    // ── 3. Erkannten Typ zurückschreiben, damit er im DOM sichtbar ist ──────
    if (cell && !manual) {
        cell.setAttribute('t-type', detected);
        cell.setAttribute('t-type-auto', '');
    }

    // ── 4. t-value auf die <td> schreiben (nur bei date/num) ────────────────
    if (type === 'date' || type === 'num') {
        let bad = 0;
        rows.forEach((tr, i) => {
            const td = tr.children[col];
            if (!td) return;
            const n = toNumber(values[i], type);
            if (n === null) {
                td.removeAttribute('t-value');
                if (values[i] !== '') bad++;
            } else {
                td.setAttribute('t-value', n);
            }
        });
        if (bad) {
            console.warn(`[tableView] Spalte ${col} ("${colName(cell)}"): ${bad} Wert(e) `
                + `konnten nicht als "${type}" gelesen werden.`);
        }
    } else {
        rows.forEach(tr => tr.children[col]?.removeAttribute('t-value'));
    }

    return { type, values };
}

/* ══════════════════════════════════════════════════════════════════════════
   Init
   ══════════════════════════════════════════════════════════════════════════ */

export function prepareTables(scope) {
    injectCss();
    const tables = scope instanceof HTMLTableElement
        ? [scope]
        : [...(scope || document).querySelectorAll('table')];
    tables.forEach(init);
}

function init(table) {
    if (table.dataset.tvInit) return;
    const head = table.querySelector('tr');
    if (!head) return;

    table.dataset.tvInit = 'true';
    table.classList.add('tv-enabled');
    if (!table.id) table.id = `tv-table-${++uid}`;

    // ── Icons je Kopfzelle: sortieren / gruppieren / filtern ────────────────
    headCells(table).forEach((cell, i) => {
        const sortable   = cell.hasAttribute('t-sort');
        const groupable  = cell.hasAttribute('t-group');
        const filterable = cell.hasAttribute('t-filter');
        if (!sortable && !groupable && !filterable) return;

        cell.dataset.tvCol = i;
        const icons = document.createElement('span');
        icons.className = 'tv-icons';

        if (sortable) {
            icons.insertAdjacentHTML('beforeend',
                `<span class="tv-glyph tv-ico tv-ico-sort" data-col="${i}" data-tv-ico="sort" title="Sortieren"></span>`);
            cell.style.cursor = 'pointer';
        }
        if (groupable) {
            icons.insertAdjacentHTML('beforeend',
                `<span class="tv-glyph tv-ico tv-ico-group" data-col="${i}" data-tv-ico="group" title="Gruppieren"></span>`);
        }
        if (filterable) icons.appendChild(makeFilterButton(table, i));

        cell.appendChild(icons);
    });

    // ── Suchzeile direkt unter die Kopfzeile ────────────────────────────────
    if (table.hasAttribute('t-search')) {
        const tr = document.createElement('tr');
        tr.className = 'tv-search-row';
        tr.innerHTML = `
            <th colspan="${Math.max(1, headCells(table).length)}">
                <div class="tv-search-wrap">
                    <span class="tv-glyph tv-search-icon" data-tv-ico="search"></span>
                    <input type="text" class="tv-search-input" placeholder="Suchen ...">
                    <span class="tv-glyph tv-search-clear" data-tv-ico="remove"></span>
                </div>
            </th>`;
        head.after(tr);
    }

    paintIcons(table);

    // Stand aus dem HTML merken (Basis für resetView) und eine gespeicherte
    // Ansicht anwenden – vor dem ersten Render, sonst blitzt die Standard-
    // ansicht kurz auf.
    viewDefaults.set(table, currentView(table));
    loadView(table, false);

    observe(table);
    renderTable(table);
}

/* ══════════════════════════════════════════════════════════════════════════
   Öffentliche Aktionen
   ══════════════════════════════════════════════════════════════════════════ */

export function sortTable(table, col, dir) {
    headCells(table).forEach((cell, i) => {
        if (!cell.hasAttribute('t-sort')) return;
        cell.setAttribute('t-sort', (i === col && dir && dir !== 'none') ? dir : '');
    });
    renderTable(table);
}

/**
 * Reihenfolge der Gruppierung = Klickreihenfolge. Die zuerst geklickte Spalte
 * ist die äußerste, jede weitere wird darunter feiner. Gespeichert als
 * t-group="active:N"; ein blankes t-group="active" gilt als N=0.
 */
function groupOrder(cell) {
    const m = /^active(?::(\d+))?$/.exec((cell.getAttribute('t-group') || '').trim());
    return m ? (m[1] === undefined ? 0 : +m[1]) : null;
}

export function groupTable(table, col, active) {
    const cell = headCells(table)[col];
    if (!cell || !cell.hasAttribute('t-group')) return;

    const on = active === undefined ? groupOrder(cell) === null : !!active;
    if (!on) {
        cell.setAttribute('t-group', '');
    } else {
        const max = headCells(table)
            .reduce((n, c) => Math.max(n, groupOrder(c) ?? -1), -1);
        cell.setAttribute('t-group', `active:${max + 1}`);
    }
    renderTable(table);
}

export function filterTable(table, col, filter) {
    const cell = headCells(table)[col];
    if (!cell || !cell.hasAttribute('t-filter')) return;
    const clean = {};
    for (const [k, v] of Object.entries(filter || {})) {
        if (v !== '' && v !== null && v !== undefined) clean[k] = String(v);
    }
    cell.setAttribute('t-filter', Object.keys(clean).length ? JSON.stringify(clean) : '');
    renderTable(table);
}

function readFilter(cell) {
    const raw = cell?.getAttribute('t-filter');
    if (!raw) return null;
    try {
        const o = JSON.parse(raw);
        return (o && typeof o === 'object' && Object.keys(o).length) ? o : null;
    } catch {
        console.warn('[tableView] t-filter ist kein gültiges JSON:', raw);
        return null;
    }
}

/* ══════════════════════════════════════════════════════════════════════════
   Filter-Popover (Popover-API: Öffnen/Schließen rein per HTML-Attribut)
   ══════════════════════════════════════════════════════════════════════════ */

function makeFilterButton(table, col) {
    const id = `tv-filter-${++uid}`;
    const anchor = `--${id}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tv-ico tv-ico-filter';
    btn.title = 'Filtern';
    btn.dataset.col = col;
    btn.setAttribute('popovertarget', id);
    btn.style.setProperty('anchor-name', anchor);
    btn.innerHTML = `<span class="tv-glyph" data-tv-ico="filter"></span><small class="tv-filter-sum"></small>`;

    const pop = document.createElement('div');
    pop.className = 'tv-pop';
    pop.id = id;
    pop.setAttribute('popover', 'auto');
    pop.dataset.tvFor = table.id;
    pop.dataset.col = col;
    pop.style.setProperty('position-anchor', anchor);
    pop.innerHTML = `
        <div class="tv-pop-header">
            <span class="tv-pop-title">Filter</span>
            <button type="button" class="tv-pop-clear tv-glyph" data-tv-ico="clear" title="Filter löschen"></button>
        </div>
        <div class="tv-pop-body"></div>`;
    document.body.appendChild(pop);
    paintIcons(pop);

    return btn;
}

/** Popover-Felder an den Spaltentyp anpassen + Icon-Zustand setzen. */
function syncPopover(table, col, type, filter) {
    const btn = headCells(table)[col]?.querySelector('.tv-ico-filter');
    if (!btn) return;
    const pop = document.getElementById(btn.getAttribute('popovertarget'));
    if (!pop) return;

    if (!FIELDS[type]) type = 'string';

    if (pop.dataset.tvType !== type) {
        pop.dataset.tvType = type;
        pop.querySelector('.tv-pop-body').innerHTML = FIELDS[type].map(f => `
            <label class="tv-pop-field">
                <span class="tv-pop-label">${f.label}</span>
                <input class="tv-pop-input" type="${f.type}" data-tv-op="${f.op}">
            </label>`).join('');
    }

    pop.querySelectorAll('.tv-pop-input').forEach(inp => {
        const v = filter?.[inp.dataset.tvOp] ?? '';
        if (document.activeElement !== inp && inp.value !== v) inp.value = v;
    });

    btn.classList.toggle('tv-ico-active', !!filter);
    btn.querySelector('.tv-filter-sum').textContent = filter
        ? Object.entries(filter).map(([op, v]) => {
            let s = String(v);
            if (type === 'date') {
                const ts = toNumber(v, 'date');
                if (ts !== null) s = new Date(ts).toLocaleDateString('de-DE');
            }
            if (s.length > 10) s = s.slice(0, 9) + '…';
            return (OP_SHORT[op] || op) + s;
        }).join(' ')
        : '';
}

/** Prüft eine Zeile gegen den Filter einer Spalte. */
function passes(tr, col, type, filter) {
    if (!filter) return true;

    if (type === 'date' || type === 'num') {
        const attr = tr.children[col]?.getAttribute('t-value');
        const v = attr ? parseFloat(attr) : toNumber(cellValue(tr, col), type);
        if (v === null || Number.isNaN(v)) return false;

        if (filter.min !== undefined) {
            const b = toNumber(filter.min, type);
            if (b !== null && v < b) return false;
        }
        if (filter.max !== undefined) {
            let b = toNumber(filter.max, type);
            if (b !== null && type === 'date') b += 86399999;      // ganzer Tag inklusive
            if (b !== null && v > b) return false;
        }
        if (filter.eq !== undefined) {
            const b = toNumber(filter.eq, type);
            if (b === null) return false;
            if (type === 'date') {
                if (Math.floor(v / 86400000) !== Math.floor(b / 86400000)) return false;
            } else if (v !== b) return false;
        }
        return true;
    }

    const s = cellValue(tr, col).toLowerCase();
    if (filter.contains !== undefined && !s.includes(filter.contains.toLowerCase()))   return false;
    if (filter.starts   !== undefined && !s.startsWith(filter.starts.toLowerCase()))   return false;
    if (filter.ends     !== undefined && !s.endsWith(filter.ends.toLowerCase()))       return false;
    if (filter.eq       !== undefined && s !== filter.eq.toLowerCase())                return false;
    return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   Render-Pipeline:  Filter → Gruppieren → Sortieren
   ══════════════════════════════════════════════════════════════════════════ */

export function renderTable(table) {
    if (!table || busy.has(table)) return;
    busy.add(table);
    try {
        render(table);
    } finally {
        // Die Änderungen aus dem Render selbst verwerfen – sonst würde der
        // Observer daraufhin sofort den nächsten Render anstoßen (Endlosschleife).
        observers.get(table)?.takeRecords();
        busy.delete(table);
    }
}

function render(table) {
    const cells = headCells(table);
    const box   = rowBox(table);
    if (!cells.length || !box) return;

    // ── 1. Generierte Zeilen weg → nur Originalzeilen bleiben ───────────────
    table.querySelectorAll('.tv-group-row, .tv-clone, .tv-empty-row, .tv-summary-row')
         .forEach(tr => tr.remove());
    clearMarks(table);

    const rows = dataRows(table);
    rows.forEach((tr, i) => { if (tr.dataset.tvIdx === undefined) tr.dataset.tvIdx = i; });

    // ── 2. Spalten-Metadaten (Typ, Sortierung, Gruppierung, Filter) ─────────
    const meta = cells.map((cell, i) => {
        // Anzeigereihenfolge = Reihenfolge der Attribute im HTML.
        const order  = [...cell.attributes].map(a => a.name.toLowerCase());
        const wanted = AGGS.filter(a => cell.hasAttribute(a.attr))
                           .sort((x, y) => order.indexOf(x.attr) - order.indexOf(y.attr));
        const used = cell.hasAttribute('t-sort') || cell.hasAttribute('t-group')
                  || cell.hasAttribute('t-filter') || wanted.length > 0;
        const dir  = cell.getAttribute('t-sort');
        const type = used ? checkType(table, i, rows).type : 'string';

        // Nur Aggregate behalten, die zum erkannten Spaltentyp passen.
        const aggs = wanted
            .filter(a => a.types.includes(type))
            .map(a => {
                const raw = cell.getAttribute(a.attr)?.trim() || '';
                return { ...a, label: NO_LABEL.test(raw) ? '' : (raw || a.label) };
            });

        if (wanted.length !== aggs.length && !cell.dataset.tvAggWarned) {
            cell.dataset.tvAggWarned = '1';
            const skipped = wanted.filter(a => !a.types.includes(type)).map(a => a.attr).join(', ');
            console.warn(`[tableView] Spalte ${i} ("${colName(cell)}") hat t-type="${type}" – `
                + `${skipped} wird ignoriert.`);
        }

        return {
            cell,
            type,
            aggs,
            sortable:  cell.hasAttribute('t-sort'),
            groupable: cell.hasAttribute('t-group'),
            grouped:   groupOrder(cell) !== null,
            order:     groupOrder(cell),
            split:     cell.getAttribute('t-split') || null,
            filter:    readFilter(cell),
            dir:       (dir === 'asc' || dir === 'desc') ? dir : 'none'
        };
    });

    const sortCol = meta.findIndex(m => m.dir !== 'none');
    const groups  = meta.map((m, i) => (m.grouped ? i : -1)).filter(i => i >= 0)
                        .sort((a, b) => (meta[a].order - meta[b].order) || (a - b));

    // ── 3. Filtern: Spaltenfilter + Freitextsuche ───────────────────────────
    const input  = table.querySelector('.tv-search-input');
    const query  = input ? input.value.trim().toLowerCase() : '';
    const tokens = query ? query.split(/\s+/) : [];

    const data = rows.map(tr => {
        let ok = true;
        for (let i = 0; i < meta.length && ok; i++) {
            if (meta[i].filter) ok = passes(tr, i, meta[i].type, meta[i].filter);
        }
        if (ok && tokens.length) {
            const text = tr.textContent.toLowerCase();
            ok = tokens.every(t => text.includes(t));
        }
        return { tr, idx: +tr.dataset.tvIdx, hidden: !ok };
    });

    // ── 4. Gruppierte Spalten ausblenden ────────────────────────────────────
    cells.forEach((cell, i) => cell.classList.toggle('tv-col-hidden', meta[i].grouped));
    rows.forEach(tr => [...tr.children].forEach((td, i) =>
        td.classList.toggle('tv-col-hidden', !!meta[i]?.grouped)));

    const visibleCols = cells.filter((c, i) => !meta[i].grouped).length || 1;

    // ── 5. Gruppenbaum bauen, Ketten falten, sortieren ──────────────────────
    const root = { children: collapseChains(buildTree(data, groups, 0, '', meta)) };
    sortTree(root, sortCol, sortCol >= 0 ? meta[sortCol].dir : 'none', meta);

    // Startzustand: t-open="2" heißt "die ersten zwei Ebenen offen". Wird beim
    // ersten Render in die Pfadliste übersetzt und danach normal weitergepflegt.
    const level = autoOpenLevel(table);
    if (level !== null && groups.length) setOpenPaths(table, pathsToDepth(root, level));

    // Bei jeder geänderten Sucheingabe alles aufklappen was Treffer enthält.
    // Das wandert in den gespeicherten Zustand, der Nutzer kann also direkt
    // danach wieder zuklappen; beim nächsten Tastendruck geht es erneut auf.
    if (tokens.length && lastQuery.get(table) !== query) {
        const open = openPaths(table);
        walkTree(root, n => { if (n.visible > 0) open.add(n.path); });
        setOpenPaths(table, open);
    }
    lastQuery.set(table, query);

    const open = openPaths(table);

    // ── 6. Ausgeben ─────────────────────────────────────────────────────────
    const frag = document.createDocumentFragment();
    flatten(root, frag, {
        open, visibleCols, meta, used: new Set(), hidden: false, path: '', depth: 0,
        aggCols: meta.map((m, i) => (m.aggs.length ? i : -1)).filter(i => i >= 0)
    });
    box.appendChild(frag);

    // "Keine Treffer" heißt: es gibt Zeilen, aber keine davon ist sichtbar.
    // Eine Tabelle ganz ohne Datenzeilen bekommt keine Meldung – sonst stünde
    // sie dauerhaft da, auch wenn nie gesucht wurde.
    const anyVisible = data.some(d => !d.hidden);
    if (rows.length && !anyVisible) {
        const tr = document.createElement('tr');
        tr.className = 'tv-empty-row';
        tr.innerHTML = `<td colspan="${visibleCols}" class="tv-empty">Keine Treffer</td>`;
        box.appendChild(tr);
    }

    // ── 7. Zusammenfassungszeile (t-sum / t-mean / t-min / t-max) ───────────
    const sumRow = buildSummaryRow(meta, data);
    if (sumRow) {
        sumRow.classList.toggle('tv-hidden', !anyVisible);
        if (summarizePos(table) === 'top') {
            (table.querySelector('.tv-search-row') || table.querySelector('tr')).after(sumRow);
        } else {
            box.appendChild(sumRow);
        }
    }

    // ── 8. Kopfzeile, Popovers und Suchfeld aktualisieren ───────────────────
    meta.forEach((m, i) => {
        const s = m.cell.querySelector('.tv-ico-sort');
        if (s) {
            s.dataset.tvIco = m.dir === 'asc' ? 'asc' : m.dir === 'desc' ? 'desc' : 'sort';
            s.classList.toggle('tv-ico-active', m.dir !== 'none');
        }
        const g = m.cell.querySelector('.tv-ico-group');
        if (g) g.classList.toggle('tv-ico-active', m.grouped);
        if (m.cell.hasAttribute('t-filter')) syncPopover(table, i, m.type, m.filter);
    });

    const searchRow = table.querySelector('.tv-search-row');
    if (searchRow) {
        searchRow.classList.toggle('tv-hidden', rows.length <= MIN_ROWS_SEARCH && !query);
        searchRow.querySelector('th').colSpan = visibleCols;
        searchRow.querySelector('.tv-search-clear')?.classList.toggle('tv-hidden', !query);
    }

    // ── 9. Suchtokens in den sichtbaren Zeilen markieren ────────────────────
    if (tokens.length && table.getAttribute('t-highlight') !== 'false') {
        const rx = new RegExp(tokens.map(rxEsc).join('|'), 'gi');
        table.querySelectorAll('tr').forEach(tr => {
            if (tr.classList.contains('tv-hidden') ||
                tr.classList.contains('tv-search-row') ||
                tr.classList.contains('tv-summary-row') ||
                tr === cells[0]?.parentNode) return;
            markTokens(tr, rx);
        });
    }

    syncViewBar(table);
    paintIcons(table);

    if (groups.length) {
        table.dispatchEvent(new CustomEvent('tableview:groups-rendered', {
            bubbles: true,
            detail: { table, groupedColumns: groups, actionBoxes: [...table.querySelectorAll('.tv-group-actions')] }
        }));
    }
}

/* ══════════════════════════════════════════════════════════════════════════
   Zusammenfassung: t-sum / t-mean / t-min / t-max
   ══════════════════════════════════════════════════════════════════════════ */

/** Position der Summenzeile – "bottom" (Default) oder "top". */
function summarizePos(table) {
    const raw = (table.getAttribute('t-summarize') || '').trim().toLowerCase();
    if (!raw) return 'bottom';
    if (raw === 'top'    || raw === 'oben')  return 'top';
    if (raw === 'bottom' || raw === 'unten') return 'bottom';
    if (!table.dataset.tvSumWarned) {
        table.dataset.tvSumWarned = '1';
        console.warn(`[tableView] t-summarize="${raw}" ist unbekannt – erlaubt sind `
            + `"bottom" (Default) und "top".`);
    }
    return 'bottom';
}

/** Numerische Werte einer Spalte über die übergebenen Zeilen einsammeln. */
function aggValues(trs, col, type) {
    const out = [];
    trs.forEach(tr => {
        const td = tr.children[col];
        if (!td) return;
        const attr = td.getAttribute('t-value');
        const n = attr !== null && attr !== '' ? parseFloat(attr) : toNumber(cellValue(tr, col), type);
        if (n !== null && Number.isFinite(n)) out.push(n);
    });
    return out;
}

function fmtAgg(n, type) {
    if (n === null) return '–';
    return type === 'date' ? new Date(n).toLocaleDateString('de-DE') : NUM_FMT.format(n);
}

/**
 * Baut die Zusammenfassungszeile – oder null, wenn keine Spalte ein Aggregat
 * verlangt. Gerechnet wird ausschließlich über die aktuell sichtbaren Zeilen
 * (Spaltenfilter + Suche), Klone bei Multi-Group zählen nicht doppelt.
 */
function buildSummaryRow(meta, data) {
    if (!meta.some(m => m.aggs.length)) return null;

    const trs = data.filter(d => !d.hidden).map(d => d.tr);
    const tr  = document.createElement('tr');
    tr.className = 'tv-summary-row';

    meta.forEach((m, i) => {
        const td = document.createElement('td');
        td.classList.toggle('tv-col-hidden', m.grouped);

        if (m.aggs.length) {
            const v   = aggValues(trs, i, m.type);
            const sum = v.reduce((s, x) => s + x, 0);
            const of  = { sum, mean: sum / v.length, min: Math.min(...v), max: Math.max(...v) };

            td.innerHTML = `<div class="tv-sum-box">` + m.aggs.map(a => `
                <span class="tv-sum-item" data-agg="${a.key}">
                    ${a.label ? `<small class="tv-sum-label">${esc(a.label)}</small>` : ''}
                    <span class="tv-sum-value">${esc(fmtAgg(v.length ? of[a.key] : null, m.type))}</span>
                </span>`).join('') + `</div>`;
        }
        tr.appendChild(td);
    });

    return tr;
}

/* ══════════════════════════════════════════════════════════════════════════
   Treffer-Markierung der Suchtokens
   ══════════════════════════════════════════════════════════════════════════ */

/** Alle <mark class="tv-hit"> wieder auflösen – der Text bleibt unverändert. */
function clearMarks(root) {
    root.querySelectorAll('mark.tv-hit').forEach(mk => {
        const parent = mk.parentNode;
        parent.replaceChild(document.createTextNode(mk.textContent), mk);
        parent.normalize();
    });
}

const rxEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Markiert alle Tokens in den Textknoten unterhalb von root.
 * Eingabefelder, bestehende Marks und die Icon-Leisten bleiben außen vor.
 */
function markTokens(root, rx) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            const p = node.parentElement;
            if (!p || p.closest('input, textarea, mark, .tv-icons, .tv-glyph, .tv-count')) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    const hits = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        rx.lastIndex = 0;
        if (rx.test(n.nodeValue)) hits.push(n);
    }

    hits.forEach(node => {
        const text = node.nodeValue;
        const frag = document.createDocumentFragment();
        let last = 0;
        rx.lastIndex = 0;
        for (let m; (m = rx.exec(text)) !== null;) {
            if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            const mk = document.createElement('mark');
            mk.className = 'tv-hit';
            mk.textContent = m[0];
            frag.appendChild(mk);
            last = m.index + m[0].length;
            if (m[0] === '') rx.lastIndex++;            // Endlosschleife vermeiden
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
    });
}

/* ══════════════════════════════════════════════════════════════════════════
   Auf-/Zuklappen: Startzustand, Ebenen-Steuerung, Rundung
   ══════════════════════════════════════════════════════════════════════════ */

/** t-open="2" → Zahl; t-open='["…"]' → null (normale Pfadliste). */
function autoOpenLevel(table) {
    const raw = (table.getAttribute('t-open') || '').trim();
    return /^\d+$/.test(raw) ? +raw : null;
}

function walkTree(node, fn) {
    (node.children || []).forEach(c => {
        if (c.leaf) return;
        fn(c);
        walkTree(c, fn);
    });
}

/** Alle Gruppenpfade oberhalb einer Ebene – Basis für "die ersten n offen". */
function pathsToDepth(root, level) {
    const out = new Set();
    walkTree(root, n => { if (n.depth < level) out.add(n.path); });
    return out;
}

/**
 * Bis zur Ebene `level` aufklappen: 0 = alles zu, 1 = nur oberste Ebene offen,
 * Infinity = alles auf. Arbeitet auf den gerenderten Gruppenzeilen, die auch
 * im zugeklappten Zustand im DOM stehen.
 */
export function expandTo(table, level) {
    const open = new Set();
    table.querySelectorAll('.tv-group-row').forEach(tr => {
        if (+tr.dataset.depth < level) open.add(tr.dataset.groupPath);
    });
    setOpenPaths(table, open);
    renderTable(table);
}

export const collapseAll = table => expandTo(table, 0);
export const expandAll   = table => expandTo(table, Infinity);

/** Eine Gruppe samt allem darunter auf- oder zuklappen (Shift-Klick). */
export function toggleBranch(table, path, want) {
    const open = openPaths(table);
    const on   = want === undefined ? !open.has(path) : !!want;
    table.querySelectorAll('.tv-group-row').forEach(tr => {
        const p = tr.dataset.groupPath;
        if (p === path || p.startsWith(path + SEP)) on ? open.add(p) : open.delete(p);
    });
    setOpenPaths(table, open);
    renderTable(table);
}

function buildTree(data, groups, depth, parentPath, meta) {
    if (depth >= groups.length) {
        return [{ leaf: true, rows: data, visible: data.filter(d => !d.hidden).length }];
    }

    const col   = groups[depth];
    const split = meta[col].split;
    const map   = new Map();

    // Multi-Value: die Spalte wird Zeile für Zeile am Trennzeichen zerlegt und
    // daraus eine Uniq-Liste aller vorkommenden Werte gebaut. Eine Zeile landet
    // in jeder Gruppe, in die sie gehört – gerendert wird sie dort als Klon,
    // der auf die echte Zeile zeigt (siehe makeClone/originalOf).
    data.forEach(d => {
        const raw  = cellValue(d.tr, col);
        const keys = split
            ? [...new Set(raw.split(split).map(p => p.trim()).filter(Boolean))]
            : [raw];
        (keys.length ? keys : ['']).forEach(k => {
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(d);
        });
    });

    const out = [];
    map.forEach((sub, key) => {
        const path     = parentPath ? `${parentPath}${SEP}${col}:${key}` : `${col}:${key}`;
        const children = buildTree(sub, groups, depth + 1, path, meta);
        out.push({
            leaf: false, depth, path,
            // trail = Kette aus [Spalte, Wert]; bei zusammengefalteten
            // Einzelkind-Ketten stehen hier mehrere Einträge.
            trail:   [{ col, key }],
            count:   sub.length,
            visible: children.reduce((s, c) => s + (c.visible || 0), 0),
            rows:    uniqueRows(children),
            children
        });
    });
    return out;
}

/** Alle Datenzeilen unterhalb eines Knotens, jede genau einmal. */
function uniqueRows(children) {
    const seen = new Set();
    const out  = [];
    children.forEach(c => (c.leaf ? c.rows : c.rows).forEach(d => {
        if (seen.has(d.tr)) return;
        seen.add(d.tr);
        out.push(d);
    }));
    return out;
}

/**
 * Einzelkind-Ketten zusammenfalten: hat eine Gruppe genau ein Unterkind das
 * selbst eine Gruppe ist, werden beide zu einer Zeile mit Pfad-Darstellung
 * ("Obst › 2025 › Q1"). Spart bei schiefen Daten sehr viele Balken.
 * Der Knoten behält den Pfad des tiefsten Glieds – auf/zu klappt die Kette
 * damit als Ganzes.
 */
function collapseChains(nodes) {
    nodes.forEach(node => {
        if (node.leaf) return;
        collapseChains(node.children);
        while (node.children.length === 1 && !node.children[0].leaf) {
            const child = node.children[0];
            node.trail    = [...node.trail, ...child.trail];
            node.path     = child.path;
            node.count    = child.count;
            node.visible  = child.visible;
            node.rows     = child.rows;
            node.children = child.children;
        }
    });
    return nodes;
}

function sortTree(node, sortCol, dir, meta) {
    if (node.leaf) {
        if (dir === 'none' || sortCol < 0) {
            node.rows.sort((a, b) => a.idx - b.idx);
        } else {
            const type = meta[sortCol].type;
            node.rows.sort((a, b) => {
                const r = compare(cellValue(a.tr, sortCol), cellValue(b.tr, sortCol), type);
                return dir === 'asc' ? r : -r;
            });
        }
        return;
    }

    if (node.children.length && !node.children[0].leaf) {
        const col  = node.children[0].trail[0].col;
        const desc = sortCol === col && dir === 'desc';
        node.children.sort((a, b) => {
            const r = compare(a.trail[0].key, b.trail[0].key, meta[col].type);
            return desc ? -r : r;
        });
    }
    node.children.forEach(c => sortTree(c, sortCol, dir, meta));
}

function compare(a, b, type) {
    if (type === 'date' || type === 'num') {
        const x = toNumber(a, type), y = toNumber(b, type);
        if (x === null && y === null) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        return x - y;
    }
    return String(a).localeCompare(String(b), 'de', { numeric: true, sensitivity: 'base' });
}

/* ══════════════════════════════════════════════════════════════════════════
   Klone bei Multi-Value-Gruppierung
   ──────────────────────────────────────────────────────────────────────────
   Eine Zeile die in mehreren Gruppen steckt wird mehrfach gezeichnet. Echt ist
   immer nur das erste Vorkommen; alle weiteren sind Klone die per
   data-tv-clone-of / data-tv-ref auf das Original zeigen. Klicks, Eingaben und
   Tastendrücke im Klon werden auf das Originalelement umgelenkt, IDs und
   name-Attribute trägt nur das Original.
   ══════════════════════════════════════════════════════════════════════════ */

/** Jedem Element der Zeile einen stabilen Index geben (Basis der Zuordnung). */
function tagRefs(tr) {
    [...tr.querySelectorAll('*')].forEach((el, i) => {
        if (el.dataset.tvRef !== String(i)) el.dataset.tvRef = i;
    });
}

/** Live-Zustand der Formularfelder übertragen (cloneNode kopiert den nicht). */
function copyLiveState(from, to) {
    const src = from.querySelectorAll('input, textarea, select');
    const dst = to.querySelectorAll('input, textarea, select');
    src.forEach((el, i) => {
        const t = dst[i];
        if (!t) return;
        if (el.type === 'checkbox' || el.type === 'radio') t.checked = el.checked;
        else if (el.tagName === 'SELECT') t.selectedIndex = el.selectedIndex;
        else t.value = el.value;
    });
}

function makeClone(orig) {
    const clone = orig.cloneNode(true);
    clone.classList.add('tv-clone');
    clone.removeAttribute('id');
    clone.dataset.tvCloneOf = orig.dataset.tvIdx;

    // IDs und name bleiben dem Original vorbehalten – getElementById,
    // querySelector('#x') und Radio-Gruppen treffen damit immer das Echte.
    clone.querySelectorAll('[id]').forEach(el => {
        el.dataset.tvId = el.id;
        el.removeAttribute('id');
    });
    clone.querySelectorAll('[name]').forEach(el => {
        el.dataset.tvName = el.getAttribute('name');
        el.removeAttribute('name');
    });

    copyLiveState(orig, clone);
    return clone;
}

/** Zu einem Element im Klon das entsprechende Element im Original finden. */
function originalOf(el) {
    const clone = el.closest?.('.tv-clone');
    if (!clone) return null;
    const table = clone.closest('table.tv-enabled');
    const row   = table?.querySelector(
        `tr[data-tv-idx="${clone.dataset.tvCloneOf}"]:not(.tv-clone)`);
    if (!row) return null;
    if (el === clone) return row;
    const ref = el.dataset?.tvRef;
    return ref === undefined ? null : row.querySelector(`[data-tv-ref="${ref}"]`);
}

/** Zustand des Originals auf alle seine Klone spiegeln. */
function syncClones(row, skip) {
    row.closest('table')
       ?.querySelectorAll(`tr.tv-clone[data-tv-clone-of="${row.dataset.tvIdx}"]`)
       .forEach(c => { if (!skip || !c.contains(skip)) copyLiveState(row, c); });
}

/* ══════════════════════════════════════════════════════════════════════════
   flatten – Baum → Zeilenfolge
   ══════════════════════════════════════════════════════════════════════════ */

function flatten(node, frag, ctx) {
    // ── Blatt: die Datenzeilen selbst (bei Multi-Group als Klon) ────────────
    if (node.leaf) {
        node.rows.forEach(d => {
            let tr = d.tr;
            if (ctx.used.has(d.tr)) {
                tr = makeClone(d.tr);
            } else {
                ctx.used.add(d.tr);
                tagRefs(d.tr);
            }
            if (ctx.path) {
                tr.dataset.groupPath = ctx.path;
                tr.classList.add('tv-in-group');
                tr.style.setProperty('--tv-d', ctx.depth);
            } else {
                delete tr.dataset.groupPath;
                tr.classList.remove('tv-in-group');
                tr.style.removeProperty('--tv-d');
            }
            tr.classList.toggle('tv-hidden', ctx.hidden || d.hidden);
            frag.appendChild(tr);
        });
        return;
    }

    // ── Wurzel hat keinen eigenen Kopf ──────────────────────────────────────
    if (node.path === undefined) {
        node.children.forEach(c => flatten(c, frag, ctx));
        return;
    }

    // ── Gruppenkopf ─────────────────────────────────────────────────────────
    const collapsed = !ctx.open.has(node.path);
    // Unten gerade nur wenn direkt Datenzeilen anschließen. Stecken im
    // aufgeklappten Zustand nur weitere Gruppen drin, bleibt der Balken rund.
    const flatBottom = !collapsed && node.children[0]?.leaf;

    const tr = document.createElement('tr');
    tr.className = 'tv-group-row'
        + (collapsed ? ' tv-group-collapsed' : '')
        + (flatBottom ? ' tv-flat-bottom' : '');
    tr.dataset.groupPath = node.path;
    tr.dataset.depth     = node.depth;
    tr.style.setProperty('--tv-d', node.depth);
    tr.classList.toggle('tv-hidden', ctx.hidden || node.visible === 0);

    const last  = node.trail[node.trail.length - 1];
    const cols  = node.trail.map(t => t.col);
    const count = node.visible !== node.count ? `${node.visible}/${node.count}` : node.count;

    // Zweig-Schalter nur wenn es überhaupt Untergruppen gibt.
    const sub      = branchPaths(node).slice(1);
    const deepOpen = sub.length > 0 && sub.every(p => ctx.open.has(p));

    // Spaltenname klein über dem Wert; bei zusammengefalteten Ketten
    // mehrere Glieder mit "›" dazwischen.
    const names = node.trail.map(t => `
        <span class="tv-group-name">
            <small class="tv-group-label">${esc(colName(ctx.meta[t.col].cell) || `Spalte ${t.col}`)}</small>
            <span class="tv-group-value">${esc(t.key || '—')}</span>
        </span>`).join('<span class="tv-group-sep" aria-hidden="true">›</span>');

    const td   = document.createElement('td');
    td.colSpan = ctx.visibleCols;
    td.innerHTML = `
        <div class="tv-group-content">
            <span class="tv-glyph tv-expand" data-tv-ico="${collapsed ? 'closed' : 'open'}"
                  title="${collapsed ? 'Aufklappen' : 'Zuklappen'}"></span>
            <span class="tv-group-trail">${names}</span>
            ${groupSums(node, ctx)}
            <span class="tv-group-spacer"></span>
            <span class="tv-glyph tv-deep${sub.length ? '' : ' tv-deep-off'}"
                  ${sub.length ? `data-tv-ico="${deepOpen ? 'deepClosed' : 'deepOpen'}"
                  data-open="${deepOpen ? '1' : '0'}"
                  title="${deepOpen ? 'Alle Unterebenen zuklappen' : 'Alle Unterebenen aufklappen'}"`
                               : 'aria-hidden="true"'}></span>
            <span class="tv-count">${count}</span>
            <div class="tv-group-actions" data-group-path="${esc(node.path)}" data-col="${last.col}"
                 data-cols="${cols.join(',')}" data-col-name="${esc(colName(ctx.meta[last.col].cell))}"></div>
            <span class="tv-glyph tv-ungroup" data-cols="${cols.join(',')}" data-tv-ico="remove"
                  title="Gruppierung aufheben"></span>
        </div>`;
    tr.appendChild(td);
    frag.appendChild(tr);

    node.children.forEach(c => flatten(c, frag, {
        ...ctx,
        hidden: ctx.hidden || collapsed,
        path:   node.path,
        depth:  node.depth + node.trail.length
    }));
}

/** Pfad des Knotens plus aller Untergruppen. */
function branchPaths(node, out = []) {
    out.push(node.path);
    node.children.forEach(c => { if (!c.leaf) branchPaths(c, out); });
    return out;
}

/** Zwischensummen einer Gruppe – kompakt im Kopf statt als eigene Zeile. */
function groupSums(node, ctx) {
    if (!ctx.aggCols.length) return '';
    const trs = node.rows.filter(d => !d.hidden).map(d => d.tr);

    const parts = ctx.aggCols.map(i => {
        const m   = ctx.meta[i];
        const v   = aggValues(trs, i, m.type);
        const sum = v.reduce((s, x) => s + x, 0);
        const of  = { sum, mean: sum / v.length, min: Math.min(...v), max: Math.max(...v) };
        const pre = ctx.aggCols.length > 1 ? `${esc(colName(m.cell))} ` : '';

        return m.aggs.map(a => `
            <span class="tv-group-sum" data-agg="${a.key}" data-col="${i}">
                ${a.label || pre ? `<small>${pre}${esc(a.label)}</small>` : ''}
                <span>${esc(fmtAgg(v.length ? of[a.key] : null, m.type))}</span>
            </span>`).join('');
    }).join('');

    return `<span class="tv-group-sums">${parts}</span>`;
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
}

/* ══════════════════════════════════════════════════════════════════════════
   Events (Delegation – gilt auch für später eingefügte Tabellen)
   ══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
   Gespeicherte Ansichten
   ──────────────────────────────────────────────────────────────────────────
   Gesichert wird nur, wonach sortiert und gruppiert wird – inklusive der
   Gruppierungsreihenfolge. Welche Gruppe gerade offen ist, gehört bewusst
   nicht dazu: das ist Arbeitszustand, keine Ansicht.

   Nichts davon passiert automatisch. Erst wenn der Nutzer speichert, landet
   die Ansicht im localStorage und (sofern nicht per ?viewurl=false
   abgeschaltet) in der URL, womit sie teilbar wird.
   ══════════════════════════════════════════════════════════════════════════ */

const viewDefaults = new WeakMap();   // Stand aus dem HTML
const viewSaved    = new WeakMap();   // zuletzt gespeicherte Ansicht

/** Kurzer, stabiler Hash über einen String. */
function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}

/**
 * Schlüssel einer Tabelle – ohne jedes Zutun. Bevorzugt die id, sonst ein Hash
 * über die Spaltenüberschriften (übersteht das Umsortieren von Tabellen auf der
 * Seite), sonst die Position im Dokument. t-view="name" überschreibt das, falls
 * man den Schlüssel doch selbst in der Hand haben will.
 */
function viewKey(table) {
    const own = table.getAttribute('t-view');
    if (own) return own;
    // Die id die tableView sich selbst für die Popovers vergibt ist nur ein
    // Zähler – als Schlüssel taugt sie nicht.
    if (table.id && !/^tv-table-\d+$/.test(table.id)) return table.id;

    const names = headCells(table).map(c => colName(c)).filter(Boolean).join('|');
    if (names) return `h${hash(names)}`;

    return `n${[...document.querySelectorAll('table')].indexOf(table)}`;
}

// Pro Seite getrennt – dieselbe Tabelle auf einer anderen Route ist eine andere.
const storeKey = key => `tableview:${location.pathname}:${key}`;
const urlParam = key => `tv-${key}`;

/** Aktuelle Ansicht als schlankes Objekt. Spalten als Index – ändert sich der
 *  Tabellenaufbau, baut der Nutzer sich die Ansicht ohnehin neu. */
function currentView(table) {
    const cells = headCells(table);
    let sort = null;

    cells.forEach((c, i) => {
        const dir = c.getAttribute('t-sort');
        if (dir === 'asc' || dir === 'desc') sort = { c: i, d: dir };
    });

    const groups = cells
        .map((c, i) => ({ i, o: groupOrder(c) }))
        .filter(x => x.o !== null)
        .sort((a, b) => a.o - b.o)
        .map(x => x.i);

    return { v: 1, s: sort, g: groups };
}

function applyView(table, view) {
    const cells = headCells(table);

    cells.forEach(c => {
        if (c.hasAttribute('t-sort'))  c.setAttribute('t-sort', '');
        if (c.hasAttribute('t-group')) c.setAttribute('t-group', '');
    });

    if (view?.s && cells[view.s.c]?.hasAttribute('t-sort')) {
        cells[view.s.c].setAttribute('t-sort', view.s.d);
    }
    (view?.g || []).forEach((col, n) => {
        if (cells[col]?.hasAttribute('t-group')) cells[col].setAttribute('t-group', `active:${n}`);
    });
}

function readStore(key) {
    try {
        const raw = localStorage.getItem(storeKey(key));
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function readUrlView(key) {
    try {
        const raw = new URL(location.href).searchParams.get(urlParam(key));
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function writeUrlView(key, view) {
    if (!VIEW_URL) return;
    try {
        const u = new URL(location.href);
        view ? u.searchParams.set(urlParam(key), JSON.stringify(view))
             : u.searchParams.delete(urlParam(key));
        history.replaceState(null, '', u);
    } catch { /* z.B. file:// */ }
}

/** Gespeicherte Ansicht anwenden. URL schlägt localStorage – ein geteilter
 *  Link zeigt also immer das, was der Absender gemeint hat. */
export function loadView(table, render = true) {
    const key  = viewKey(table);
    const view = readUrlView(key) || readStore(key);
    viewSaved.set(table, view || null);
    if (!view) return false;

    applyView(table, view);
    table.removeAttribute('t-open');
    if (render) renderTable(table);
    return true;
}

/** Aktuelle Sortierung und Gruppierung sichern – nur auf Zuruf des Nutzers. */
export function saveView(table) {
    const key  = viewKey(table);
    const view = currentView(table);
    try { localStorage.setItem(storeKey(key), JSON.stringify(view)); } catch { /* voll/privat */ }
    writeUrlView(key, view);
    viewSaved.set(table, view);
    syncViewBar(table);
    paintIcons(table);
    table.dispatchEvent(new CustomEvent('tableview:view-saved', {
        detail: { key, view }, bubbles: true
    }));
    return view;
}

/** Zurück auf den Stand aus dem HTML. Löscht auch das Gespeicherte. */
export function resetView(table) {
    const key = viewKey(table);
    try { localStorage.removeItem(storeKey(key)); } catch { /* egal */ }
    writeUrlView(key, null);
    viewSaved.set(table, null);
    applyView(table, viewDefaults.get(table) || { v: 1, s: null, g: [] });
    table.removeAttribute('t-open');
    renderTable(table);
    table.dispatchEvent(new CustomEvent('tableview:view-reset', {
        detail: { key }, bubbles: true
    }));
}

/** Teilbarer Link auf die aktuelle Ansicht, ohne sie lokal zu speichern. */
export function shareUrl(table) {
    const key = viewKey(table);
    const u   = new URL(location.href);
    u.searchParams.set(urlParam(key), JSON.stringify(currentView(table)));
    return u.toString();
}

/**
 * Platz für die Knöpfe finden. Hat die Tabelle schon ein <caption>, hängen sie
 * rechtsbündig da hinein – eine Tabelle darf nur eine Beschriftung haben.
 * Sonst legt tableView selbst eines an, das als eigene Zeile über der
 * Titelzeile rendert.
 */
function viewBarHost(table, create) {
    const own = table.querySelector(':scope > caption.tv-viewbar');
    if (own) return own;

    const caption = table.querySelector(':scope > caption');
    if (caption) {
        const inner = caption.querySelector(':scope > .tv-viewbar');
        if (inner || !create) return inner;
        const span = document.createElement('span');
        span.className = 'tv-viewbar tv-viewbar-inline';
        caption.append(span);
        return span;
    }

    if (!create) return null;
    const cap = document.createElement('caption');
    cap.className = 'tv-viewbar';
    table.prepend(cap);
    return cap;
}

const sameView = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Knopfleiste für gespeicherte Ansichten.
 *
 *   Zurücksetzen erscheint, sobald die Ansicht vom Stand aus dem HTML abweicht.
 *   Speichern erscheint, sobald sie von der zuletzt gespeicherten abweicht
 *   (ist noch nichts gespeichert, gilt der HTML-Stand als Vergleich).
 */
function syncViewBar(table) {
    const now      = currentView(table);
    const original = viewDefaults.get(table);
    const stored   = viewSaved.get(table);

    const showReset = !sameView(now, original);
    const showSave  = !sameView(now, stored ?? original);

    if (!showReset && !showSave) {
        viewBarHost(table, false)?.remove();
        return;
    }

    const bar = viewBarHost(table, true);
    if (!bar) return;

    if (!bar.children.length) {
        bar.innerHTML =
            `<button type="button" class="tv-glyph tv-view-btn" t-view-save
                     data-tv-ico="viewSave" title="Ansicht merken"></button>`
          + `<button type="button" class="tv-glyph tv-view-btn" t-view-reset
                     data-tv-ico="viewReset" title="Ansicht zurücksetzen"></button>`;
    }

    bar.querySelector('[t-view-save]').classList.toggle('tv-hidden', !showSave);
    bar.querySelector('[t-view-reset]').classList.toggle('tv-hidden', !showReset);
}

/**
 * Tabelle zu einem Knopf finden. Mit Wert: die Tabelle mit dieser id bzw.
 * diesem t-view. Ohne Wert: die umgebende Tabelle, sonst – wenn es nur eine
 * gibt – eben die.
 */
function tableForButton(btn, name) {
    if (name) {
        return document.querySelector(`table.tv-enabled[t-view="${CSS.escape(name)}"]`)
            || document.getElementById(name)
            || null;
    }
    const inside = btn.closest('table.tv-enabled');
    if (inside) return inside;

    const all = document.querySelectorAll('table.tv-enabled');
    return all.length === 1 ? all[0] : null;
}

document.addEventListener('click', e => {
    // ── Knöpfe für gespeicherte Ansichten (dürfen überall im Dokument sein) ──
    const viewBtn = e.target.closest('[t-view-save], [t-view-reset], [t-view-share]');
    if (viewBtn) {
        const kind = ['save', 'reset', 'share'].find(k => viewBtn.hasAttribute(`t-view-${k}`));
        const table = tableForButton(viewBtn, viewBtn.getAttribute(`t-view-${kind}`));
        if (!table) return;
        if (kind === 'save')  saveView(table);
        if (kind === 'reset') resetView(table);
        if (kind === 'share') navigator.clipboard?.writeText(shareUrl(table));
        return;
    }


    // ── Filter löschen (im Popover) ─────────────────────────────────────────
    const clear = e.target.closest('.tv-pop-clear');
    if (clear) {
        const pop = clear.closest('.tv-pop');
        const table = document.getElementById(pop.dataset.tvFor);
        if (table) filterTable(table, +pop.dataset.col, null);
        pop.hidePopover?.();
        return;
    }
    if (e.target.closest('.tv-pop')) return;

    // ── Suchfeld leeren ─────────────────────────────────────────────────────
    const searchClear = e.target.closest('.tv-search-clear');
    if (searchClear) {
        const table = searchClear.closest('table');
        const inp = table?.querySelector('.tv-search-input');
        if (inp) { inp.value = ''; renderTable(table); }
        return;
    }

    const table = e.target.closest('table.tv-enabled');
    if (!table) return;

    const group   = e.target.closest('.tv-ico-group');
    const ungroup = e.target.closest('.tv-ungroup');
    const deep    = e.target.closest('.tv-deep[data-open]');
    const expand  = e.target.closest('.tv-group-content');
    const filter  = e.target.closest('.tv-ico-filter');
    const sortIco = e.target.closest('.tv-ico-sort');
    const head    = e.target.closest('[t-sort]');

    if (filter) return;                                  // Popover öffnet per HTML-Attribut

    if (group) {
        e.stopPropagation();
        groupTable(table, +group.dataset.col);
    } else if (ungroup) {
        // Bei zusammengefalteten Ketten hängen mehrere Spalten an einem Balken.
        e.stopPropagation();
        const cols = (ungroup.dataset.cols || '').split(',').filter(Boolean).map(Number);
        cols.forEach(c => {
            const cell = headCells(table)[c];
            if (cell?.hasAttribute('t-group')) cell.setAttribute('t-group', '');
        });
        renderTable(table);
    } else if (deep) {
        // ── Gruppe samt allen Unterebenen auf-/zuklappen ────────────────────
        e.stopPropagation();
        const path = deep.closest('tr')?.dataset.groupPath;
        if (path) toggleBranch(table, path, deep.dataset.open !== '1');
    } else if (expand) {
        // ── Gruppe auf-/zuklappen (Zustand als t-open am <table>) ───────────
        const path = expand.closest('tr')?.dataset.groupPath;
        if (!path) return;
        if (e.shiftKey) { toggleBranch(table, path); return; }   // samt Unterbau
        const open = openPaths(table);
        open.has(path) ? open.delete(path) : open.add(path);
        setOpenPaths(table, open);
        renderTable(table);
    } else if (sortIco || head) {
        const cell = head || sortIco.closest('th, td');
        const cur  = cell.getAttribute('t-sort');
        sortTable(table, +cell.dataset.tvCol, cur === 'asc' ? 'desc' : cur === 'desc' ? 'none' : 'asc');
    }
});

/* ══════════════════════════════════════════════════════════════════════════
   Klon-Brücke: Interaktion im Klon auf das Original umlenken
   ══════════════════════════════════════════════════════════════════════════ */

let bridging = false;

function bridge(e) {
    if (bridging) return;
    if (!e.target?.closest?.('.tv-clone')) return;
    // tableViews eigene Bedienelemente bleiben lokal.
    if (e.target.closest('.tv-ico, .tv-expand, .tv-deep, .tv-ungroup, .tv-group-content')) return;

    const orig = originalOf(e.target);
    if (!orig) return;

    // Der Klon selbst löst nichts aus – gefeuert wird auf dem Original, damit
    // Handler genau einmal und mit dem echten Element als target laufen.
    e.stopPropagation();

    bridging = true;
    try {
        if (e.type === 'click') {
            e.preventDefault();
            orig.click();
        } else if (e.type === 'keydown' || e.type === 'keyup') {
            orig.dispatchEvent(new KeyboardEvent(e.type, {
                key: e.key, code: e.code, bubbles: true,
                ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey
            }));
        } else {
            if (orig.type === 'checkbox' || orig.type === 'radio') orig.checked = e.target.checked;
            else if ('value' in orig) orig.value = e.target.value;
            orig.dispatchEvent(new Event(e.type, { bubbles: true }));
        }
    } finally {
        bridging = false;
    }

    const row = orig.closest('tr');
    if (row) syncClones(row, e.target);
}

['click', 'input', 'change', 'keydown', 'keyup'].forEach(t =>
    document.addEventListener(t, bridge, true));

let inputTimer;
document.addEventListener('input', e => {
    const inp = e.target.closest('.tv-pop-input, .tv-search-input');
    if (!inp) return;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
        // ── Suche ───────────────────────────────────────────────────────────
        if (inp.classList.contains('tv-search-input')) {
            const table = inp.closest('table');
            if (table) renderTable(table);
            return;
        }
        // ── Filter: alle Felder des Popovers einsammeln ─────────────────────
        const pop = inp.closest('.tv-pop');
        const table = document.getElementById(pop.dataset.tvFor);
        if (!table) return;
        const filter = {};
        pop.querySelectorAll('.tv-pop-input').forEach(f => {
            if (f.value !== '') filter[f.dataset.tvOp] = f.value;
        });
        filterTable(table, +pop.dataset.col, filter);
    }, 180);
});

/* ══════════════════════════════════════════════════════════════════════════
   Beobachter: neue Tabellen + externe Änderungen an bestehenden
   ══════════════════════════════════════════════════════════════════════════ */

function observe(table) {
    let timer;
    const obs = new MutationObserver(() => {
        if (busy.has(table)) return;
        clearTimeout(timer);
        timer = setTimeout(() => renderTable(table), 30);
    });
    obs.observe(table, { childList: true, subtree: true, characterData: true });
    observers.set(table, obs);
}

let domObserver = null;

/**
 * Autoerkennung anschalten: bestehende Tabellen initialisieren und neu
 * eingefügte per MutationObserver nachziehen. Läuft beim Import automatisch,
 * außer die Import-URL enthält ?autodetect=false.
 */
export function startAutodetect(scope) {
    if (!domObserver) {
        domObserver = new MutationObserver(list => {
            for (const m of list) {
                m.addedNodes.forEach(n => {
                    if (n.nodeType !== Node.ELEMENT_NODE) return;
                    if (n instanceof HTMLTableElement) init(n);
                    else n.querySelectorAll?.('table').forEach(init);
                });
            }
        });
        domObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
    prepareTables(scope);
}

function injectCss() {
    const url = new URL('./tableview.css', import.meta.url);
    if (document.querySelector(`link[href="${url.href}"]`)) return;
    document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="${url.href}">`);
}

if (AUTODETECT) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => startAutodetect());
    } else {
        startAutodetect();
    }
}