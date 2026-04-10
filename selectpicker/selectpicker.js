/**
 * @typedef {Object} TranslationSet
 * @property {string} [de] - Deutscher Text
 * @property {string} [en] - Englischer Text
 */

/**
 * @typedef {Object} BaseConfig
 * @property {string} [lang='de'] - Die Initial-Sprache (z.B. 'de', 'en'). Default: Auto-Detect.
 * @property {Object.<string, TranslationSet>} [translations] - Eigene Übersetzungen für Buttons etc.
 */

/**
 * BASIS KLASSE
 * Verwaltet Styles, Sprachen und allgemeine Popover-Mechaniken.
 */
class PickerBase {
    /**
     * Erstellt die Basis-Instanz.
     * @param {BaseConfig} config
     */
    constructor(config = {}) {
        this.translations = config.translations || {
            de: { save: "Speichern", cancel: "Abbrechen", search: "Suche...", search_nodata: "Keine Daten ...", reset: "Zurücksetzen", empty: "Nichts gewählt..." },
            en: { save: "Save",      cancel: "Cancel",    search: "Search...", search_nodata: "Nothing found ...", reset: "Reset",          empty: "Nothing selected..." }
        };

        const browserLang = navigator.language.split('-')[0];
        this.lang  = config.lang || (this.translations[browserLang] ? browserLang : 'en');
        this.txt   = this.translations[this.lang];
        this.groups = {};
        this.injectCss();
    }

    createGroup(groupName, customClass) {
        this.groups[groupName] = customClass;
    }

    resolveLangString(input) {
        if (typeof input === 'string') return input;
        if (typeof input === 'object') {
            return input[this.lang] || input['en'] || Object.values(input)[0] || '';
        }
        return '';
    }

    t(key) { return this.txt[key] || key; }

    injectCss() {
        const cssUrl = new URL('./selectpicker.css', import.meta.url);
        if (document.querySelector(`link[href="${cssUrl.href}"]`)) return;
        document.head.insertAdjacentHTML("beforeend", `<link rel="stylesheet" href="${cssUrl.href}">`);
    }
}

/**
 * @typedef {Object} SelectPickerOptions
 * @property {string|TranslationSet} [title]  - Überschrift. Wenn gesetzt → Header sichtbar.
 * @property {string}  [group='default']       - Style-Gruppe (siehe createGroup).
 * @property {boolean} [search]                - false = nie Suche. Sonst auto (>5 Einträge).
 * @property {boolean} [saveButton=false]      - Speichern-Knopf (für Multi).
 * @property {boolean} [showControls=false]    - Close/Reset Buttons im Header.
 * @property {boolean} [forceJsPosition=false] - JS-Positionierung erzwingen.
 */

/**
 * @typedef {Object} SelectInstance
 * @property {string}           id               - ID für den Picker
 * @property {HTMLSelectElement} originalSelect  - Das originale <select>-Element
 * @property {boolean}          forceJsPosition  - Ob Position nur mit js gemacht wird oder nur als fallback
 * @property {boolean}          isMulti          - Ob Multiselect aktiv ist
 * @property {number}           max              - Maximale Anzahl an selects
 * @property {number}           min              - Mindest Anzahl ausgewählter selects
 * @property {string}           group            - Name der Style-Gruppe
 * @property {boolean}          isOpen           - Ob der Picker geöffnet ist
 * @property {boolean}          existDefaultData - Ob Standardwerte vorhanden sind
 * @property {string[]}         tempValue        - Aktuell ausgewählte Werte (vor dem Speichern)
 * @property {HTMLElement}      triggerElm       - Das Trigger-Element
 * @property {HTMLElement}      popover          - Das Popover-Element
 * @property {string[]}         defaultValues    - Liste der Standardwerte
 * 
 * @property {Function}         open             - Öffnet den Picker
 * @property {Function}         close            - Schließt den Picker
 * @property {Function}         saveAndClose     - Speichert und schließt den Picker
 * @property {Function}         reset            - Setzt den Picker zurück
 */

/**
 * SPEZIALISIERTE KLASSE
 * Für Select und Multiselect Inputs.
 *
 * Auto-Init: Selects mit [data-sp-picker] werden automatisch erkannt.
 *   <select data-sp-picker>                       → Picker ohne Titel
 *   <select data-sp-picker="Person wählen">       → Picker mit Titel
 *   <select data-sp-picker data-sp-search="false"> → Suche deaktiviert
 *   <select data-sp-picker data-sp-save>          → Speichern-Button
 *   <select data-sp-picker data-sp-controls>      → Header-Controls
 *   <select data-sp-picker data-sp-group="dark">  → Style-Gruppe
 *
 * Manuell: sp.create(selectElement, { title: '...', search: false })
 */
export class SelectPicker extends PickerBase {
    /** @type {SelectInstance[]} */
    activePickers;
    globalConfig = {
        search:       undefined, // auto
        saveButton:   false,
        showControls: false,
        group:        "default",
    };

    constructor(config) {
        super(config);
        this.activePickers = [];
        this.globalConfig  = {
            ...this.globalConfig,
            ...(config?.options || {})
        };
        document.addEventListener('click', (e) => this.#handleGlobalClick(e));

        // Auto-Init: bestehende [data-sp-picker] erkennen
        this.#autoInit();

        // MutationObserver: neue [data-sp-picker] erkennen
        new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.matches?.('[data-sp-picker]')) this.#initFromAttribute(node);
                    node.querySelectorAll?.('[data-sp-picker]')?.forEach(el => this.#initFromAttribute(el));
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    // ── Auto-Init ──────────────────────────────────────────────────────────────

    #autoInit() {
        document.querySelectorAll('[data-sp-picker]').forEach(el => this.#initFromAttribute(el));
    }

    #initFromAttribute(el) {
        // Bereits initialisiert?
        if (this.activePickers.some(p => p.originalSelect === el)) return;

        const attrVal = el.getAttribute('data-sp-picker') || '';
        const options = {};

        // Titel: Wert des Attributs (wenn nicht leer)
        if (attrVal) options.title = attrVal;

        // Search: nur false wenn explizit "false"
        if (el.dataset.spSearch === 'false') options.search = false;

        // Save-Button
        if (el.hasAttribute('data-sp-save')) options.saveButton = true;

        // Header-Controls
        if (el.hasAttribute('data-sp-controls')) options.showControls = true;

        // Style-Gruppe
        if (el.dataset.spGroup) options.group = el.dataset.spGroup;

        // JS-Positionierung
        if (el.hasAttribute('data-sp-jsposition')) options.forceJsPosition = true;

        this.create(el, options);
    }

    // ── Global Click ───────────────────────────────────────────────────────────

    #handleGlobalClick(e) {
        for (const instance of this.activePickers) {
            const clickedInside      = e.composedPath().includes(instance.popover);
            const clickedTrigger     = instance.triggerElm.contains(e.target);
            const clickedHiddenInput = instance.originalSelect.contains(e.target);

            if (!clickedInside && !clickedTrigger && !clickedHiddenInput) {
                if (instance.isOpen) { instance.saveAndClose(); }
                continue;
            }

            if (clickedTrigger || clickedHiddenInput) { instance.open(instance); continue; }

            if (clickedInside) {
                if (e.target.closest('.sp_btn_close')) { instance.close();        continue; }
                if (e.target.closest('.sp_btn_reset')) { instance.reset();        continue; }
                if (e.target.closest('.sp_btn_save'))  { instance.saveAndClose(); continue; }
            }
        }
    }

    // ── Create ─────────────────────────────────────────────────────────────────

    /**
     * Erstellt einen Picker für ein existierendes HTML-Select-Element.
     * @param {HTMLSelectElement}   selectElement
     * @param {SelectPickerOptions} options
     * @returns {SelectInstance}
     */
    create(selectElement, options = {}) {
        if (!selectElement) return null;
        if(selectElement.hasAttribute("data-sp-input")) return null;
        // Bereits initialisiert?
        if (this.activePickers.some(p => p.originalSelect === selectElement)) return null;

        options = { ...this.globalConfig, ...options };

        const title        = options.title ? this.resolveLangString(options.title) : '';
        const showControls = options.showControls === true;
        const saveButton   = options.saveButton === true;
        const searchMode   = options.search; // false = nie, sonst auto

        const instance = {
            id:               'sp-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            originalSelect:   selectElement,
            forceJsPosition:  options.forceJsPosition === true,
            isMulti:          selectElement.multiple,
            max:              Number(selectElement.getAttribute('max')) || Infinity,
            min:              Number(selectElement.getAttribute('min')) || 0,
            group:            options.group || 'default',
            isOpen:           false,
            existDefaultData: false,
            tempValue:        [],
            triggerElm:       null,
            popover:          null,
            defaultValues:    [],
            _reposition:      null,
            _scrollParents:   null,
            _searchMode:      searchMode,
            _title:           title,
            _showControls:    showControls,

            open:         () => this.openPicker(instance),
            close:        () => this.closePicker(instance),
            saveAndClose: () => this.savePicker(instance),
            reset:        () => this.resetPicker(instance)
        };
        selectElement.setAttribute("data-sp-input", instance.id);

        const observer = new MutationObserver(() => {
            this.#updateTriggerRender(instance);
        });
        observer.observe(instance.originalSelect, { subtree: true, childList: true });

        // Select visuell verstecken (nicht display:none → Validierung bleibt)
        Object.assign(selectElement.style, {
            position: 'absolute',
            width: '0', height: '0', padding:'0', border:'none', margin:'0',
            overflow: 'hidden',
            opacity: '0',
            pointerEvents: 'none',
        });

        this.#readInitialValues(instance);

        // Trigger-Element erstellen
        instance.triggerElm                  = document.createElement('div');
        instance.triggerElm.className        = 'sp_trigger';
        instance.triggerElm.tabIndex         = 0;
        instance.triggerElm.style.anchorName = `--${instance.id}`;

        this.#updateTriggerRender(instance);

        instance.triggerElm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                instance.open();
            }
        });

        const wrapper = document.createElement('sp-picker');
        selectElement.replaceWith(wrapper);
        wrapper.append(selectElement, instance.triggerElm);
        
        this.#buildPopover(instance, saveButton);
        this.activePickers.push(instance);
        return instance;
    }

    // ── Interne Methoden ───────────────────────────────────────────────────────

    #readInitialValues(instance) {
        const defaultAttr = instance.originalSelect.dataset.default;
        if (defaultAttr) {
            instance.defaultValues    = JSON.parse(defaultAttr);
            instance.existDefaultData = true;
        } else {
            instance.existDefaultData = false;
            instance.defaultValues    = Array.from(instance.originalSelect.options)
                .filter(opt => opt.selected)
                .map(opt => opt.value);
        }
    }

    /**
     * Baut das Popover.
     *
     * Header wird nur gerendert wenn title oder showControls gesetzt.
     * Suche wird immer ins DOM gebaut (wenn nicht false), aber in openPicker
     * per display gesteuert (>5 Einträge).
     * Multi-Select bekommt immer kleinen Inline-Reset.
     */
    #buildPopover(instance, showSaveButton) {
        const popover            = document.createElement('dialog');
        popover.className        = `sp_popover ${this.groups[instance.group] || ''}`.trim();
        popover.popover          = "manual";
        popover.style.positionAnchor = `--${instance.id}`;

        let html = '';

        // Header: nur wenn Titel oder Controls
        const hasHeader = instance._title || instance._showControls;
        if (hasHeader) {
            html += `<div class="sp_header">`;
            if (instance._title) {
                html += `<h2 class="sp_title">${instance._title}</h2>`;
            }
            if (instance._showControls) {
                html += `<div class="sp_actions">`;
                html += `<button class="sp_btn sp_btn_reset" title="${this.t('reset')}" type="button">
                            <span class="sp_msr">refresh</span></button>`;
                html += `<button class="sp_btn sp_btn_close" type="button">
                            <span class="sp_msr">close</span></button>`;
                html += `</div>`;
            }
            html += `</div>`;
        }

        // Search: im DOM aber versteckt, openPicker steuert Sichtbarkeit
        if (instance._searchMode !== false) {
            html += `<input type="text" class="sp_search" placeholder="${this.t('search')}" style="display:none">`;
        }

        // Optionsliste
        html += `<ul class="sp_content"></ul>`;

        // Footer: Multi → kleiner Reset + optional Save
        if (instance.isMulti || showSaveButton) {
            html += `<div class="sp_footer sp_footer_inline">`;
            if (instance.isMulti) {
                html += `<button class="sp_btn sp_btn_reset sp_btn_reset_inline" title="${this.t('reset')}" type="button">
                            <span class="sp_msr" style="font-size:16px">refresh</span></button>`;
            }
            if (showSaveButton) {
                html += `<button class="sp_btn sp_btn_save" type="button">${this.t('save')}</button>`;
            }
            html += `</div>`;
        }

        popover.innerHTML = html;
        instance.popover  = popover;

        // Search-Listener
        const searchInput = popover.querySelector('.sp_search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) =>
                this.#filterOptions(instance, e.target.value)
            );
        }
    }

    #renderOptions(instance) {
        const list = instance.popover.querySelector('.sp_content');
        list.innerHTML = '';

        Array.from(instance.originalSelect.options).forEach(opt => {
            if (opt.disabled && opt.value === '') return; // Placeholder überspringen
            const icon     = opt.dataset.icon;
            const selected = instance.tempValue.includes(opt.value);
            const html = `
                <li class="sp_option ${selected ? 'sp_selected' : ''}"
                    data-value="${opt.value}"
                    data-label="${opt.text.toLocaleLowerCase()}">
                    ${icon
                        ? (icon.trim().startsWith('<')
                            ? icon
                            : `<span class="sp_msr" style="font-size:20px;">${icon}</span>`)
                        : ''}
                    <span>${opt.text}</span>
                    ${selected ? '<span class="sp_msr sp_checkmark">check</span>' : ''}
                </li>
            `;
            const li = document.createRange().createContextualFragment(html).firstElementChild;

            li.addEventListener('click', () => {
                if (instance.isMulti) {
                    if (instance.tempValue.includes(opt.value)) {
                        instance.tempValue = instance.tempValue.filter(v => v !== opt.value);
                    } else {
                        if(instance.tempValue.length + 1 > instance.max) return;
                        instance.tempValue.push(opt.value);
                    }
                    this.#renderOptions(instance);
                } else {
                    instance.tempValue = [opt.value];
                    this.#renderOptions(instance);
                    setTimeout(() => instance.saveAndClose(), 100);
                }
            });
            selected ? list.insertAdjacentElement('afterbegin', li) :list.appendChild(li);
        });

        list.insertAdjacentHTML("beforeend", `
            <li class="sp_option sp_option_hidden" data-nodata>
                <span class="sp_msr" style="font-size:20px;">apps_outage</span>
                <span>${this.t("search_nodata")}</span>
            </li>
        `);

        // Reset-Buttons: nur zeigen wenn Defaults existieren
        instance.popover.querySelectorAll('.sp_btn_reset').forEach(e => e.hidden = !instance.existDefaultData);
    }

    #filterOptions(instance, query) {
        const listItems  = instance.popover.querySelectorAll('.sp_option');
        const lowerQuery = query.toLowerCase();
        let flagNoData   = true;

        for (const li of listItems) {
            if (li.hasAttribute("data-nodata")) { li.classList.add("sp_option_hidden"); continue; }
            const match = li.dataset.label.includes(lowerQuery);
            if (match) {
                li.classList.remove('sp_option_hidden');
                flagNoData = false;
            } else {
                li.classList.add('sp_option_hidden');
            }
        }

        if (flagNoData) {
            instance.popover.querySelector('.sp_option[data-nodata]').classList.remove("sp_option_hidden");
        }
    }

    #updateTriggerRender(instance) {
        instance.triggerElm.innerHTML = '';

        const selectedOptions = Array.from(instance.originalSelect.options)
            .filter(o => o.selected);

        if (selectedOptions.length === 0) {
            instance.triggerElm.innerHTML = `<span class="sp_placeholder">${this.t('empty')}</span>`;
            return;
        }

        if (instance.isMulti) {
            selectedOptions.forEach(opt => {
                const icon = opt.dataset.icon;
                instance.triggerElm.insertAdjacentHTML("beforeend", `
                    <div class="sp_chip">
                        ${icon ? `<span class="sp_msr" style="font-size:20px;">${icon}</span>` : ''}
                        <span>${opt.text}</span>
                    </div>
                `);
            });
        } else {
            const opt  = selectedOptions[0];
            const icon = opt.dataset.icon;
            instance.triggerElm.insertAdjacentHTML("beforeend", `
                <div class="sp_single_value">
                    ${icon ? `<span class="sp_msr" style="font-size:20px;">${icon}</span>` : ''}
                    <span>${opt.text}</span>
                </div>
            `);
        }
    }

    // ── Open / Close / Save / Reset ────────────────────────────────────────────

    openPicker(instance) {
        if (instance.isOpen) return;
        instance.triggerElm.classList.add('dp_trigger_open');

        const useJs = instance.forceJsPosition || !CSS.supports('anchor-name', '--test');
        if (useJs) {
            instance.popover.setAttribute('data-jsposition', '');
            this.#positionWithJs(instance);

            instance._reposition    = () => this.#positionWithJs(instance);
            instance._scrollParents = this.#getScrollParents(instance.triggerElm);
            instance._scrollParents.forEach(target =>
                target.addEventListener('scroll', instance._reposition, { passive: true })
            );
            window.addEventListener('resize', instance._reposition, { passive: true });
        } else {
            instance.popover.removeAttribute('data-jsposition');
        }

        instance.tempValue = Array.from(instance.originalSelect.options)
            .filter(o => o.selected)
            .map(o => o.value);

        this.#renderOptions(instance);

        // Suche: anzeigen wenn >5 Einträge (und nicht explizit deaktiviert)
        const search = instance.popover.querySelector('.sp_search');
        if (search) {
            const optionCount = instance.originalSelect.options.length;
            search.style.display = optionCount > 5 ? '' : 'none';
        }

        if (instance.triggerElm.closest("label")) {
            instance.triggerElm.closest("label").insertAdjacentElement("afterend", instance.popover);
        } else {
            instance.triggerElm.insertAdjacentElement("afterend", instance.popover);
        }

        instance.popover.showPopover();
        instance.popover.classList.add('sp_open');
        instance.isOpen = true;

        if (search && search.style.display !== 'none') {
            setTimeout(() => search.focus(), 50);
        }
    }

    /**
     * 
     * @param {SelectInstance} instance 
     */
    closePicker(instance) {
        if(instance.tempValue.length < instance.min)return;
        instance.popover.remove();
        instance.popover.classList.remove('sp_open');
        instance.triggerElm.classList.remove('dp_trigger_open');
        instance.isOpen = false;

        // Scroll-Listener aufräumen
        if (instance._reposition) {
            instance._scrollParents?.forEach(target =>
                target.removeEventListener('scroll', instance._reposition)
            );
            window.removeEventListener('resize', instance._reposition);
            instance._reposition = null;
        }

        const search = instance.popover.querySelector('.sp_search');
        if (search) search.value = '';
    }

    savePicker(instance) {
        Array.from(instance.originalSelect.options).forEach(opt => {
            opt.selected = instance.tempValue.includes(opt.value);
        });
        instance.originalSelect.dispatchEvent(new Event('change'));
        this.#updateTriggerRender(instance);
        this.closePicker(instance);
    }

    resetPicker(instance) {
        instance.tempValue = [...instance.defaultValues];
        this.#renderOptions(instance);
    }

    // ── JS-Positionierung ──────────────────────────────────────────────────────

    #positionWithJs(instance) {
        const pop = instance.popover;
        if (!pop || !instance.triggerElm) return;

        const rect   = instance.triggerElm.getBoundingClientRect();
        const vw     = window.innerWidth;
        const vh     = window.innerHeight;
        const gap    = 6;
        const margin = 8;

        pop.style.maxHeight = 'none';
        const naturalHeight = pop.scrollHeight;
        const naturalWidth  = pop.offsetWidth || pop.scrollWidth;

        const triggerHeight    = rect.bottom - rect.top;
        const triggerVisible   = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
        const triggerHalfHidden = triggerHeight > 0 && triggerVisible < triggerHeight / 2;

        const spaceBelow = vh - rect.bottom - gap - margin;
        const spaceAbove = rect.top         - gap - margin;

        let placeBelow;
        if (triggerHalfHidden) {
            placeBelow = spaceBelow >= spaceAbove;
        } else if (spaceBelow >= naturalHeight) {
            placeBelow = true;
        } else if (spaceAbove > spaceBelow) {
            placeBelow = false;
        } else {
            placeBelow = true;
        }

        let top, maxHeight;
        if (placeBelow) {
            top       = rect.bottom + gap;
            maxHeight = Math.max(80, spaceBelow);
        } else {
            maxHeight = Math.max(80, spaceAbove);
            const useHeight = Math.min(naturalHeight, maxHeight);
            top = rect.top - gap - useHeight;
        }

        const popWidth = Math.min(naturalWidth, vw - margin * 2);
        let left = rect.left;
        if (left + popWidth > vw - margin) left = rect.right - popWidth;
        if (left < margin || left + popWidth > vw - margin) {
            left = Math.max(margin, (vw - popWidth) / 2);
        }

        pop.style.position  = 'fixed';
        pop.style.top       = top + 'px';
        pop.style.left      = left + 'px';
        pop.style.maxHeight = maxHeight + 'px';
        pop.style.margin    = '0';
    }

    #getScrollParents(el) {
        const parents = [window];
        let current   = el?.parentElement;
        while (current && current !== document.body && current !== document.documentElement) {
            const cs = getComputedStyle(current);
            if (/auto|scroll|overlay/.test(cs.overflow + cs.overflowY + cs.overflowX)) {
                parents.push(current);
            }
            current = current.parentElement;
        }
        return parents;
    }
}
new SelectPicker();
