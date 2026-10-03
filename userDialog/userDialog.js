/**
 *  @typedef {Object} UserDialog
 * @property {boolean} submit - Gibt an ob der Dialog abgebrochen oder akzeptiert wurde
 * @property {Object} data - Alle Werte aus der HTML-form
 * @property {string} action - 'submit' | 'cancel' | 'back' | eigene Aktion eines Leisten-Knopfs
 */

/**
 * @typedef {Object} BarButton - ein runder Knopf in der Leiste oben
 * @property {string} icon - Inhalt des Knopfs als HTML: `<span class="msr">close</span>`,
 *   `<span class="mein-icon"></span>` oder einfach Text
 * @property {string} [class] - zusätzliche Klasse(n) am Knopf
 * @property {string} [title] - Tooltip / Beschriftung für Screenreader
 * @property {string} [action] - Dialog schließt mit dieser Aktion (result.action)
 * @property {Function} [onClick] - Statt zu schließen: eigene Funktion (dialog) => void
 */

/**
 * @typedef {BarButton|BarButton[]|string|null} BarSide - eine Seite der Leiste oben:
 *   ein Knopf, eine Liste davon (nebeneinander, in dieser Reihenfolge) oder rohes HTML.
 *   Im rohen HTML schließt ein Element mit `data-action="…"` den Dialog mit dieser
 *   Aktion; alles andere verdrahtet man selbst (z. B. in `onInsert`).
 */

/** Positionen: 'center' | 'full' | 'top' | 'bottom' | 'left' | 'right' — 'full' füllt den ganzen Bildschirm */
const POSITIONS = ['center', 'full', 'top', 'bottom', 'left', 'right'];

/** Voreinstellung: am Handy von unten, am Rechner mittig. */
const POS_DEFAULT = { small: 'bottom', wide: 'center' };

/** Position → { small, wide }. Ein String gilt für beide. */
function resolvePosition(position) {
    const p = typeof position === "string" ? { small: position, wide: position } : (position ?? {});
    const pick = (v, d) => POSITIONS.includes(v) ? v : d;
    return { small: pick(p.small, POS_DEFAULT.small), wide: pick(p.wide, POS_DEFAULT.wide) };
}

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
 * @param {{small?:string, wide?:string}|string} [o.position] - Wo der Dialog erscheint: 'center' | 'full' | 'top' |
 *   'bottom' | 'left' | 'right' ('full' = ganzer Bildschirm). Ein String gilt für Handy und Rechner, `{ small, wide }` je eins davon. Standard: Handy
 *   (≤ 700 px) 'bottom', Rechner 'center'. Am Dialog steht es als `data-pos-small` / `data-pos-wide`.
 * @param {boolean} [o.backgroundUsage = false] - true: die Seite dahinter bleibt bedienbar (z. B. Seitenleiste neben
 *   einer Karte); der Dialog lässt sich dann an seinem Griff auch wegklappen. Am Dialog steht es als
 *   `data-background-usage`.
 * @param {BarSide} [o.barLeft] - links vom Titel; Standard: Pfeil zurück, wenn o.onBack gesetzt ist.
 * @param {BarSide} [o.barRight] - rechts vom Titel; Standard: nichts. Ein „×" zum Abbrechen gehört dorthin,
 *   wo es unten keine Fußzeile gibt. Eine leere Seite gibt ihren Platz dem Titel — ohne Knöpfe reicht er über
 *   die ganze Breite.
 * @param {Function} [o.onBack] - Zurück oben links: (dialog) => void – der Dialog bleibt offen.
 * Der Griff zum Ziehen gehört dazu und braucht keine Angabe: Jeder Dialog an einer Kante hat ihn. Kleiner geht
 *   immer, größer nur bis der ganze Inhalt dasteht.
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
    onInsert = () => {},
    onSubmit = () => {},
    position = POS_DEFAULT,
    backgroundUsage = false,
    onBack = null,
    barLeft = onBack ? { icon: `<span class="msr">arrow_back</span>`, title: "Zurück", onClick: onBack } : null,
    barRight = null,
}) {
    injectCss();
    const pos = resolvePosition(position);
    const background = !!backgroundUsage;

    // Je Seite: rohes HTML, ein oder mehrere runde Knöpfe — oder nichts,
    // dann gehört der Platz dem Titel.
    const liste = (b) => (Array.isArray(b) ? b : [b]).filter(Boolean);
    const seiten = { left: barLeft, right: barRight };
    const slot = (side) => {
        const inhalt = seiten[side];
        if (typeof inhalt === "string") {
            return inhalt.trim() ? `<span class="uD-bar-slot uD-bar-raw uD-bar-group-${side}">${inhalt}</span>` : "";
        }
        const knoepfe = liste(inhalt);
        if (!knoepfe.length) return "";
        // Die Seitenklasse bleibt an jedem Knopf, damit
        // `querySelector(".uD-bar-right")` weiterhin einen Knopf findet.
        const einzeln = knoepfe.map((k, i) =>
            `<button type="button" class="button uD-bar-btn uD-bar-${side}${k.class ? ` ${k.class}` : ""}" data-bar="${side}:${i}" data-shape="round no-background" title="${k.title ?? ""}" aria-label="${k.title ?? ""}">${k.icon ?? ""}</button>`
        ).join("");
        return `<span class="uD-bar-slot uD-bar-group uD-bar-group-${side}">${einzeln}</span>`;
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
    <dialog id="${id}" class="userDialog" data-dialog-type="${type}" data-pos-small="${pos.small}" data-pos-wide="${pos.wide}"${background ? " data-background-usage" : ""}>
        <form novalidate class="uD-form${confirmText ? "" : " uD-no-footer"}">
            <div class="content">
                <header class="uD-header">${slot("left")}<span class="uD-title">${title}</span>${slot("right")}</header>
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
    // Der Griff gehört dazu. Ob er da ist, hängt an Lage und Inhalt, das
    // Blockieren an `backgroundUsage` — zwei Fragen, zwei Antworten. Ein
    // blockierender Dialog lässt sich vergrößern, aber nicht wegklappen:
    // Sonst stünde die Seite still hinter einem Griff.
    const griffWeg = griff(dialog, background);
    if (background) dialog.show(); else dialog.showModal();

    // Zu: Listener am Fenster abräumen, Dialog aus dem DOM.
    const schliessen = () => {
        griffWeg();
        dialog.close();
        dialog.remove();
    };

    return new Promise((resolve) => {
        const finish = (action) => {
            schliessen();
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
        dialog.querySelectorAll("[data-bar]").forEach((btn) => {
            const [seite, i] = btn.dataset.bar.split(":");
            const b = liste(seiten[seite])[Number(i)];
            if (!b) return;
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                if (typeof b.onClick === "function") b.onClick(dialog);
                else finish(b.action ?? "cancel");
            });
        });
        // Rohes HTML in der Leiste: data-action schließt mit dieser Aktion.
        dialog.querySelectorAll(".uD-bar-raw [data-action]").forEach((el) => {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                finish(el.dataset.action);
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
                schliessen();
                detailReturn ? resolve({submit:true, data:dialogData, action:"submit"}) : resolve(true);
            }
        });

        dialog.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && confirmText && !e.target.matches("textarea, button")) {
                e.preventDefault();
                const dialogData = tryToSubmit(dialog);
                onSubmit(id, dialogData);
 
                if(dialogData !== null) {
                    schliessen();
                    detailReturn ? resolve({submit:true, data:dialogData, action:"submit"}) : resolve(true);
                }
            }
        });        
    });
}

/**
 * Der Griff zum Vergrößern — Teil jedes Dialogs, nicht einzeln aufrufbar.
 *
 * Jeder Dialog an einer Kante hat ihn, ein mittiger oder bildschirmfüllender nicht. Lage und
 * Verhalten stehen in `data-pos-small`, `data-pos-wide` und
 * `data-background-usage`:
 *   - oben/unten: kleiner ziehen geht, größer nur bis der ganze Inhalt
 *     dasteht (höchstens bis zur Höhe beim Öffnen)
 *   - links/rechts: Breite zwischen 300 px und drei Vierteln des Fensters
 *   - mit `data-background-usage` lässt er sich bis auf den Griff
 *     hinausschieben; antippen oder herausziehen holt ihn zurück, seitlich
 *     mit der kleinsten Breite. Ohne bliebe die Seite still hinter einem Griff
 *
 * Der Griff läuft über die ganze Kante: ziehen ändert die Größe, antippen
 * klappt ein und aus (nur mit Hintergrund-Nutzung), Pfeiltasten machen
 * größer und kleiner. Der Zustand steht am Dialog: `data-resizable`,
 * `data-collapsed`, `data-dragging`, die Größe in `--uD-size`.
 *
 * @param {HTMLDialogElement} dialog
 * @param {boolean} einklappbar - true bei `backgroundUsage`
 * @returns {() => void} räumt die Listener am Fenster wieder ab
 */
function griff(dialog, einklappbar) {
    const grip = document.createElement("div");
    grip.className = "uD-grip";
    grip.tabIndex = 0;
    grip.setAttribute("role", "separator");
    grip.innerHTML = "<span></span>";
    dialog.prepend(grip);

    const small = matchMedia("(max-width: 700px)");
    const side = () => small.matches
        ? (dialog.dataset.posSmall || POS_DEFAULT.small)
        : (dialog.dataset.posWide || POS_DEFAULT.wide);
    const vertical = () => ["top", "bottom"].includes(side());
    // Oben und unten: kleiner ziehen geht, größer nur bis zur Höhe beim
    // Öffnen — dann steht der ganze Inhalt da, oder der Dialog hat seine
    // Höchsthöhe erreicht. Mehr Platz, als der Inhalt braucht, gibt es nicht.
    // Wächst der Inhalt, wächst die Grenze mit (gemessen, solange niemand
    // gezogen hat).
    let voll = 0;
    const miss = () => { if (!dialog.style.getPropertyValue("--uD-size")) voll = dialog.offsetHeight; };
    // Mittig und im Vollbild gibt es keine freie Kante — also keinen Griff.
    const ziehbar = () => !["center", "full"].includes(side());
    const minSize = () => vertical() ? Math.min(160, voll || 160) : 300;
    const maxSize = () => vertical() ? (voll || innerHeight * 0.9) : innerWidth * 0.75;
    // Hinausschieben bis auf den Griff nur, wenn die Seite dahinter
    // bedienbar bleibt — sonst stünde sie still hinter einem Griff.
    const klappbar = () => einklappbar;
    const state = { collapsed: false, size: { h: null, v: null } };
    const setze = (name, an) => dialog.toggleAttribute(name, !!an);

    const apply = () => {
        const an = ziehbar();
        setze("data-resizable", an);
        grip.hidden = !an;
        if (!an) {
            dialog.style.removeProperty("--uD-size");
            setze("data-collapsed", false);
            return;
        }
        const s = state.size[vertical() ? "v" : "h"];
        if (s) dialog.style.setProperty("--uD-size", `${Math.round(Math.min(maxSize(), Math.max(minSize(), s)))}px`);
        else dialog.style.removeProperty("--uD-size");
        setze("data-collapsed", state.collapsed);
        grip.setAttribute("aria-orientation", vertical() ? "horizontal" : "vertical");
        grip.setAttribute("aria-expanded", String(!state.collapsed));
        grip.title = state.collapsed
            ? "Aufklappen"
            : klappbar() ? "Ziehen: Größe ändern · Antippen: einklappen" : "Ziehen: Größe ändern";
    };
    const sizeAt = (e) => ({ left: e.clientX, right: innerWidth - e.clientX, bottom: innerHeight - e.clientY, top: e.clientY }[side()]);

    let drag = null;
    grip.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        // Keine Textauswahl und kein natives Ziehen – beides hielt in WebKit
        // die Maus fest, danach ließ sich die Seite dahinter nicht mehr ziehen
        e.preventDefault();
        drag = { x: e.clientX, y: e.clientY, moved: false, was: state.collapsed, id: e.pointerId };
        // Ohne aktiven Zeiger (etwa ein Ereignis aus einem Skript) wirft das —
        // gezogen wird trotzdem.
        try { grip.setPointerCapture(e.pointerId); } catch { /* egal */ }
        setze("data-dragging", true);
    });
    grip.addEventListener("pointermove", (e) => {
        if (!drag) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
        drag.moved = true;
        const want = sizeAt(e);
        // Unter das Minimum gezogen: gleich zeigen, dass es gleich zuklappt.
        // Bei einem blockierenden Dialog bleibt es beim Minimum.
        // Seitlich eingeklappt und herausgezogen: wieder da, mit der
        // kleinsten Breite.
        if (drag.was && !vertical()) {
            const raus = want > sizeAt({ clientX: drag.x, clientY: drag.y });
            state.collapsed = !raus;
            if (raus) state.size.h = minSize();
            apply();
            return;
        }
        state.collapsed = klappbar() && want < minSize() * 0.6;
        if (!state.collapsed) state.size[vertical() ? "v" : "h"] = Math.min(maxSize(), Math.max(minSize(), want));
        apply();
    });
    const end = (e) => {
        if (!drag) return;
        const d = drag;
        drag = null;
        // Ausdrücklich freigeben: WebKit (GNOME Web, Safari) gab den Zeiger nach
        // dem Loslassen nicht immer frei – alle weiteren Mausbewegungen landeten
        // beim Griff, die Seite dahinter reagierte nicht mehr
        if (grip.hasPointerCapture?.(d.id)) grip.releasePointerCapture(d.id);
        setze("data-dragging", false);
        // Gleich nach dem Ziehen kommt oft noch ein click — der ist kein
        // Antippen. Nicht immer, daher nur kurz sperren.
        if (d.moved) gezogen = performance.now();
        getSelection?.()?.removeAllRanges();
        apply();
    };
    // Antippen klappt ein und aus. Über click statt pointerup, damit es
    // auch per Tastatur-Hilfen und Screenreader geht. Wieder heraus kommt
    // er mit der kleinsten Größe; größer zieht man ihn danach selbst.
    let gezogen = 0;
    grip.addEventListener("click", () => {
        if (performance.now() - gezogen < 400) return;
        if (!klappbar()) return;
        state.collapsed = !state.collapsed;
        if (!state.collapsed && !vertical()) state.size.h = minSize();
        apply();
    });
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
    grip.addEventListener("lostpointercapture", end);
    grip.addEventListener("keydown", (e) => {
        const grow = { left: "ArrowRight", right: "ArrowLeft", bottom: "ArrowUp", top: "ArrowDown" }[side()];
        const shrink = { left: "ArrowLeft", right: "ArrowRight", bottom: "ArrowDown", top: "ArrowUp" }[side()];
        const k = vertical() ? "v" : "h";
        const now = state.size[k] ?? (vertical() ? dialog.offsetHeight : dialog.offsetWidth);
        if (e.key === "Enter" || e.key === " ") {
            if (!klappbar()) return;
            state.collapsed = !state.collapsed;
            if (!state.collapsed && !vertical()) state.size.h = minSize();
        }
        else if (e.key === grow) { state.collapsed = false; state.size[k] = Math.min(maxSize(), now + 40); }
        else if (e.key === shrink) {
            if (now - 40 < minSize()) { if (!klappbar()) return; state.collapsed = true; }
            else state.size[k] = now - 40;
        }
        else return;
        e.preventDefault();
        apply();
    });

    const neu = () => { state.size.v = state.size.h = null; apply(); miss(); };
    small.addEventListener("change", neu);
    addEventListener("resize", apply);
    // Wie viel Platz der Inhalt braucht, steht erst fest, wenn der Dialog
    // sichtbar ist — und ändert sich, wenn Inhalt dazukommt.
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (!drag) miss(); }) : null;
    ro?.observe(dialog);
    const main = dialog.querySelector(".uD-main");
    if (main) ro?.observe(main);
    apply();
    requestAnimationFrame(miss);

    return () => {
        small.removeEventListener("change", neu);
        removeEventListener("resize", apply);
        ro?.disconnect();
    };
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