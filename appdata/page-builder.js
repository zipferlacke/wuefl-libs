/**
 * page-builder.js
 *
 * Baut die komplette Modul-Doku-Seite zur Laufzeit aus zwei Quellen:
 *   - `readme.md`  (Pflichtinhalt: Installation, API, CSS, Changelog-Rahmen …)
 *   - `demo.html`  (optional: anklickbare Live-Demo, wird 1:1 eingebettet)
 *
 * Jede Modul-`index.html` ist dadurch nur noch ein winziges Bootstrap-Gerüst:
 *
 *   <script type="module">
 *     import { renderModulePage } from '../appdata/page-builder.js';
 *     await renderModulePage('datepicker', { zip: true, files: [...] });
 *   </script>
 *
 * @example
 *   import { renderModulePage } from '../appdata/page-builder.js';
 *   await renderModulePage('selectpicker', { zip: true, files: ['selectpicker.js', 'selectpicker.css'] });
 */
import { parseReadme } from './markdown.js';
import versioning from './versioning.js';

/**
 * @param {string} moduleName - Name in messages.json, auch Ordnername & Datei-Stamm.
 * @param {import('./versioning.js').VersioningOptions} [versioningOptions]
 * @returns {Promise<{version:string, versions:object[]}|null>}
 */
export async function renderModulePage(moduleName, versioningOptions = {}) {
    let mdRes;
    try {
        mdRes = await fetch('./readme.md');
    } catch (err) {
        renderFatalError(`readme.md konnte nicht geladen werden: ${err.message}`);
        return null;
    }
    if (!mdRes.ok) {
        renderFatalError(`readme.md konnte nicht geladen werden (HTTP ${mdRes.status}).`);
        return null;
    }

    const doc = parseReadme(await mdRes.text());

    document.title = `${doc.title} — wuefl-libs`;
    document.body.innerHTML = renderShell(doc);

    await injectDemo();

    return versioning(moduleName, versioningOptions);
}

// ── Shell-Aufbau ──────────────────────────────────────────────────────────────

function renderShell(doc) {
    const sectionsHtml = doc.sections
        .map((s, idx) => `
            <div class="section" id="${s.id}">
              <div class="section-label">${pad(idx + 1)} — ${escapeHtml(s.label)}</div>
              <h2>${s.titleHtml}</h2>
              ${s.html}
            </div>`)
        .join('');

    const changelogLabel = pad(doc.sections.length + 1);
    const title = escapeHtml(doc.title);

    const navModuleSub = '{version}' + (doc.tagline ? ` · ${doc.tagline}` : '');

    return `
        <nav>
          <a class="nav-brand" href="../index.html"><span class="msr">arrow_back_ios_new</span> wuefl-libs</a>
          <span class="nav-module">
            <strong class="nav-module-name">${title}</strong><br>
            <span class="nav-module-sub">${navModuleSub}</span>
          </span>
        </nav>
        <div class="wrap">
          <div class="lead">
            ${doc.intro}
          </div>

          <div id="demo-mount"></div>

          <div class="download-bar">
            {download}
            <span class="dl-info">Vanilla JS · kein Build-Schritt · kein Framework</span>
          </div>

          ${sectionsHtml}

          <div class="section" id="changelog">
            <div class="section-label">${changelogLabel} — Changelog</div>
            <h2>Versionsverlauf</h2>
            <p>Alle Versionen mit den jeweiligen Änderungen.</p>
            {changelog}
          </div>

          <footer>
            <span>${title} {version} — Vanilla JS</span>
            <a href="../index.html">wuefl-libs</a>
          </footer>
        </div>`;
}

function renderFatalError(message) {
    document.body.innerHTML = `<p style="font-family:monospace;padding:2rem;color:#b91c1c;">${escapeHtml(message)}</p>`;
}

// ── Demo-Fragment einbetten ───────────────────────────────────────────────────
/**
 * Lädt `./demo.html` (falls vorhanden) und hängt es in `#demo-mount` ein.
 * `<script>`-Tags werden neu erzeugt, weil per innerHTML eingefügte Scripts
 * vom Browser nicht ausgeführt werden — `<style>`-Tags funktionieren direkt.
 *
 * Zwei Besonderheiten dynamisch eingefügter Scripts, die hier ausgeglichen werden:
 *   1. Sie laufen standardmäßig async/ungeordnet — bei mehreren <script>-Tags
 *      (z.B. erst die Lib, dann der Nutzungscode) muss `async = false` gesetzt
 *      werden, damit die Reihenfolge erhalten bleibt.
 *   2. `DOMContentLoaded` ist zu diesem Zeitpunkt (Seite ist längst geladen)
 *      bereits Geschichte — Module, die sich darüber selbst initialisieren
 *      (z.B. tableview.js), würden nie starten. Nach dem Laden aller Demo-
 *      Scripts wird das Event darum synthetisch nachgefeuert.
 */
async function injectDemo() {
    let res;
    try {
        res = await fetch('./demo.html');
    } catch {
        return;
    }
    if (!res.ok) return;

    const mount = document.getElementById('demo-mount');
    const tpl = document.createElement('template');
    tpl.innerHTML = await res.text();

    const loadPromises = [...tpl.content.querySelectorAll('script')].map(old => {
        const fresh = document.createElement('script');
        for (const attr of old.attributes) fresh.setAttribute(attr.name, attr.value);
        fresh.textContent = old.textContent;
        fresh.async = false; // Reihenfolge bei mehreren <script src> erhalten

        const waitForLoad = fresh.hasAttribute('src')
            ? new Promise(resolve => {
                fresh.addEventListener('load', resolve, { once: true });
                fresh.addEventListener('error', resolve, { once: true });
            })
            : Promise.resolve();

        old.replaceWith(fresh);
        return waitForLoad;
    });

    mount.appendChild(tpl.content);
    await Promise.all(loadPromises);

    // Synthetisches DOMContentLoaded für Module, die sich darüber selbst initialisieren.
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: false }));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad(n) {
    return String(n).padStart(2, '0');
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
