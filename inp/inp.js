/**
 * InP — Interactive Pages (Advanced Lifecycle Edition)
 * * Attribute:
 * data-inp-typ="modal"      → Zielseite als Dialog öffnen
 * data-inp-typ="update"     → Teil der Seite ersetzen (kein Modal)
 * data-inp-typ="submit-btn" → Form absenden, optional Target ersetzen, Dialog schließen
 * data-inp-typ="close-btn"  → Dialog schließen
 * * data-href / href          → Ziel-URL
 * data-extract              → CSS-Selektor: was aus der Zielseite extrahiert wird
 * data-target               → CSS-Selektor: was auf der aktuellen Seite ersetzt wird
 */

// ========== 1. Initialisierung ==========
injectCss();

// ========== 2. Globale Klick-Steuerung ==========
document.addEventListener("click", async (e) => {
    const trigger = e.target.closest('[data-inp-typ]');
    if (!trigger) return;
    e.preventDefault();

    const typ = trigger.getAttribute('data-inp-typ');
    const href = trigger.getAttribute('data-href') || trigger.getAttribute('href');
    const target = trigger.getAttribute('data-target');
    const extract = trigger.getAttribute('data-extract');
    const targetType = trigger.getAttribute('data-target-type') || 'replace';
    console.log("target:", target, "extract:", extract, "type:", targetType);

    switch (typ) {
        case 'modal':
            await createModal(href, target, extract);
            break;
        case 'update':
            await updateTarget(href, target, extract, targetType);
            break;
        case 'close-btn':
            closeModal(trigger);
            break;
        case 'submit-btn':
            await submitButton(trigger);
            break;
    }
});

// ========== 3. Submit-Handler in BUBBLE-Phase ==========
// Bewusst NICHT in capture: läuft NACH allen Listenern auf der Form.
// Wenn jemand vorher preventDefault() aufgerufen hat, sehen wir das
// via e.defaultPrevented und mischen uns nicht ein.
document.addEventListener('submit', (e) => {
    // 1. Hat jemand anderes schon blockiert? → respektieren, nicht fetchen
    if (e.defaultPrevented) return;

    // 2. Formular bestimmen
    const form = e.target;

    // 3. Prüfen: gehört dieses Formular zu InP?
    const isInsideInPModal = form.closest('.inp-modal') || form.closest('dialog[data-inp-src]');
    const hasInPTarget = form.hasAttribute('data-target') || form.querySelector('[data-inp-typ]');

    if (!isInsideInPModal && !hasInPTarget) return;

    // 4. InP übernimmt: Browser-Default verhindern, eigenes Submit machen
    e.preventDefault();

    const dialog = form.closest('dialog');
    submitModalForm(form, dialog);
});

// ========== 4. Core-Logik: Submit Formular ==========
// An dieser Stelle ist defaultPrevented bereits gecheckt — wir wissen
// dass kein User-Script blockieren wollte. Einfach absenden.
async function submitModalForm(form, dialog) {
    const submitBtn = dialog?.querySelector('[data-inp-typ="submit-btn"][data-target]');
    const target     = submitBtn?.getAttribute('data-target')      || dialog?.getAttribute('data-target')      || null;
    const targetType = submitBtn?.getAttribute('data-target-type') || dialog?.getAttribute('data-target-type') || 'replace';

    const action = form.getAttribute('action') || window.location.href;
    const method = (form.getAttribute('method') || 'POST').toUpperCase();
    const formData = new FormData(form);

    try {
        let fetchUrl = action;
        const fetchOptions = { method, redirect: 'follow' };

        if (method === 'POST') {
            fetchOptions.body = formData;
        } else {
            const qs = new URLSearchParams(formData).toString();
            if (qs) fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + qs;
        }

        const inpSrc = dialog?.getAttribute('data-inp-src');
        if (inpSrc && !fetchUrl.startsWith('http') && !fetchUrl.startsWith('/')) {
            const srcBase = new URL(inpSrc, window.location.href).href;
            fetchUrl = new URL(fetchUrl, srcBase.substring(0, srcBase.lastIndexOf('/') + 1)).href;
        }

        let response = await fetch(fetchUrl, fetchOptions);
        let htmlString = await response.text();
        let finalUrl = response.redirected ? response.url : _detectRedirect(htmlString);

        if (finalUrl) {
            const finalResponse = await fetch(finalUrl);
            htmlString = await finalResponse.text();
        } else {
            finalUrl = response.url;
        }

        if (target === 'null') {
            // explizit kein Update gewünscht
            console.info("InP: data-target='null' → kein Update");
        } else if (target) {
            const parser = new DOMParser();
            const fetchedDoc = parser.parseFromString(htmlString, 'text/html');

            const parsed = parseTargets(target, targetType);
            for (const { selector, type } of parsed) {
                const newContent = fetchedDoc.querySelector(selector) || fetchedDoc.body;
                const oldContent = document.querySelector(selector);

                console.info("target:", selector, "type:", type, "old:", oldContent, "new:", newContent);

                if (oldContent && newContent) {
                    applyContent(oldContent, newContent, type);
                }
            }
        } else {
            if (window.location.href !== finalUrl) {
                history.pushState(null, '', finalUrl);
            }
            document.documentElement.innerHTML = htmlString;
        }

        if (dialog) dialog.close();
    } catch (error) {
        console.error("InP: Fehler beim Formular-Submit:", error);
    }
}

// ========== 5. Modaler Dialog (Laden & Parsen) ==========
async function createModal(href, target, extract) {
    if (!href) {
        console.error("InP: Kein href für das Modal angegeben.");
        return;
    }

    try {
        const response = await fetch(href);
        const htmlString = await response.text();
        const parser = new DOMParser();
        const fetchedDoc = parser.parseFromString(htmlString, 'text/html');

        const baseUrl = new URL(href, window.location.href).href;
        const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

        const source = extract ? fetchedDoc.querySelector(extract) : fetchedDoc.body;

        if (!source) {
            console.warn(`InP: Element "${extract}" nicht in ${href} gefunden.`);
            return;
        }

        const dialog = document.createElement('dialog');
        const dialogID = Date.now();
        dialog.dataset.inp_id = dialogID;
        dialog.classList.add('inp-modal');
        dialog.setAttribute('data-inp-src', href);

        if (target) dialog.setAttribute('data-target', target);
        dialog.appendChild(source);

        // CSS in @scope wrappen — jedes Modal hat seinen eigenen Style-Bereich
        const cssPromises = [];

        fetchedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(linkEl => {
            let styleHref = linkEl.getAttribute('href');
            if (styleHref && !styleHref.startsWith('http') && !styleHref.startsWith('/')) {
                styleHref = new URL(styleHref, base).href;
            }
            // Wenn schon global geladen: bleibt global gültig, kein Re-Load
            if (styleHref && document.querySelector(`link[href="${styleHref}"]`)) return;

            // Sonst fetchen und gescopet einhängen
            cssPromises.push(
                fetch(styleHref)
                    .then(r => r.ok ? r.text() : '')
                    .then(css => {
                        if (!css) return;
                        const styleTag = document.createElement('style');
                        styleTag.dataset.inpSource = styleHref;
                        styleTag.textContent = `@scope (dialog[data-inp_id="${dialogID}"]) {\n${css}\n}`;
                        dialog.appendChild(styleTag);
                    })
                    .catch(e => console.warn(`InP: CSS ${styleHref} konnte nicht geladen werden:`, e))
            );
        });

        fetchedDoc.querySelectorAll('style').forEach(styleEl => {
            const styleTag = document.createElement('style');
            styleTag.textContent = `@scope (dialog[data-inp_id="${dialogID}"]) {\n${styleEl.textContent}\n}`;
            dialog.appendChild(styleTag);
        });

        await Promise.all(cssPromises);

        // Externe Scripts
        fetchedDoc.querySelectorAll('script[src]').forEach(oldScript => {
            let src = oldScript.getAttribute('src');
            if (!src.startsWith('http') && !src.startsWith('/')) {
                src = new URL(src, base).href;
            }
            if (document.querySelector(`script[src="${src}"]`)) return;

            const existing = dialog.querySelector(`script[src="${src}"]`);
            const newScript = document.createElement("script");
            for (const attr of oldScript.attributes) {
                newScript.setAttribute(attr.name, attr.value);
            }
            newScript.setAttribute('src', src);

            if (existing) {
                existing.replaceWith(newScript);
            } else {
                dialog.appendChild(newScript);
            }
        });

        // Inline Scripts & Module
        let combinedInlineJS = "";
        const modulesToLoad = [];

        fetchedDoc.querySelectorAll('script:not([src])').forEach(scr => {
            if (scr.type === 'module') {
                const scriptContent = scr.textContent;
                const importRegex = /import\s+[\s\S]*?from\s+(['"].*?['"])\s*;?/gm;
                let match;
                let lastIndex = 0;
                while ((match = importRegex.exec(scriptContent)) !== null) {
                    lastIndex = importRegex.lastIndex;
                }

                const imports = scriptContent.slice(0, lastIndex);
                const userCode = scriptContent.slice(lastIndex);

                const injectionStart = `
const __MODAL = document.querySelector('.inp-modal[data-inp_id="${dialogID}"]');
const __PROXY = new Proxy(__MODAL, {
    get(target, prop) {
        if (['querySelector', 'querySelectorAll', 'getElementsByClassName', 'getElementsByTagName'].includes(prop)) {
            return target[prop].bind(target);
        }
        if (prop === 'getElementById') {
            return (id) => target.querySelector(\`[id="\${id}"]\`);
        }
        let val = prop in target ? target[prop] : window.document[prop];
        return typeof val === 'function' ? val.bind(prop in target ? target : window.document) : val;
    },
    set(target, prop, value) {
        if (prop in target) target[prop] = value;
        else window.document[prop] = value;
        return true;
    }
});
(async function(doc, modal) {
    const document = doc;
`;
                const injectionEnd = `\n}).call(__MODAL, __PROXY, __MODAL);`;

                let finalContent = imports + "\n" + injectionStart + "\n" + userCode + "\n" + injectionEnd;
                finalContent = finalContent.replace(
                    /(from\s+['"])(\.\.?\/.+?)(['"])/g,
                    (_, pre, path, quote) => pre + new URL(path, base).href + quote
                );

                modulesToLoad.push(finalContent);
            } else {
                combinedInlineJS += "\n" + scr.textContent;
            }
            scr.remove();
        });

        if (combinedInlineJS) {
            try {
                const proxy = new Proxy(dialog, {
                    get(target, prop) {
                        if (prop === 'getElementById') return (id) => target.querySelector(`[id="${id}"]`);
                        if (['querySelector', 'querySelectorAll', 'getElementsByClassName', 'getElementsByTagName'].includes(prop)) {
                            return target[prop].bind(target);
                        }
                        let val = prop in target ? target[prop] : window.document[prop];
                        return typeof val === 'function' ? val.bind(prop in target ? target : window.document) : val;
                    },
                    set(target, prop, value) {
                        if (prop in target) target[prop] = value;
                        else window.document[prop] = value;
                        return true;
                    }
                });
                const sandbox = new Function('document', combinedInlineJS);
                sandbox.call(dialog, proxy);
            } catch (e) {
                console.error("InP: Fehler im Inline-JS", e);
            }
        }

        modulesToLoad.forEach(content => {
            const blob = new Blob([content], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const tag = document.createElement('script');
            tag.type = 'module';
            tag.src = url;
            dialog.appendChild(tag);
        });

        dialog.addEventListener('close', () => dialog.remove());
        document.body.appendChild(dialog);
        dialog.showModal();

        // URL um ?inp=<href|target|extract> ergänzen (verschachtelt möglich)
        _pushInpUrl(href, target, extract);
        dialog.addEventListener('close', () => _popInpUrl(href, target, extract), { once: true });

    } catch (error) {
        console.error("InP: Fehler beim Laden des Modals:", error);
    }
}

// ========== 6. Update Target ==========
async function updateTarget(href, target, extract, targetType = 'replace') {
    if (!href || !target || target === 'null') return;
    try {
        const response = await fetch(href);
        if (!response.ok) {
            console.error(`InP: Fetch fehlgeschlagen (${response.status}) für ${href}`);
            return;
        }
        const htmlString = await response.text();
        const parser = new DOMParser();
        const fetchedDoc = parser.parseFromString(htmlString, 'text/html');

        const parsed = parseTargets(target, targetType);
        for (const { selector, type } of parsed) {
            const source = extract
                ? fetchedDoc.querySelector(extract)
                : (fetchedDoc.querySelector(selector) || fetchedDoc.body);
            const oldContent = document.querySelector(selector);

            if (oldContent && source) {
                applyContent(oldContent, source, type);
            }
        }
    } catch (error) {
        console.error("InP: Fehler beim Update:", error);
    }
}

/**
 * Splittet data-target und data-target-type per Komma und paart sie.
 * Wenn weniger Types als Targets angegeben sind, wird der letzte Type
 * für die übrigen Selektoren wiederverwendet.
 *
 * Beispiel:
 *   target="#a, #b, #c"  type="replace"
 *     → [{a, replace}, {b, replace}, {c, replace}]
 *
 *   target="#a, #b, #c"  type="beforeend, replace"
 *     → [{a, beforeend}, {b, replace}, {c, replace}]
 */
function parseTargets(target, targetType = 'replace') {
    if (!target || target === 'null') return [];

    const selectors = target.split(',').map(s => s.trim()).filter(Boolean);
    const types     = (targetType || 'replace').split(',').map(s => s.trim()).filter(Boolean);

    const lastType = types[types.length - 1] || 'replace';
    return selectors.map((sel, i) => ({
        selector: sel,
        type: types[i] || lastType
    }));
}

/**
 * Wendet neuen Content auf das Ziel-Element an.
 * targetType:
 *   'replace'      — innerHTML ersetzen (Default, behält Element-Identität)
 *   'outer'        — Element komplett ersetzen (replaceWith)
 *   'beforebegin'  — vor das Element einfügen
 *   'afterbegin'   — als erstes Child einfügen
 *   'beforeend'    — als letztes Child einfügen (append)
 *   'afterend'     — nach dem Element einfügen
 */
function applyContent(oldContent, newContent, targetType = 'replace') {
    const scrollY = window.scrollY;

    switch (targetType) {
        case 'outer':
            oldContent.replaceWith(newContent.cloneNode(true));
            break;
        case 'beforebegin':
        case 'afterbegin':
        case 'beforeend':
        case 'afterend':
            oldContent.insertAdjacentHTML(targetType, newContent.outerHTML);
            break;
        case 'replace':
        default:
            oldContent.innerHTML = newContent.innerHTML;
            break;
    }

    window.scrollTo(0, scrollY);
}

// ========== 7. Button & Helper Funktionen ==========
async function submitButton(trigger) {
    const dialog = trigger.closest('dialog');
    const form = trigger.closest('form');
    if (!form) {
        if (dialog) dialog.close();
        return;
    }
    form.requestSubmit();
}

function closeModal(trigger) {
    const dialog = trigger.closest('dialog');
    if (dialog) dialog.close();
}

function _detectRedirect(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const meta = doc.querySelector('meta[http-equiv="refresh"]');
    if (meta) {
        const part = meta.getAttribute('content').split(/url=/i)[1];
        if (part) return part.trim().replace(/['"]/g, '');
    }
    for (const script of doc.querySelectorAll('script')) {
        let code = script.textContent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
        const regex = /(?:(?:window|document)\.)?(?:location(?:\.href|\.replace)?|open)\s*(?:=|(?:\())\s*['"`]([^'"`\s\)]+)['"`](?:\s*,\s*['"]_self['"])?/i;
        const match = code.match(regex);
        if (match?.[1]) return match[1];
    }
    return null;
}

function injectCss() {
    const cssUrl = new URL('./inp.css', import.meta.url);
    if (document.querySelector(`link[href="${cssUrl.href}"]`)) return;
    document.head.insertAdjacentHTML("beforeend", `<link rel="stylesheet" href="${cssUrl.href}">`);
}
// ========== Shareable URL: ?inp=<href|target|extract>... ==========
// Mehrere inp-Parameter erlauben verschachtelte Modals.
// Format pro Modal: href|target|extract (target/extract leer falls nicht gesetzt)

const INP_PARAM = 'inp';

function _encodeInpValue(href, target, extract) {
    return [href, target || '', extract || ''].join('|');
}

function _decodeInpValue(value) {
    const parts = value.split('|');
    return {
        href:    parts[0] || '',
        target:  parts[1] || null,
        extract: parts[2] || null,
    };
}

function _pushInpUrl(href, target, extract) {
    try {
        const url = new URL(window.location.href);
        url.searchParams.append(INP_PARAM, _encodeInpValue(href, target, extract));
        history.pushState({ inp: href }, '', url.toString());
    } catch (e) { /* z.B. file:// — egal */ }
}

function _popInpUrl(href, target, extract) {
    try {
        const url = new URL(window.location.href);
        const all = url.searchParams.getAll(INP_PARAM);
        const value = _encodeInpValue(href, target, extract);
        // LIFO: den letzten Eintrag mit diesem Wert entfernen
        const idx = all.lastIndexOf(value);
        if (idx === -1) return;
        all.splice(idx, 1);
        url.searchParams.delete(INP_PARAM);
        all.forEach(v => url.searchParams.append(INP_PARAM, v));
        history.replaceState(null, '', url.toString());
    } catch (e) { /* egal */ }
}

// Beim Laden der Seite: alle ?inp=... der Reihe nach öffnen
async function _autoOpenFromUrl() {
    try {
        const url = new URL(window.location.href);
        const values = url.searchParams.getAll(INP_PARAM);
        if (!values.length) return;

        // Erst alle Parameter raus — werden beim Öffnen jedes Modals neu gesetzt
        url.searchParams.delete(INP_PARAM);
        history.replaceState(null, '', url.toString());

        // Nacheinander öffnen
        for (const value of values) {
            const { href, target, extract } = _decodeInpValue(value);
            if (href) await createModal(href, target, extract);
        }
    } catch (e) {
        console.warn("InP: Konnte Modal(s) aus URL nicht öffnen:", e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoOpenFromUrl);
} else {
    _autoOpenFromUrl();
}