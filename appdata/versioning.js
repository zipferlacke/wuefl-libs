/**
 * @typedef {Object} VersionEntry
 * @property {string}   version - Semver-String, z.B. "1.0.1"
 * @property {string}   [date]  - ISO-Datum
 * @property {string[]} changes - Liste der Änderungen
 */

/**
 * @typedef {Object} VersioningOptions
 * @property {boolean}   [zip=false]    - true → ZIP-Download mit allen Dateien.
 *                                         false → einzelner Datei-Download (genau 1 File in `files`).
 * @property {string[]}  [files]        - Quell-Dateinamen ohne Versions-Suffix
 *                                         (z.B. ['selectpicker.js', 'selectpicker.css']).
 *                                         Bei zip=false muss genau ein Eintrag drin sein.
 * @property {string}    [sourceDir]    - Pfad zu den Quelldateien, relativ zur HTML.
 *                                         Default: '' (gleicher Ordner wie HTML).
 */

// ── Pfade ───────────────────────────────────────────────────────────────────
// messages.json liegt fest unter ../appdata/messages.json relativ zu DIESER Datei.
// JSZip wird per CDN nachgeladen, falls noch nicht vorhanden.
const MESSAGES_URL  = new URL('./messages.json', import.meta.url).href;
const JSZIP_CDN_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

/**
 * Initialisiert Version, Changelog und Download für ein Modul auf einer HTML-Seite.
 *
 * Die Funktion sucht im DOM nach den Platzhalter-Strings {version}, {changelog}
 * und {download} (in Text-Nodes UND Attributen) und ersetzt sie:
 *
 *   {version}   → "v1.0.1" (aktuelle Version aus messages.json)
 *   {changelog} → komplette Versions-Historie als HTML-Liste
 *   {download}  → Download-Button (ZIP oder Einzeldatei)
 *
 * Beim ZIP-Download werden Quell-Dateien geladen, im JS-Inhalt wird der
 * CSS-Import-Pfad auf den versionierten Namen umgeschrieben, dann in das ZIP
 * gepackt. Im ZIP heißen die Dateien `<modul>_v<MAJ>_<MIN>_<PATCH>.<ext>`.
 *
 * @example
 *   import versioning from '../ui/versioning.js';
 *   await versioning('selectpicker', {
 *     zip: true,
 *     files: ['selectpicker.js', 'selectpicker.css']
 *   });
 *
 * @param {string} moduleName - Name in messages.json (auch Ordnername & Datei-Stamm).
 * @param {VersioningOptions} [options]
 * @returns {Promise<{version: string, versions: VersionEntry[]} | null>}
 *          Gibt aktuelle Version + komplette History zurück, null bei Fehler.
 */
export default async function versioning(moduleName, options = {}) {
    const opts = {
        zip:       options.zip === true,
        files:     Array.isArray(options.files) ? options.files : [],
        sourceDir: typeof options.sourceDir === 'string' ? options.sourceDir : '',
    };

    if (!moduleName) {
        console.error('[versioning] moduleName ist erforderlich');
        return null;
    }
    if (opts.files.length === 0) {
        console.error('[versioning] options.files muss mindestens einen Eintrag haben');
        return null;
    }
    if (!opts.zip && opts.files.length !== 1) {
        console.error('[versioning] zip=false erlaubt nur genau eine Datei in files');
        return null;
    }

    // 1. Versions-Daten holen
    const versions = await loadVersions(moduleName);
    if (!versions || versions.length === 0) {
        replacePlaceholders({
            '{version}':   '<span class="versioning-error">v?.?.?</span>',
            '{changelog}': '<div class="versioning-error">Versionen konnten nicht geladen werden.</div>',
            '{download}':  '<div class="versioning-error">Download nicht verfügbar</div>',
        });
        return null;
    }
    const currentVersion = versions[0].version;
    const v_underscore   = currentVersion.replace(/\./g, '_');

    // 2. Platzhalter im DOM ersetzen
    const versionHtml   = renderVersionTag(currentVersion);
    const changelogHtml = renderChangelog(versions);
    const downloadHtml  = renderDownloadButton(moduleName, currentVersion, opts);

    replacePlaceholders({
        '{version}':   versionHtml,
        '{changelog}': changelogHtml,
        '{download}':  downloadHtml,
    });

    // 3. Download-Button verdrahten
    bindDownloadButton(moduleName, currentVersion, opts);

    return { version: currentVersion, versions };
}

// ── Versions-Daten laden ─────────────────────────────────────────────────────
/**
 * Holt das Versions-Array für ein Modul aus messages.json.
 * Sortiert absteigend nach Semver (neueste zuerst).
 * @param {string} moduleName
 * @returns {Promise<VersionEntry[]>}
 */
async function loadVersions(moduleName) {
    try {
        const res = await fetch(MESSAGES_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = data?.modules?.[moduleName];
        if (!Array.isArray(list) || list.length === 0) {
            throw new Error(`Keine Versionen für '${moduleName}' in messages.json`);
        }
        return [...list].sort((a, b) => compareVersions(b.version, a.version));
    } catch (err) {
        console.error('[versioning] Konnte Versionen nicht laden:', err);
        return [];
    }
}

/**
 * Vergleicht zwei Semver-Strings: 1.2.3 vs 1.2.4 → -1 / 0 / 1
 * @param {string} a
 * @param {string} b
 */
function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const da = pa[i] || 0, db = pb[i] || 0;
        if (da !== db) return da < db ? -1 : 1;
    }
    return 0;
}

// ── HTML-Renderer ────────────────────────────────────────────────────────────
/**
 * Rendert das Versions-Badge.
 * @param {string} version
 * @returns {string}
 */
function renderVersionTag(version) {
    return `<span class="versioning-version">v${escapeHtml(version)}</span>`;
}

/**
 * Rendert das Changelog (alle Versionen, neueste mit "aktuell"-Tag).
 * @param {VersionEntry[]} versions
 * @returns {string}
 */
function renderChangelog(versions) {
    const items = versions.map((v, i) => {
        const isCurrent = i === 0;
        const date    = v.date    ? `<span class="versioning-changelog-date">${escapeHtml(v.date)}</span>` : '';
        const current = isCurrent ? '<span class="versioning-changelog-current">aktuell</span>'           : '';
        const changes = Array.isArray(v.changes) && v.changes.length
            ? `<ul>${v.changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`
            : '';
        return `
            <div class="versioning-changelog-entry${isCurrent ? ' is-current' : ''}">
              <div class="versioning-changelog-head">
                <span class="versioning-changelog-version">v${escapeHtml(v.version)}</span>
                ${date}
                ${current}
              </div>
              ${changes}
            </div>`;
    }).join('');
    return `<div class="versioning-changelog">${items}</div>`;
}

/**
 * Rendert den Download-Button. Bei zip=true: ein Button für das ZIP.
 * Bei zip=false: ein Direkt-Link zur einzelnen Datei (mit Versionsnummer im
 * Dateinamen, wird per <a download> serviert).
 * @param {string} moduleName
 * @param {string} version
 * @param {{zip:boolean, files:string[], sourceDir:string}} opts
 * @returns {string}
 */
function renderDownloadButton(moduleName, version, opts) {
    const v_underscore = version.replace(/\./g, '_');
    if (opts.zip) {
        const label = `${moduleName}_v${version}.zip`;
        return `
            <button class="versioning-download" type="button"
                    data-versioning-download="zip"
                    data-versioning-module="${escapeHtml(moduleName)}"
                    data-versioning-version="${escapeHtml(version)}">
                <span class="msr">download</span>
                <span class="versioning-download-label">${escapeHtml(label)}</span>
            </button>`;
    }

    // Single-File: Direktlink (kein Button, kein Patcher nötig)
    const file       = opts.files[0];
    const ext        = file.includes('.') ? file.slice(file.lastIndexOf('.')) : '';
    const stem       = file.includes('.') ? file.slice(0, file.lastIndexOf('.')) : file;
    const sourceUrl  = (opts.sourceDir ? opts.sourceDir.replace(/\/$/, '') + '/' : '') + file;
    const targetName = `${stem}_v${v_underscore}${ext}`;
    return `
        <a class="versioning-download" href="${escapeHtml(sourceUrl)}" download="${escapeHtml(targetName)}">
            <span class="msr">download</span>
            <span class="versioning-download-label">${escapeHtml(targetName)}</span>
        </a>`;
}

// ── Platzhalter-Replacement ──────────────────────────────────────────────────
/**
 * Ersetzt {version}, {changelog}, {download} im body. Geht über Text-Nodes,
 * weil HTML-injection als innerHTML auf parent-Knoten andere Listener killt.
 * Die Platzhalter werden durch ein Wrapper-Span ersetzt, das innerHTML kriegt.
 *
 * Strategie: TreeWalker findet alle Textknoten mit Platzhaltern, jeder Knoten
 * wird durch Fragment ersetzt, in dem die Platzhalter-Stellen Span-Wrapper sind.
 *
 * @param {Object<string, string>} map - Mapping Platzhalter → HTML
 */
function replacePlaceholders(map) {
    const keys = Object.keys(map);
    if (keys.length === 0) return;

    // Pattern matcht ALLE Platzhalter gleichzeitig
    const pattern = new RegExp(keys.map(escapeRegex).join('|'), 'g');

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                // Skip <script>, <style>: deren Inhalt soll nicht angefasst werden
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') {
                    return NodeFilter.FILTER_REJECT;
                }
                return pattern.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        }
    );

    const targets = [];
    let n;
    while ((n = walker.nextNode())) targets.push(n);

    for (const textNode of targets) {
        const text = textNode.nodeValue;
        const frag = document.createDocumentFragment();

        // Pattern-Stellen finden und durch HTML-Wrapper ersetzen
        let lastIdx = 0;
        // RegExp mit g muss vor jedem Lauf zurückgesetzt werden
        const re = new RegExp(keys.map(escapeRegex).join('|'), 'g');
        let match;
        while ((match = re.exec(text)) !== null) {
            // Vorangegangener Text-Anteil
            if (match.index > lastIdx) {
                frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
            }
            // Platzhalter durch geparstes HTML ersetzen
            const tpl = document.createElement('template');
            tpl.innerHTML = map[match[0]];
            frag.appendChild(tpl.content);
            lastIdx = match.index + match[0].length;
        }
        // Reststück
        if (lastIdx < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }
        textNode.parentNode.replaceChild(frag, textNode);
    }
}

// ── Download-Button verdrahten (nur ZIP) ─────────────────────────────────────
/**
 * Hängt einen Click-Handler an alle ZIP-Download-Buttons der aktuellen Modul-
 * Instanz, der das ZIP on-the-fly erzeugt.
 * @param {string} moduleName
 * @param {string} version
 * @param {{zip:boolean, files:string[], sourceDir:string}} opts
 */
function bindDownloadButton(moduleName, version, opts) {
    if (!opts.zip) return; // Single-File ist ein einfacher <a download>, kein JS nötig

    const buttons = document.querySelectorAll(
        `[data-versioning-download="zip"][data-versioning-module="${cssEscape(moduleName)}"]`
    );
    buttons.forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            const labelEl = btn.querySelector('.versioning-download-label');
            const origLabel = labelEl?.textContent;
            if (labelEl) labelEl.textContent = 'Lade...';
            try {
                await downloadZip(moduleName, version, opts);
                if (labelEl && origLabel) labelEl.textContent = '✓ heruntergeladen';
            } catch (err) {
                console.error('[versioning] Download fehlgeschlagen:', err);
                if (labelEl) labelEl.textContent = `Fehler: ${err.message}`;
            } finally {
                setTimeout(() => {
                    if (labelEl && origLabel) labelEl.textContent = origLabel;
                    btn.disabled = false;
                }, 3000);
            }
        });
    });
}

// ── ZIP-Erstellung ───────────────────────────────────────────────────────────
/**
 * Lädt JSZip nach (falls noch nicht da), holt alle Quelldateien, patcht die
 * .js-Dateien (CSS-Import-Pfade auf versionierte Namen umschreiben), packt
 * alles in ein ZIP und triggert den Download.
 *
 * @param {string} moduleName
 * @param {string} version
 * @param {{files:string[], sourceDir:string}} opts
 */
async function downloadZip(moduleName, version, opts) {
    await ensureJsZip();
    const v_underscore = version.replace(/\./g, '_');
    const zip          = new JSZip();

    // Pattern matcht <moduleName>.css ODER <moduleName>_vX_Y_Z.css — wir wollen
    // beides erfassen (egal ob die Source schon versioniert war oder nicht).
    const cssPattern = new RegExp(
        `${escapeRegex(moduleName)}(?:_v\\d+_\\d+_\\d+)?\\.css`,
        'g'
    );
    const targetCss = `${moduleName}_v${v_underscore}.css`;

    // Quelle: sourceDir + filename
    const dir = opts.sourceDir ? opts.sourceDir.replace(/\/$/, '') + '/' : '';

    // Alle Dateien parallel laden
    const fetched = await Promise.all(opts.files.map(async file => {
        const url = dir + file;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
        return { srcName: file, content: await res.text() };
    }));

    // Pro Datei: versionierter ZIP-Name + .js patchen
    fetched.forEach(f => {
        const ext      = f.srcName.includes('.') ? f.srcName.slice(f.srcName.lastIndexOf('.')) : '';
        const stem     = f.srcName.includes('.') ? f.srcName.slice(0, f.srcName.lastIndexOf('.')) : f.srcName;
        const zipName  = `${stem}_v${v_underscore}${ext}`;
        let   content  = f.content;

        // .js-Dateien: CSS-Importe auf versionierten Namen umschreiben
        if (ext === '.js') {
            content = content.replace(cssPattern, targetCss);
        }
        zip.file(zipName, content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `${moduleName}_v${version}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
}

/**
 * Stellt sicher dass JSZip global verfügbar ist. Lädt es per <script>-Tag
 * vom CDN nach falls nicht vorhanden.
 * @returns {Promise<void>}
 */
function ensureJsZip() {
    if (typeof window.JSZip !== 'undefined') return Promise.resolve();
    return new Promise((resolve, reject) => {
        // Falls schon ein Tag existiert (mehrfacher Aufruf): warten bis er lädt
        const existing = document.querySelector(`script[src="${JSZIP_CDN_URL}"]`);
        if (existing) {
            existing.addEventListener('load',  () => resolve());
            existing.addEventListener('error', () => reject(new Error('JSZip-Ladefehler')));
            return;
        }
        const s = document.createElement('script');
        s.src    = JSZIP_CDN_URL;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('JSZip konnte nicht vom CDN geladen werden'));
        document.head.appendChild(s);
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * HTML-Escape für Text in Attributen und Inhalten.
 * @param {string} s
 */
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escaped Sonderzeichen für RegExp.
 * @param {string} s
 */
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * CSS.escape mit Fallback (für ältere Browser).
 * @param {string} s
 */
function cssEscape(s) {
    if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}