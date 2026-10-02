/**
 *  @typedef {Object} UserDialog
 * @property {boolean} submit - Gibt an ob der Dialog abgebrochen oder akzeptiert wurde
 * @property {Object} data - Alle Werte aus der HTML-form
 * @property {string} action - 'submit' | 'cancel' | 'back' | eigene Aktion eines Leisten-Knopfs
 */

/**
 * @typedef {Object} BarButton
 * @property {string} icon - Material-Symbol (z. B. 'arrow_back', 'close', 'share')
 * @property {string} [title] - Tooltip / Beschriftung für Screenreader
 * @property {string} [action] - Dialog schließt mit dieser Aktion (result.action)
 * @property {Function} [onClick] - Statt zu schließen: eigene Funktion (dialog) => void
 *
 * Wo ein BarButton steht, geht auch eine Liste davon — dann stehen mehrere
 * Knöpfe nebeneinander, in der angegebenen Reihenfolge.
 */

/** Positionen: 'center' | 'top' | 'bottom' | 'left' | 'right' */
const POSITIONS = ['center', 'top', 'bottom', 'left', 'right'];

/**
 * Es wird ein Informationsdialog erstellt.
 * @param {Object} o - Parameterobjekt
 * @param {String} o.id - Id des Dialogs 
 * @param {String} o.title - Titel des Dialogs 
 * @param {String} [o.content = ""] - weiterer Dialog Text (auch HTML)
 * @param {String} o.confirmText - Text der im Bestätigungsbutton steht.
 * @param {String} [o.cancelText] - Text der im Abbrechenknopf steht.
 * @param {boolean} [o.onlyConfirm = false] - Nutzer kann nur akteptieren. (default:false)
 * @param {"normal"|"info"|"warning"|"error"} [o.type = "normal"] - normal, error, warning, info (default:normal)
 * @param {boolean} [o.detailReturn = 0] - Boolen oder UserDialog zurückgegeben wird gegeben (deafult:true)
 * @param {Function} [o.onInsert] - Funktion wird nach dem hinzufügen des Dialogs zur DOM ausgeführt (Dialog ist noch nicht sichtbar); 
 * @param {Function} [o.onSubmit] - Funktion bei erfolgreicher Abgabe ausgeführt (bevor der Dialog geschlossen ist).
 * @param {{desktop?:string, mobile?:string}|string} [o.position] - Wo der Dialog erscheint; Standard: Rechner 'center', Handy 'bottom'. Ein String gilt für beide.
 * @param {boolean} [o.modal = true] - false: Seite dahinter bleibt bedienbar (z. B. Seitenleiste neben einer Karte).
 * @param {BarButton|BarButton[]|null} [o.barLeft] - Knopf oder Knöpfe oben links; Standard: 'Zurück', wenn o.onBack gesetzt ist.
 * @param {BarButton|BarButton[]|null} [o.barRight] - Knopf oder Knöpfe oben rechts. Standard: nichts — die Leiste
 *   oben bleibt leer, bis man etwas hineinsetzt. Ein „×" zum Abbrechen gehört dorthin, wo es unten keine Fußzeile
 *   gibt: `{ icon: "close", title: "Schließen", action: "cancel" }`.
 * @param {Function} [o.onBack] - Zurück oben links: (dialog) => void – der Dialog bleibt offen.
 * @param {boolean|SheetOptions} [o.sheet = true] - Griff zum Ziehen. Gehört zum Dialog dazu: Wo er an einer Kante
 *   sitzt (am Handy also immer, am Rechner bei data-pos left/right/top/bottom), bekommt er den Griff von selbst.
 *   Ein zentrierter Dialog hat keine Kante und damit keinen Griff. `false` schaltet ihn ab, ein Objekt setzt
 *   `min`, `max`, `key`. Für Seitenleisten ohne Dialog gibt es `sheet()` auch einzeln.
 * Am Dialog-Element hängt `uDFinish(action)`: schließt den Dialog von außen und löst das Versprechen auf —
 * für Knöpfe mit eigenem `onClick`, die erst nach einer Rückfrage schließen wollen.
 *
 * @returns {Promise<{submit:boolean, data:Object}>} `boolean`, wenn die `detailReturn=false`, `Object, detailReturn=true`. 
 */

export function userDialog({
    id = Date.now(),
    title, 
    content = "", 
    confirmText, 
    cancelText="Abbrechen", 
    type = "normal", 
    onlyConfirm = false,
    detailReturn = true,
    onInsert = (dialog_id) => { }, 
    onSubmit = (dialog_id, dialogData) => { },
    position = {},
    modal = true,
    onBack = null,
    sheet: sheetOpts = true,
    barLeft = onBack ? { icon: "arrow_back", title: "Zurück", onClick: onBack } : null,
    barRight = null,
}) {
    injectCss();
    const pos = typeof position === "string" ? { desktop: position, mobile: position } : position;
    const posAttr = (k, attr) => POSITIONS.includes(pos[k]) ? ` ${attr}="${pos[k]}"` : "";
    // Je Seite ein Knopf oder mehrere. Die Seitenklasse bleibt an jedem
    // Knopf, damit `querySelector(".uD-bar-right")` weiterhin einen Knopf
    // findet und nicht eine Hülle darum.
    const liste = (b) => (Array.isArray(b) ? b : [b]).filter(Boolean);
    const barButton = (b, side) => {
        const knoepfe = liste(b);
        if (!knoepfe.length) return `<span class="uD-bar-space"></span>`;
        const einzeln = knoepfe.map((k, i) =>
            `<button type="button" class="button uD-bar-btn uD-bar-${side}" data-bar="${side}:${i}" data-shape="round no-background" title="${k.title ?? ""}" aria-label="${k.title ?? k.icon}"><span class="msr">${k.icon}</span></button>`
        ).join("");
        return knoepfe.length === 1 ? einzeln : `<span class="uD-bar-group uD-bar-group-${side}">${einzeln}</span>`;
    };


    // ===
    // Dialog-Typ wird ausgewertet und ggf. werden Icons hinzugefügt
    // ===
    let image = "";
    switch (type) {
        case "warning":
            image = `<span class="msr info_img">warning</span>`;
            break;
        case "error":
            image = `<span class="msr info_img">warning</span>`;
            break;
        case "info":
            image = `<span class="msr info_img">info</span>`;
            break;
        default:
            break;
    }

    // ===
    // Eigentlicher Dialog wird erstellt und zur DOM hinzugefügt
    // ===
    const markup = `
    <dialog id="${id}" class="userDialog" data-dialog-type="${type}"${posAttr("desktop", "data-pos")}${posAttr("mobile", "data-pos-mobile")}>
        <form novalidate class="uD-form${confirmText ? "" : " uD-no-footer"}">
            <div class="content">
                <header class="uD-header">${barButton(barLeft, "left")}<span class="uD-title">${title}</span>${barButton(barRight, "right")}</header>
                ${image}
                <main class="uD-main">
                    ${content}
                </main>
            </div>
${confirmText ? `            <footer class="uD-footer">
                <button class="button dialog_close" style="${onlyConfirm? "display:none":""}">${cancelText}</button>
                <button type="submit" class="button dialog_submit" data="images">${confirmText}</button>
            </footer>` : ""}
        </form>
    </dialog>
    `;
    document.body.insertAdjacentHTML("beforeend", markup);
    const dialog = document.querySelector(`[id="${id}"]`);
    
    // ===
    // Vom Programierer übergebene Custom-Funktion wird ausgeführt.
    // ===
    onInsert(id);
    
    // ===
    // Dialog wird für den Nutzer sichtbar geschalten 
    // ===
    // Der Griff gehört dazu. Er hängt an der Lage, das Blockieren an
    // `modal` — zwei Fragen, zwei Antworten. Ein blockierender Dialog
    // lässt sich ziehen, aber nicht wegklappen: Sonst stünde die Seite
    // still hinter einem Griff.
    if (sheetOpts) {
        sheet(dialog, { ...(sheetOpts === true ? {} : sheetOpts), collapsible: !modal });
    }
    if (modal) dialog.showModal(); else dialog.show();
    
    
    return new Promise((resolve) => {
        const finish = (action) => {
            dialog.close();
            dialog.remove();
            detailReturn ? resolve({submit:false, data:{}, action}) : resolve(false);
        };
        // Schließen von außen: Wer einen Knopf oben mit `onClick` belegt hat,
        // entscheidet selbst, wann Schluss ist (z. B. erst nach einer
        // Rückfrage). Ohne das bliebe das Versprechen für immer offen.
        dialog.uDFinish = finish;
        if (dialog.querySelector(".dialog_close") != null) {
            dialog.querySelector(".dialog_close").addEventListener("click", function (e) {
                e.preventDefault();
                finish("cancel");
            });
        }
        // Knöpfe oben: eigene Funktion (Dialog bleibt offen) oder schließen mit Aktion
        const seiten = { left: liste(barLeft), right: liste(barRight) };
        dialog.querySelectorAll("[data-bar]").forEach((btn) => {
            const [seite, i] = btn.dataset.bar.split(":");
            const b = seiten[seite]?.[Number(i)];
            if (!b) return;
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                if (typeof b.onClick === "function") b.onClick(dialog);
                else finish(b.action ?? "cancel");
            });
        });
        // Esc = Schließen
        dialog.addEventListener("cancel", (e) => {
            e.preventDefault();
            if (!onlyConfirm) finish("cancel");
        });

        dialog.querySelector(`form`).addEventListener("submit", (e) => {
            e.preventDefault();
            const dialogData = tryToSubmit(dialog);
            onSubmit(id, dialogData);
            if(dialogData !== null) {
                dialog.close();
                dialog.remove();
                detailReturn ? resolve({submit:true, data:dialogData, action:"submit"}) : resolve(true);
            }
        });

        dialog.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && confirmText && !e.target.matches("textarea, button")) {
                e.preventDefault();
                const dialogData = tryToSubmit(dialog);
                onSubmit(id, dialogData);
 
                if(dialogData !== null) {
                    dialog.close();
                    dialog.remove();
                    detailReturn ? resolve({submit:true, data:dialogData, action:"submit"}) : resolve(true);
                }
            }
        });        
    });
}

/**
 * @typedef {Object} SheetOptions
 * @property {number} [min=300] - kleinste Breite in px (am Handy: Höhe, Standard 160)
 * @property {number} [max] - größte Breite in px (Standard 70 % der Fensterbreite, am Handy 92 % der Höhe)
 * @property {string} [key] - Name, unter dem sich der Browser Größe und Zustand merkt
 * @property {(state:{collapsed:boolean, size:number, side:string}) => void} [onChange] - nach jeder Änderung
 * @property {boolean} [collapsible=true] - false: Ziehen ja, Einklappen nein (für blockierende Dialoge)
 */

/**
 * Seitenleiste zum Ziehen: ein Dialog am Rand, hinter dem die Seite bedienbar
 * bleibt (kein Hintergrund, kein modal) – z. B. eine Liste neben einer Karte.
 *
 * Wo er sitzt, sagen `data-pos` (Rechner: left | right, volle Höhe) und
 * `data-pos-mobile` (Handy: bottom). Ein Griff läuft über die ganze Kante:
 *   - ziehen ändert Breite bzw. Höhe zwischen `min` und `max`
 *   - weiter als `min` gezogen → eingeklappt, nur der Griff bleibt sichtbar
 *   - antippen (oder Enter/Leertaste) → ein- bzw. ausklappen
 *   - Pfeiltasten auf dem Griff → größer/kleiner
 * Auf dem Dialog kommt das Ereignis `uD-sheet` mit `{collapsed, size, side}`.
 *
 * @param {HTMLDialogElement} dialog
 * @param {SheetOptions} [o]
 * @returns {{collapse:(on:boolean)=>void, readonly collapsed:boolean, readonly size:number}}
 */
export function sheet(dialog, { min, max, key = null, onChange = () => {}, collapsible = true } = {}) {
    injectCss();
    if (dialog._uDSheet) return dialog._uDSheet;
    const grip = document.createElement("div");
    grip.className = "uD-grip";
    grip.tabIndex = 0;
    grip.setAttribute("role", "separator");
    grip.innerHTML = "<span></span>";
    dialog.prepend(grip);

    const mobile = matchMedia("(max-width: 700px)");
    // Ohne Angabe sitzt der Dialog am Rechner in der Mitte und am Handy
    // unten — genau wie im CSS. „center" heißt: an keiner Kante, also kein
    // Griff; beim Wechsel der Fensterbreite kann sich das ändern.
    const side = () => mobile.matches ? (dialog.dataset.posMobile || "bottom") : (dialog.dataset.pos || "center");
    const amRand = () => side() !== "center";
    const vertical = () => ["top", "bottom"].includes(side());
    const minSize = () => min ?? (vertical() ? 160 : 300);
    const maxSize = () => max ?? (vertical() ? innerHeight * 0.92 : innerWidth * 0.7);
    const store = key ? `uD-sheet:${key}` : null;
    const saved = (() => { try { return JSON.parse(localStorage.getItem(store)) ?? {}; } catch { return {}; } })();
    let state = { collapsed: !!saved.collapsed, size: { h: saved.h ?? null, v: saved.v ?? null } };

    const apply = () => {
        // Zentriert: kein Griff, keine Sheet-Maße.
        dialog.classList.toggle("uD-sheet", amRand());
        // Blockierende Dialoge behalten ihren Hintergrund (siehe CSS).
        dialog.classList.toggle("uD-sheet-modal", !collapsible);
        grip.hidden = !amRand();
        if (!amRand()) {
            dialog.style.removeProperty("--uD-sheet-size");
            dialog.classList.remove("uD-collapsed");
            return;
        }

        const s = state.size[vertical() ? "v" : "h"];
        if (s) dialog.style.setProperty("--uD-sheet-size", `${Math.round(Math.min(maxSize(), Math.max(minSize(), s)))}px`);
        else dialog.style.removeProperty("--uD-sheet-size");
        dialog.classList.toggle("uD-collapsed", state.collapsed);
        grip.setAttribute("aria-orientation", vertical() ? "horizontal" : "vertical");
        grip.setAttribute("aria-expanded", String(!state.collapsed));
        grip.title = state.collapsed
            ? "Aufklappen"
            : collapsible ? "Ziehen: Größe ändern · Antippen: einklappen" : "Ziehen: Größe ändern";
    };
    const changed = () => {
        apply();
        if (store) try { localStorage.setItem(store, JSON.stringify({ collapsed: state.collapsed, h: state.size.h, v: state.size.v })); } catch { /* egal */ }
        const detail = { collapsed: state.collapsed, size: state.size[vertical() ? "v" : "h"] ?? (vertical() ? dialog.offsetHeight : dialog.offsetWidth), side: side() };
        onChange(detail);
        dialog.dispatchEvent(new CustomEvent("uD-sheet", { detail }));
    };
    const sizeAt = (e) => ({ left: e.clientX, right: innerWidth - e.clientX, bottom: innerHeight - e.clientY, top: e.clientY }[side()]);

    let drag = null;
    grip.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        // Keine Textauswahl und kein natives Ziehen – beides hielt in WebKit
        // die Maus fest, danach ließ sich die Seite dahinter nicht mehr ziehen
        e.preventDefault();
        drag = { x: e.clientX, y: e.clientY, moved: false, was: state.collapsed, id: e.pointerId };
        grip.setPointerCapture(e.pointerId);
        dialog.classList.add("uD-dragging");
    });
    grip.addEventListener("pointermove", (e) => {
        if (!drag) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
        drag.moved = true;
        const want = sizeAt(e);
        // Unter das Minimum gezogen: gleich zeigen, dass es gleich zuklappt.
        // Bei einem blockierenden Dialog bleibt es beim Minimum.
        state.collapsed = collapsible && want < minSize() * 0.6;
        if (!state.collapsed) state.size[vertical() ? "v" : "h"] = Math.min(maxSize(), Math.max(minSize(), want));
        apply();
    });
    const end = (e) => {
        if (!drag) return;
        const d = drag;
        drag = null;
        // Ausdrücklich freigeben: WebKit (GNOME Web, Safari) gab den Zeiger nach
        // dem Loslassen nicht immer frei – alle weiteren Mausbewegungen landeten
        // beim Griff, die Karte dahinter reagierte nicht mehr
        if (grip.hasPointerCapture?.(d.id)) grip.releasePointerCapture(d.id);
        dialog.classList.remove("uD-dragging");
        if (!d.moved && e.type === "pointerup" && collapsible) state.collapsed = !state.collapsed;
        getSelection?.()?.removeAllRanges();
        changed();
    };
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
    grip.addEventListener("lostpointercapture", end);
    grip.addEventListener("keydown", (e) => {
        const grow = { left: "ArrowRight", right: "ArrowLeft", bottom: "ArrowUp", top: "ArrowDown" }[side()];
        const shrink = { left: "ArrowLeft", right: "ArrowRight", bottom: "ArrowDown", top: "ArrowUp" }[side()];
        const k = vertical() ? "v" : "h";
        const now = state.size[k] ?? (vertical() ? dialog.offsetHeight : dialog.offsetWidth);
        if (e.key === "Enter" || e.key === " ") { if (!collapsible) return; state.collapsed = !state.collapsed; }
        else if (e.key === grow) { state.collapsed = false; state.size[k] = Math.min(maxSize(), now + 40); }
        else if (e.key === shrink) {
            if (now - 40 < minSize()) { if (!collapsible) return; state.collapsed = true; }
            else state.size[k] = now - 40;
        }
        else return;
        e.preventDefault();
        changed();
    });
    mobile.addEventListener("change", apply);
    addEventListener("resize", apply);
    apply();

    dialog._uDSheet = {
        collapse(on) { if (!collapsible) return; state.collapsed = !!on; changed(); },
        get collapsed() { return state.collapsed; },
        get size() { return vertical() ? dialog.offsetHeight : dialog.offsetWidth; },
    };
    return dialog._uDSheet;
}

/**
 * @param {HTMLDialogElement} dialog - Htmldialog der versucht werden soll erfolgreich zu schließen.
 * @returns {Object} Alle Werte der Form werden zurück gegeben. 
 */
function tryToSubmit(dialog){
    const form = dialog.querySelector(`form`)
    // Überprfung, ob form valide ist
    if(!validateForm(form)){
        form.querySelector(`:invalid`).setAttribute("active", "");
        form.querySelector(`:valid`).removeAttribute("active");
        return null;
    }
    const formData = new FormData(form);
    
    form.querySelectorAll('input[type="checkbox"][data-shape="toggle"]').forEach(cb => {
        formData.set(cb.name, cb.checked ? "true" : "false");
    });

    //Form Daten werden als Object extrahiert
    const data = {};
    const processedKeys = new Set();

    for (let [key, val] of formData.entries()) {
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        const rawValues = formData.getAll(key);
        const allConvertible = rawValues.every(v => {
            if (v === "true" || v === "false") return true; // Booleans sind okay
            if (v !== "" && !isNaN(v)) return true;         // Zahlen sind okay
            return false;                                   // Alles andere (Strings) nicht
        });

        const allValues = allConvertible 
            ? rawValues.map(v => {
                if (v === "true") return true;
                if (v === "false") return false;
                return Number(v);
            }) 
            : rawValues;

        const rootKey = key.split('[')[0];
        const matches = [...key.matchAll(/\[(.*?)\]/g)].map(m => m[1]);

        const element = dialog.querySelector(`[name="${key}"]`);
        const isMultiple = element && (element.multiple || (element.type === 'checkbox' && !element.dataset.shape == "toggle")) ;
        if (matches.length === 0) {
            if (isMultiple) {
                // Bei Multiple-Select oder Checkboxen IMMER ein Array, auch wenn leer oder nur 1 Wert
                data[rootKey] = allValues;
            } else {
                // Bei normalen Inputs/Selects: Einzelwert (oder null/leer)
                data[rootKey] = allValues.length > 0 ? allValues[0] : "";
            }
            continue;
        }

        // Wurzel initialisieren
        if (!data[rootKey]) {
            data[rootKey] = (matches[0] === "" || !isNaN(matches[0])) ? [] : {};
        }

        // Jetzt verteilen wir jeden Wert aus allValues an die richtige Stelle im Baum
        allValues.forEach((value, index) => {
            let current = data[rootKey];
            
            for (let i = 0; i < matches.length; i++) {
                const p = matches[i];
                const isLast = i === matches.length - 1;

                // Logik für targetKey:
                // Wenn p leer ist, nutzen wir den 'index' aus allValues, 
                // um die Werte der verschiedenen Felder (id, transSemi) zu synchronisieren.
                let targetKey = p === "" ? index : p;

                if (isLast) {
                    current[targetKey] = value;
                } else {
                    const nextP = matches[i + 1];
                    if (!current[targetKey]) {
                        current[targetKey] = (nextP === "" || !isNaN(nextP)) ? [] : {};
                    }
                    current = current[targetKey];
                }
            }
        });
    }
    return data;
}


function validateForm(form){
    let valid = true;
    [...form.querySelectorAll('input[required], select[required], textarea[required]')].every(input => {
        // Überprüfen, ob das Eingabefeld oder sein übergeordnetes Element ausgeblendet ist
        if(!isVisible(input)) return true;

        if (!input.checkValidity()) {
            input.reportValidity(); // Zeigt native Validierungsmeldung an
            
            valid = false;
            return false;
        }
        return true;
    });
    return valid;
}

function isVisible(element) {
    // Überprüfen, ob das Element oder eines seiner übergeordneten Elemente ausgeblendet ist
    while (element) {
        if(element.hasAttribute("validate")) return true;

        if (window.getComputedStyle(element).display === 'none') {
        return false;
        }
        element = element.parentElement;
    }
    return true;
}

function injectCss(){
    const cssUrl = new URL('./userDialog.css', import.meta.url);
    if (document.querySelector(`link[href="${cssUrl.href}"]`)) return; 
    const cssLink = `<link rel="stylesheet" href="${cssUrl.href}">`;
    document.head.insertAdjacentHTML("beforeend", cssLink);
}