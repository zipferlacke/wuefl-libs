/**
 * tableView.js – Sort, Multi-Group & Search Plugin (Event Delegation & Auto-Init)
 *
 * Attribute auf <th>:
 *   t-sort                    → Spalte sortierbar
 *   t-sort="asc|desc"         → Default-Sortierung
 *   t-type="date|num"         → Sortier-Typ (sonst auto)
 *   t-group                   → Spalte gruppierbar
 *   t-group="active"          → Default-Gruppierung
 *   t-group="<sep>"           → Gruppierbar mit Multi-Value-Split (z.B. t-group=",")
 *
 * Attribut auf <table>:
 *   t-search                  → Sucheingabe in <thead> einfügen.
 *                               Tokens (durch Leerzeichen getrennt) müssen ALLE
 *                               in irgendeiner Spalte der Zeile vorkommen.
 *
 * Hilfsklassen die gesetzt werden:
 *   .tv-hidden                → display:none (CSS muss dies definieren)
 *   .tv-clone                 → Klon einer Zeile (bei Multi-Value-Gruppen)
 *   .tv-group-row             → Gruppen-Header-Zeile
 */
/**
 * tableView.js – Sort, Multi-Group & Search Plugin 
 */

let styleInjected = false;
const tableStates = new WeakMap();

export function prepareTables(scope) {
    if (!styleInjected) { injectCss(); styleInjected = true; }
    
    const tables = scope instanceof HTMLTableElement 
        ? [scope] 
        : (scope || document).querySelectorAll('table');

    tables.forEach(_setupTableHeaders);
}

function _setupTableHeaders(table) {
    if (table.dataset.tvInit) return; 
    table.dataset.tvInit = "true";
    table.classList.add('tv-enabled');

    const headerRow = _ensureStructure(table);
    if (!headerRow) return;

    const ths = [...headerRow.querySelectorAll('th')];
    if (ths.length === 0) return;

    const state = {
        sortCol: -1, sortDir: 'none',
        groups: [],
        collapsed: new Set(),
        searchQuery: '',
        allTrs: null
    };
    tableStates.set(table, state);

    ths.forEach((th, i) => {
        const canSort = th.hasAttribute('t-sort');
        const canGroup = th.hasAttribute('t-group');
        if (!canSort && !canGroup) return;

        th.dataset.tvCol = i;
        const wrap = document.createElement('span');
        wrap.className = 'tv-icons';

        if (canSort) {
            wrap.innerHTML += `<span class="msr tv-ico tv-ico-sort" data-col="${i}" title="Sortieren">unfold_more</span>`;
            th.style.cursor = 'pointer';
        }
        if (canGroup) {
            wrap.innerHTML += `<span class="msr tv-ico tv-ico-group" data-col="${i}" title="Gruppieren">workspaces</span>`;
        }
        th.appendChild(wrap);
    });

    ths.forEach((th, i) => {
        const s = th.getAttribute('t-sort');
        if (s === 'asc' || s === 'desc') { state.sortCol = i; state.sortDir = s; }
        if (th.getAttribute('t-group') === 'active') state.groups.push(i);
    });

    if (table.hasAttribute('t-search')) _setupSearch(table, state, ths.length);

    _renderTable(table, { fireGroupsRendered: state.groups.length > 0 });
}

// ========== Struktur-Sicherung ==========

/**
 * Sorgt dafür dass die Tabelle valide thead/tbody hat.
 * - tbody fehlt → wird ergänzt (lose <tr> reingeschoben)
 * - thead fehlt → wenn erste tbody-Zeile <th> enthält, wird sie zum thead promoted
 * - keine Header gefunden → return null (Plugin überspringt diese Tabelle)
 */
function _ensureStructure(table) {
    let thead = table.querySelector(':scope > thead');
    let tbody = table.querySelector(':scope > tbody');

    if (!tbody) {
        tbody = document.createElement('tbody');
        const looseTrs = [...table.children].filter(c => c.tagName === 'TR');
        looseTrs.forEach(tr => tbody.appendChild(tr));
        table.appendChild(tbody);
    }

    if (!thead) {
        const firstRow = tbody.querySelector(':scope > tr');
        if (firstRow && firstRow.querySelector('th')) {
            thead = document.createElement('thead');
            thead.appendChild(firstRow);
            table.insertBefore(thead, tbody);
        } else {
            return null;
        }
    }

    return thead.querySelector(':scope > tr');
}

// ========== Search Setup ==========
function _setupSearch(table, state, colCount) {
    const thead = table.querySelector(':scope > thead');
    if (!thead) return;

    const searchRow = document.createElement('tr');
    searchRow.className = 'tv-search-row';
    const th = document.createElement('th');
    th.colSpan = colCount;
    th.innerHTML = `
        <div class="tv-search-wrap">
            <span class="msr tv-search-icon">search</span>
            <input type="text" class="tv-search-input" placeholder="Suchen ...">
            <span class="msr tv-search-clear" style="display:none">close</span>
        </div>
    `;
    searchRow.appendChild(th);
    thead.insertBefore(searchRow, thead.firstChild);

    const input = th.querySelector('.tv-search-input');
    const clear = th.querySelector('.tv-search-clear');

    let debounceTimer;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            state.searchQuery = input.value;
            clear.style.display = input.value ? '' : 'none';
            _renderTable(table);
        }, 150);
    });

    clear.addEventListener('click', () => {
        input.value = '';
        state.searchQuery = '';
        clear.style.display = 'none';
        _renderTable(table);
    });
}

// ========== Globale Event Delegation ==========

document.addEventListener('click', (e) => {
    const btnSort = e.target.closest('.tv-ico-sort');
    const btnGroup = e.target.closest('.tv-ico-group');
    const btnExpand = e.target.closest('.tv-group-content');
    const btnUngroup = e.target.closest('.tv-ungroup');
    const thSort = e.target.closest('th[t-sort]');

    if (btnSort || (thSort && !btnGroup && !btnUngroup && !btnExpand)) {
        e.stopPropagation();
        const th = thSort || btnSort.closest('th');
        _doSort(th.closest('table'), parseInt(th.dataset.tvCol));
    } 
    else if (btnGroup) {
        e.stopPropagation();
        _doGroup(btnGroup.closest('table'), parseInt(btnGroup.dataset.col));
    } 
    else if (btnExpand) {
        const tr = btnExpand.closest('tr');
        const table = tr?.closest('table');
        const state = table ? tableStates.get(table) : null;
        if (!state) return;
        const path = tr.dataset.groupPath;
        if (!path) return;
        
        if (state.collapsed.has(path)) state.collapsed.delete(path);
        else state.collapsed.add(path);
        
        _applyCollapseFast(table, state); 
    } 
    else if (btnUngroup) {
        e.stopPropagation();
        const table = btnUngroup.closest('table');
        const state = tableStates.get(table);
        if (!state) return;
        const col = parseInt(btnUngroup.dataset.col);
        
        state.groups = state.groups.filter(c => c !== col);
        _renderTable(table, { fireGroupsRendered: true });
    }
});

// ========== Actions ==========

function _doSort(table, col) {
    const state = tableStates.get(table);
    if (!state) return;
    const dirs = ['none', 'asc', 'desc'];
    if (state.sortCol === col) {
        state.sortDir = dirs[(dirs.indexOf(state.sortDir) + 1) % 3];
    } else {
        state.sortCol = col;
        state.sortDir = 'asc';
    }
    _renderTable(table);
}

function _doGroup(table, col) {
    const state = tableStates.get(table);
    if (!state) return;
    const idx = state.groups.indexOf(col);
    if (idx > -1) state.groups.splice(idx, 1);
    else state.groups.push(col);
    _renderTable(table, { fireGroupsRendered: true });
}

// ========== Core Logic ==========

function _renderTable(table, opts = {}) {
    const state = tableStates.get(table);
    if (!state) return;

    const thead = table.querySelector(':scope > thead');
    const tbody = table.querySelector(':scope > tbody');
    if (!thead || !tbody) return;

    const headerTr = thead.querySelector(':scope > tr:not(.tv-search-row)') || thead.querySelector(':scope > tr');
    if (!headerTr) return;
    const realThs = [...headerTr.querySelectorAll('th')];

    const rowsData = _extractRowData(table, realThs);

    const query = state.searchQuery?.trim().toLowerCase();
    if (query) {
        const tokens = query.split(/\s+/);
        rowsData.forEach(r => {
            const allText = r.vals.join(' ').toLowerCase();
            r.filtered = !tokens.every(t => allText.includes(t));
        });
    }

    realThs.forEach((th, i) => {
        const sortIco = th.querySelector('.tv-ico-sort');
        if (sortIco) {
            if (state.sortCol === i && state.sortDir !== 'none') {
                sortIco.textContent = state.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
                sortIco.classList.add('tv-ico-active');
            } else {
                sortIco.textContent = 'unfold_more';
                sortIco.classList.remove('tv-ico-active');
            }
        }
        const groupIco = th.querySelector('.tv-ico-group');
        if (groupIco) {
            groupIco.classList.toggle('tv-ico-active', state.groups.includes(i));
        }

        th.classList.toggle('tv-col-hidden', state.groups.includes(i));
    });

    rowsData.forEach(r => {
        [...r.tr.children].forEach((td, i) => {
            td.classList.toggle('tv-col-hidden', state.groups.includes(i));
        });
    });

    let visibleCols = 0;
    realThs.forEach((th, i) => {
        if (!state.groups.includes(i) && !th.classList.contains('tv-col-hidden')) visibleCols++;
    });
    if (visibleCols === 0) visibleCols = 1;

    // Baum bauen (mit State für Auto-Collapse)
    const treeNodes = _buildTree(rowsData, state.groups, 0, "", realThs, state);
    const root = { isLeaf: false, children: treeNodes };

    _sortTree(root, state.sortCol, state.sortDir, realThs);

    const fragment = document.createDocumentFragment();
    const appendedRows = new Set();
    _flattenTree(root, fragment, state, visibleCols, realThs, false, appendedRows, "");

    tbody.innerHTML = '';
    tbody.appendChild(fragment);

    const visibleCount = rowsData.filter(r => !r.filtered).length;
    if (visibleCount === 0 && query) {
        const tr = document.createElement('tr');
        tr.className = 'tv-empty-row';
        tr.innerHTML = `<td colspan="${visibleCols}" class="tv-empty">Keine Treffer für „${_esc(state.searchQuery)}"</td>`;
        tbody.appendChild(tr);
    }

    // Custom Event NUR feuern wenn die Gruppen-Struktur sich tatsächlich geändert hat
    // (also nicht bei Sort, Suche, Auf/Zuklappen).
    if (opts.fireGroupsRendered) {
        const actionBoxes = Array.from(table.querySelectorAll('.tv-group-actions'));
        table.dispatchEvent(new CustomEvent('tableview:groups-rendered', {
            bubbles: true,
            detail: {
                table: table,
                groupedColumns: state.groups,
                actionBoxes: actionBoxes
            }
        }));
    }
}

/**
 * Schneller Pfad fürs Auf/Zuklappen: ändert nur CSS-Klassen + Icon, kein DOM-Rebuild.
 * Berücksichtigt Filter-Status via dataset.tvFiltered.
 */
function _applyCollapseFast(table, state) {
    const tbody = table.querySelector(':scope > tbody');
    if (!tbody) return;

    for (const row of tbody.children) {
        const path = row.dataset.groupPath;
        if (!path) continue;

        const isGroupRow = row.classList.contains('tv-group-row');
        const isFiltered = row.dataset.tvFiltered === "1";

        if (isGroupRow) {
            // Eigener Collapse-State → Klasse + Icon
            const isOwnCollapsed = state.collapsed.has(path);
            row.classList.toggle('tv-group-collapsed', isOwnCollapsed);
            const icon = row.querySelector('.tv-expand');
            if (icon) icon.textContent = isOwnCollapsed ? 'chevron_right' : 'expand_more';

            // Eigene Sichtbarkeit: hidden wenn ein VORFAHR collapsed
            const ancestorCollapsed = _isAnyAncestorCollapsed(path, state.collapsed);
            row.classList.toggle('tv-hidden', ancestorCollapsed || isFiltered);
        } else {
            // Data-Row: hidden wenn deren Group oder ein Vorfahr collapsed ist
            const groupOrAncestorCollapsed = _isPathOrAncestorCollapsed(path, state.collapsed);
            row.classList.toggle('tv-hidden', groupOrAncestorCollapsed || isFiltered);
        }
    }
}

function _isAnyAncestorCollapsed(path, collapsedSet) {
    if (!path) return false;
    const parts = path.split('|');
    for (let i = 1; i < parts.length; i++) {
        const ancestorPath = parts.slice(0, i).join('|');
        if (collapsedSet.has(ancestorPath)) return true;
    }
    return false;
}

function _isPathOrAncestorCollapsed(path, collapsedSet) {
    if (!path) return false;
    if (collapsedSet.has(path)) return true;
    return _isAnyAncestorCollapsed(path, collapsedSet);
}

function _extractRowData(table, ths) {
    const state = tableStates.get(table);
    const tbody = table.querySelector(':scope > tbody');
    if (!tbody) return [];

    if (!state.allTrs) {
        const trs = [...tbody.querySelectorAll('tr:not(.tv-group-row):not(.tv-clone):not(.tv-empty-row)')];
        trs.forEach((tr, i) => {
            if (tr.dataset.tvOrig === undefined) tr.dataset.tvOrig = i;
        });
        state.allTrs = trs;
    }

    return state.allTrs.map(tr => ({
        tr: tr,
        origIndex: parseInt(tr.dataset.tvOrig),
        vals: ths.map((th, ci) => _val(tr, ci)),
        filtered: false
    }));
}

function _buildTree(rows, groups, depth, parentPath, ths, state) {
    if (depth >= groups.length) {
        const visibleCount = rows.filter(r => !r.filtered).length;
        return [{ isLeaf: true, rows: rows, visibleCount }];
    }

    const col = groups[depth];
    const th = ths[col];
    const groupVal = th?.getAttribute('t-group');
    const splitDelim = (groupVal && groupVal !== 'active' && groupVal !== '') ? groupVal : null;

    const groupMap = new Map();

    rows.forEach(r => {
        const rawVal = r.vals[col] || '';

        if (splitDelim) {
            const parts = rawVal.split(splitDelim).map(p => p.trim()).filter(Boolean);
            if (parts.length === 0) {
                if (!groupMap.has('')) groupMap.set('', []);
                groupMap.get('').push(r);
            } else {
                parts.forEach(part => {
                    if (!groupMap.has(part)) groupMap.set(part, []);
                    groupMap.get(part).push(r);
                });
            }
        } else {
            if (!groupMap.has(rawVal)) groupMap.set(rawVal, []);
            groupMap.get(rawVal).push(r);
        }
    });

    const children = [];
    groupMap.forEach((groupRows, key) => {
        const path = parentPath ? `${parentPath}|${col}:${key}` : `${col}:${key}`;

        // Gruppen standardmäßig zuklappen, wenn sie neu erstellt werden
        if (!state.initCollapsedPaths) state.initCollapsedPaths = new Set();
        if (!state.initCollapsedPaths.has(path)) {
            state.initCollapsedPaths.add(path);
            state.collapsed.add(path);
        }

        const subChildren = _buildTree(groupRows, groups, depth + 1, path, ths, state);
        const visibleCount = subChildren.reduce((sum, c) => sum + (c.visibleCount || 0), 0);
        children.push({
            isLeaf: false,
            col: col,
            key: key,
            path: path,
            depth: depth,
            count: groupRows.length,
            visibleCount: visibleCount,
            children: subChildren
        });
    });

    return children;
}

function _sortTree(node, sortCol, sortDir, ths) {
    if (node.isLeaf) {
        if (sortDir === 'none' || sortCol === -1) {
            node.rows.sort((a, b) => a.origIndex - b.origIndex);
        } else {
            const type = ths[sortCol]?.getAttribute('t-type');
            node.rows.sort((a, b) => {
                const r = _cmp(a.vals[sortCol], b.vals[sortCol], type);
                return sortDir === 'asc' ? r : -r;
            });
        }
        return;
    }

    if (node.children.length > 0 && !node.children[0].isLeaf) {
        const isExplicit = sortCol !== -1 && sortDir !== 'none' && node.children[0].col === sortCol;
        const desc = isExplicit && sortDir === 'desc';
        const type = ths[node.children[0].col]?.getAttribute('t-type');
        node.children.sort((a, b) => {
            const r = _cmp(a.key, b.key, type);
            return desc ? -r : r;
        });
    }

    node.children.forEach(c => _sortTree(c, sortCol, sortDir, ths));
}

function _flattenTree(node, fragment, state, visibleCols, ths, isHidden, appendedRows, currentPath = "") {
    if (node.isLeaf) {
        node.rows.forEach(r => {
            let trToAdd = r.tr;
            if (appendedRows.has(r.tr)) {
                trToAdd = r.tr.cloneNode(true);
                trToAdd.classList.add('tv-clone');
            } else {
                appendedRows.add(r.tr);
            }
            
            if (currentPath) {
                trToAdd.dataset.groupPath = currentPath;
            } else {
                delete trToAdd.dataset.groupPath;
            }

            // Filter-Status persistent als Attribut → Fast-Path beim Collapse-Toggle kann das berücksichtigen
            trToAdd.dataset.tvFiltered = r.filtered ? "1" : "";

            trToAdd.classList.toggle('tv-hidden', isHidden || r.filtered);
            fragment.appendChild(trToAdd);
        });
        return;
    }
    if (node.children && node.path === undefined) {
         node.children.forEach(c => _flattenTree(c, fragment, state, visibleCols, ths, isHidden, appendedRows, currentPath));
         return;
    }

    const isCollapsed = state.collapsed.has(node.path);
    const groupHasNoVisible = node.visibleCount === 0;
    const tr = document.createElement('tr');
    tr.className = 'tv-group-row' + (isCollapsed ? ' tv-group-collapsed' : '');
    tr.dataset.groupPath = node.path;
    tr.classList.toggle('tv-hidden', isHidden || groupHasNoVisible);

    const td = document.createElement('td');
    td.colSpan = visibleCols;

    const paddingLeft = (node.depth * 1.5) + 1.25;
    const colNameRaw = ths[node.col]?.textContent?.replace(/unfold_more|workspaces|arrow_upward|arrow_downward|search|close/g, '').trim() || `Spalte ${node.col}`;

    const countDisplay = (node.visibleCount !== undefined && node.visibleCount !== node.count)
        ? `${node.visibleCount}/${node.count}`
        : node.count;

    td.innerHTML = `
        <div class="tv-group-content" style="padding-left: ${paddingLeft}rem">
            <span class="msr tv-expand">${isCollapsed ? 'chevron_right' : 'expand_more'}</span>
            <span class="tv-group-name">
                <small class="tv-group-label">${_esc(colNameRaw)}:</small>
                ${_esc(node.key)}
            </span>
            <span class="tv-count">${countDisplay}</span>
        </div>
        <div class="tv-group-actions" data-group-path="${node.path}" data-col="${node.col}" data-col-name="${_esc(colNameRaw)}"></div>
        <span class="msr tv-ungroup" data-col="${node.col}" title="Gruppierung aufheben">close</span>
    `;
    tr.appendChild(td);
    fragment.appendChild(tr);

    const childrenHidden = isHidden || isCollapsed;
    node.children.forEach(c => _flattenTree(c, fragment, state, visibleCols, ths, childrenHidden, appendedRows, node.path));
}

function _val(row, col) {
    const cell = row.children[col];
    if (!cell) return '';
    return cell.dataset.sortValue !== undefined ? cell.dataset.sortValue : cell.textContent.trim();
}

function _cmp(a, b, type) {
    if (type === 'num') {
        const na = parseFloat(a), nb = parseFloat(b);
        return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb);
    }
    if (type === 'date') {
        return (_date(a) || 0) - (_date(b) || 0);
    }
    const na = parseFloat(a), nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    const da = _date(a), db = _date(b);
    if (da && db) return da - db;
    return String(a).localeCompare(String(b), 'de');
}

function _date(s) {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime();
    const m = String(s).match(/^(\d{2})\.(\d{2})\.(\d{4})\s*(\d{2}:\d{2})?/);
    if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4] || '00:00'}`).getTime();
    return null;
}

function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function injectCss() {
    const cssUrl = new URL('./tableview.css', import.meta.url);
    if (document.querySelector(`link[href="${cssUrl.href}"]`)) return;
    document.head.insertAdjacentHTML("beforeend", `<link rel="stylesheet" href="${cssUrl.href}">`);
}

// ========== Auto Init Observer ==========
const observer = new MutationObserver((mutationsList) => {
    if (!styleInjected) { injectCss(); styleInjected = true; }
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                if (node instanceof HTMLTableElement) _setupTableHeaders(node);
                else {
                    const tables = node.querySelectorAll('table');
                    tables.forEach(table => _setupTableHeaders(table));
                }
            });
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', () => prepareTables());