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
 *   renderTable(table)                Pipeline neu ausführen
 *   checkType(table, col)             → { type, values }  (+ schreibt t-value/t-type)
 *   sortTable(table, col, dir)        dir: 'asc' | 'desc' | 'none'
 *   groupTable(table, col, active)    active: true | false | undefined(=toggle)
 *   filterTable(table, col, filter)   filter: Objekt oder null (löschen)
 */

const SEP = '\x1f';
const MIN_ROWS_SEARCH = 7;

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

const ICO = {
    sort:   'unfold_more',
    asc:    'arrow_upward',
    desc:   'arrow_downward',
    group:  'workspaces',
    filter: 'filter_alt',
    clear:  'filter_alt_off',
    open:   'expand_more',
    closed: 'chevron_right',
    remove: 'close',
    search: 'search'
};

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

let uid = 0;
const busy = new WeakSet();
const observers = new WeakMap();

/* ══════════════════════════════════════════════════════════════════════════
   Zugriff auf die Tabelle – erste Zeile = Kopfzeile, Rest = Daten
   ══════════════════════════════════════════════════════════════════════════ */

/** Zellen der Kopfzeile (erste <tr> der Tabelle). */
function headCells(table) {
    const row = table.querySelector('tr');
    return row ? [...row.children].filter(c => c.matches('th, td')) : [];
}

/** Alle echten Datenzeilen (ohne Kopf-, Such-, Gruppen-, Klon- und Leerzeile). */
function dataRows(table) {
    const head = table.querySelector('tr');
    return [...table.querySelectorAll('tr')].filter(tr =>
        tr !== head &&
        !tr.classList.contains('tv-search-row') &&
        !tr.classList.contains('tv-group-row') &&
        !tr.classList.contains('tv-clone') &&
        !tr.classList.contains('tv-empty-row'));
}

/** Container, in den Datenzeilen gehängt werden (tbody bzw. table). */
function rowBox(table) {
    return dataRows(table)[0]?.parentNode || table.querySelector('tr')?.parentNode;
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
                `<span class="tv_msr tv-ico tv-ico-sort" data-col="${i}" title="Sortieren">${ICO.sort}</span>`);
            cell.style.cursor = 'pointer';
        }
        if (groupable) {
            icons.insertAdjacentHTML('beforeend',
                `<span class="tv_msr tv-ico tv-ico-group" data-col="${i}" title="Gruppieren">${ICO.group}</span>`);
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
                    <span class="tv_msr tv-search-icon">${ICO.search}</span>
                    <input type="text" class="tv-search-input" placeholder="Suchen ...">
                    <span class="tv_msr tv-search-clear">${ICO.remove}</span>
                </div>
            </th>`;
        head.after(tr);
    }

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

export function groupTable(table, col, active) {
    const cell = headCells(table)[col];
    if (!cell || !cell.hasAttribute('t-group')) return;
    const isActive = cell.getAttribute('t-group') === 'active';
    cell.setAttribute('t-group', (active === undefined ? !isActive : !!active) ? 'active' : '');
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
    btn.innerHTML = `<span class="tv_msr">${ICO.filter}</span><small class="tv-filter-sum"></small>`;

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
            <button type="button" class="tv-pop-clear tv_msr" title="Filter löschen">${ICO.clear}</button>
        </div>
        <div class="tv-pop-body"></div>`;
    document.body.appendChild(pop);

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
    table.querySelectorAll('.tv-group-row, .tv-clone, .tv-empty-row').forEach(tr => tr.remove());

    const rows = dataRows(table);
    rows.forEach((tr, i) => { if (tr.dataset.tvIdx === undefined) tr.dataset.tvIdx = i; });

    // ── 2. Spalten-Metadaten (Typ, Sortierung, Gruppierung, Filter) ─────────
    const meta = cells.map((cell, i) => {
        const used = cell.hasAttribute('t-sort') || cell.hasAttribute('t-group') || cell.hasAttribute('t-filter');
        const dir  = cell.getAttribute('t-sort');
        return {
            cell,
            type:      used ? checkType(table, i, rows).type : 'string',
            sortable:  cell.hasAttribute('t-sort'),
            groupable: cell.hasAttribute('t-group'),
            grouped:   cell.getAttribute('t-group') === 'active',
            split:     cell.getAttribute('t-split') || null,
            filter:    readFilter(cell),
            dir:       (dir === 'asc' || dir === 'desc') ? dir : 'none'
        };
    });

    const sortCol = meta.findIndex(m => m.dir !== 'none');
    const groups  = meta.map((m, i) => m.grouped ? i : -1).filter(i => i >= 0);

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

    // ── 5. Gruppenbaum bauen und sortieren ──────────────────────────────────
    const open = openPaths(table);
    const root = { children: buildTree(data, groups, 0, '', meta) };
    sortTree(root, sortCol, sortCol >= 0 ? meta[sortCol].dir : 'none', meta);

    // ── 6. Ausgeben ─────────────────────────────────────────────────────────
    const frag = document.createDocumentFragment();
    flatten(root, frag, { open, visibleCols, meta, used: new Set(), hidden: false, path: '' });
    box.appendChild(frag);

    if (!data.some(d => !d.hidden)) {
        const tr = document.createElement('tr');
        tr.className = 'tv-empty-row';
        tr.innerHTML = `<td colspan="${visibleCols}" class="tv-empty">Keine Treffer</td>`;
        box.appendChild(tr);
    }

    // ── 7. Kopfzeile, Popovers und Suchfeld aktualisieren ───────────────────
    meta.forEach((m, i) => {
        const s = m.cell.querySelector('.tv-ico-sort');
        if (s) {
            s.textContent = m.dir === 'asc' ? ICO.asc : m.dir === 'desc' ? ICO.desc : ICO.sort;
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

    if (groups.length) {
        table.dispatchEvent(new CustomEvent('tableview:groups-rendered', {
            bubbles: true,
            detail: { table, groupedColumns: groups, actionBoxes: [...table.querySelectorAll('.tv-group-actions')] }
        }));
    }
}

function buildTree(data, groups, depth, parentPath, meta) {
    if (depth >= groups.length) {
        return [{ leaf: true, rows: data, visible: data.filter(d => !d.hidden).length }];
    }

    const col   = groups[depth];
    const split = meta[col].split;
    const map   = new Map();

    data.forEach(d => {
        const raw  = cellValue(d.tr, col);
        const keys = split ? raw.split(split).map(p => p.trim()).filter(Boolean) : [raw];
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
            leaf: false, col, key, path, depth,
            count:   sub.length,
            visible: children.reduce((s, c) => s + (c.visible || 0), 0),
            children
        });
    });
    return out;
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
        const col  = node.children[0].col;
        const desc = sortCol === col && dir === 'desc';
        node.children.sort((a, b) => {
            const r = compare(a.key, b.key, meta[col].type);
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

function flatten(node, frag, ctx) {
    // ── Blatt: die Datenzeilen selbst (bei Multi-Group als Klon) ────────────
    if (node.leaf) {
        node.rows.forEach(d => {
            let tr = d.tr;
            if (ctx.used.has(d.tr)) {
                tr = d.tr.cloneNode(true);
                tr.classList.add('tv-clone');
            } else {
                ctx.used.add(d.tr);
            }
            if (ctx.path) tr.dataset.groupPath = ctx.path;
            else delete tr.dataset.groupPath;
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
    const tr = document.createElement('tr');
    tr.className = 'tv-group-row' + (collapsed ? ' tv-group-collapsed' : '');
    tr.dataset.groupPath = node.path;
    tr.classList.toggle('tv-hidden', ctx.hidden || node.visible === 0);

    const name  = colName(ctx.meta[node.col].cell) || `Spalte ${node.col}`;
    const count = node.visible !== node.count ? `${node.visible}/${node.count}` : node.count;
    const td    = document.createElement('td');
    td.colSpan  = ctx.visibleCols;
    td.innerHTML = `
        <div class="tv-group-content" style="padding-left:${node.depth * 1.5 + 1.25}rem">
            <span class="tv_msr tv-expand">${collapsed ? ICO.closed : ICO.open}</span>
            <span class="tv-group-name">
                <small class="tv-group-label">${esc(name)}:</small>
                ${esc(node.key || '—')}
            </span>
            <span class="tv-count">${count}</span>
        </div>
        <div class="tv-group-actions" data-group-path="${esc(node.path)}" data-col="${node.col}" data-col-name="${esc(name)}"></div>
        <span class="tv_msr tv-ungroup" data-col="${node.col}" title="Gruppierung aufheben">${ICO.remove}</span>`;
    tr.appendChild(td);
    frag.appendChild(tr);

    node.children.forEach(c => flatten(c, frag, {
        ...ctx,
        hidden: ctx.hidden || collapsed,
        path:   node.path
    }));
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
}

/* ══════════════════════════════════════════════════════════════════════════
   Events (Delegation – gilt auch für später eingefügte Tabellen)
   ══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('click', e => {
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
    const expand  = e.target.closest('.tv-group-content');
    const filter  = e.target.closest('.tv-ico-filter');
    const sortIco = e.target.closest('.tv-ico-sort');
    const head    = e.target.closest('[t-sort]');

    if (filter) return;                                  // Popover öffnet per HTML-Attribut

    if (group) {
        e.stopPropagation();
        groupTable(table, +group.dataset.col);
    } else if (ungroup) {
        e.stopPropagation();
        groupTable(table, +ungroup.dataset.col, false);
    } else if (expand) {
        // ── Gruppe auf-/zuklappen (Zustand als t-open am <table>) ───────────
        const path = expand.closest('tr')?.dataset.groupPath;
        if (!path) return;
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

new MutationObserver(list => {
    for (const m of list) {
        m.addedNodes.forEach(n => {
            if (n.nodeType !== Node.ELEMENT_NODE) return;
            if (n instanceof HTMLTableElement) init(n);
            else n.querySelectorAll?.('table').forEach(init);
        });
    }
}).observe(document.documentElement, { childList: true, subtree: true });

function injectCss() {
    const url = new URL('./tableview.css', import.meta.url);
    if (document.querySelector(`link[href="${url.href}"]`)) return;
    document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="${url.href}">`);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => prepareTables());
} else {
    prepareTables();
}