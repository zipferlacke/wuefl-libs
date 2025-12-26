class Picker {

    data = {};
    picker__input = null;
    picker__settings = {};
    picker__host = null;
    picker__root = null;
    picker__open = false;

    constructor(elm, settings = {}) {
        this.picker__input = elm;
        this.picker__settings = settings;
        this.picker__event_item = this.picker__input;

        // Nutzereinstellungen mit Defaults erweitern
        this.loadDefaultSettings();
        
        // Startwerte werden gesetzt
        this.setDefaultData();

        // Picker-Grundgerüst als Shadow-DOM einfügen
        this.#insertRawPicker();
        
        // Input wird mit Picker verknüpft und beim Klicken geöffnet
        this.picker__input.addEventListener("click", () => {
            this.preloadPicker();
            this.drawPicker();
            this.picker__root.dataset.open = true;
            this.picker__open = true;
            
            // Picker am Input ausrichten
            this.#alignPicker();
        });
    }

    /**
     * Standarteinstellungen werden mit nicht gesetzten Daten gefüllt
     * --- Implementieren ---
     */
    loadDefaultSettings() {
        throw new Error("loadDefaultSettings() not defined (please implement)");
    }

    /**
     * Standtardwerte für den Picker werden gesetzt
     * --- Implementieren ---   
     */
    setDefaultData(){
        throw new Error("setDefaultData() not defined (please implement)");
    }

    /**
     * Das Picker grundgerüst aus picker-host und picker-root wird als Shadow-DOM hinzugefügt.
     * @returns picker__host,  letztes Element in der DOM
     * @returns picker__root, erstes element in der Schadow-DOM   
     */
    #insertRawPicker() {
        // Shadow-host Element erstellen und in DOM einfügen
        this.picker__host = document.createElement(`div`);
        this.picker__host.setAttribute("class", "picker");
        this.picker__host.setAttribute("style", "all: unset;position:absolute");
        document.body.insertAdjacentElement(`beforeend`, this.picker__host);

        this.picker__shadow = this.picker__host.attachShadow({ mode: "open" });

        // CSS laden: entweder Default oder vom Nutzer oder beides
        if (this.picker__settings.use_default_style) {
            this.picker__shadow.innerHTML += this.getDefaultStyle();
        }
        if(this.picker__settings.css != "") {
            this.picker__shadow.innerHTML += `<link rel="stylesheet" href="${this.picker__settings.css}">`;
        }
        
        // Shadow-root erstellen und anhängen
        this.picker__root = document.createElement("div");
        this.picker__root.setAttribute("class", "picker_shadow");
        this.picker__shadow.appendChild(this.picker__root);
    }

    /**
     * Pickerdaten beim vor jedem anzeigen werden geladen z.B zum laden des inputs 
     */
    preloadPicker() {
        throw new Error("preloadPicker() not defined (please implement)");
    }

    /**
     * Picker wird ans Grundgerüst gehangen und wartet auf den Inputs 
     */
    drawPicker() {
        // Daten aktualisieren
        this.computeData();
        
        // HTML generieren und an Picker-Grundgerüst anhängen
        this.createPickerHTML();

        // Eigene Eventlistener hinzufügen
        this.createPickerEvents(); 

        // Standard-Events (z.B. Schließen beim Klick außerhalb)
        this.#createDefaultPickerEvents();
    }
    
    /**
     * Picker wird geschlossen und daten werden gespeichert 
     */
    closePicker() {
        this.savePickerData();
        let event = new Event('change', { bubbles: true });
        this.picker__event_item.dispatchEvent(event);

        this.picker__open = false;
        this.picker__root.dataset.open = false;
    }

    /**
     * Pickerdaten werden vor dem schließen gespeichert. 
     * --- Implementieren ---
     */
    savePickerData(){
        throw new Error("savePickerData not defined (please implement)");
    }

    /**
     * Daten werden aktualisiert für das neue HTML
     * --- Implementieren --- 
     */
    computeData() {
        throw new Error("computeData not defined (please implement)");
    }

    /**
     * Der HTML-Code für den Picker wird erstellt und an @var picker__root angehangen.
     * --- Implementieren --- 
     */
    createPickerHTML() {
        throw new Error("createPickerHTML not defined (please implement)");
    }

    /**
     * Events für das Picker-HTML werden erstellt 
     */
    createPickerEvents(){
        throw new Error("createPickerEvents not defined (please implement)");
    }

    /**
     * Standardt-Events für den Picker werden erstellt
     * - schließen und speichern: beim klicken ausßerhalb
     * - reset: button
     * - cancel: button   
     */
    #createDefaultPickerEvents(){
        // Funktion um Picker zu schließen
        const event_close_picker = (e) => {
            if (!this.picker__host.contains(e.target) && !this.picker__input.contains(e.target)) {
                document.removeEventListener("click", event_close_picker);
                this.closePicker();
            }
        };

        const event_header_buttons = (e) => {
            if (e.target.closest("#clear_input")) {
                this.picker__root.removeEventListener("click", event_header_buttons);
                this.resetInput();
                this.#alignPicker();
            } else if (e.target.closest("#close_input")) {
                this.picker__root.removeEventListener("click", event_header_buttons);
                document.removeEventListener("click", event_close_picker);
                this.picker__root.dataset.open = false;
                this.picker__open = false;
            }
            else if (e.target.closest("#save_close_input")) {
                this.picker__root.removeEventListener("click", event_header_buttons);
                document.removeEventListener("click", event_close_picker);
                this.closePicker();
            }
        }

        if (!this.picker__open) {
            document.removeEventListener("click", event_close_picker);
            document.addEventListener("click", event_close_picker);
        }
        
        this.picker__root.addEventListener("click", event_header_buttons);
    }

    /**
     * Pickerinput wird zurückgesetzt
     */
    resetInput(){
        throw new Error("resetInput not defined (please implement)");
    }

    /**
     * Der Picker wird am Input-Elment ausgerichtet 
     */
    #alignPicker() {
        let top = 0;
        let left = 0;
        this.picker__host.style.top = `${top}px`;
        this.picker__host.style.left = `${left}px`;
        this.picker__root.style.top = `${top}px`;
        this.picker__root.style.left = `${left}px`;
        
        // Abmessungen des Inputs und Pickers ermitteln
        const inputRect = this.picker__input.getBoundingClientRect();
        const pickerRect = this.picker__root.getBoundingClientRect();
        console.log(pickerRect);
        const margin = 12;

        if (window.scrollY + inputRect.y - margin - pickerRect.height > 0) {
            top += window.scrollY + inputRect.y - margin - pickerRect.height;
        } else {
            top += window.scrollY + inputRect.y + inputRect.height + margin;
        }

        if (document.body.clientWidth > 450) {
            if (document.body.clientWidth - window.scrollX - inputRect.x - pickerRect.width > 0) {
                left += window.scrollX + inputRect.x;
            } else if (window.scrollX + inputRect.x + inputRect.width - pickerRect.width > 0) {
                left += window.scrollX + inputRect.x + inputRect.width - pickerRect.width;
            } else {
                left += window.scrollX + inputRect.x;
            }
        }else{
            left = -pickerRect.x
        }

        this.picker__root.style.position = 'absolute';
        this.picker__root.style.top = `${top}px`;
        this.picker__root.style.left = `${left}px`;

        const rect = this.picker__root.getBoundingClientRect();
        const isInViewport = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    
        if (!isInViewport) {
            this.picker__root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

    }

    /**
     * Der Standartsyle des Pickers wird zurückgeben
     * @returns String, Css Code im Style-Tag als Standartstyle.
     * --- Implementieren ---   
     */
    getDefaultStyle(){
        throw new Error("getDefaultStyle not defined (please implement)");
    }
}
class Selectpicker extends Picker {
    constructor(elm, settings = {}) {
        super(elm, settings);
    }

    // =========================
    // Pflichtmethoden
    // =========================

    /**
     * @override
     */
    loadDefaultSettings() {
        const set_in = JSON.parse(JSON.stringify(this.picker__settings));
        const set_out = this.picker__settings;

        if (set_in.lang === undefined) set_out.lang = "de-DE";
        this.loadLanguageData();
        if (set_in.text !== undefined) this.replaceLanguageDate();
        
        if (set_in.css === undefined) {set_out.css = ""; set_out.use_default_style=false;}
        
        if (set_in.use_default_style === undefined && set_in.css === undefined || set_in.use_default_style) set_out.use_default_style = true;

        if (set_in.show_save === undefined) set_out.show_save = false;

        if (set_in.use_display_style === undefined) set_out.use_display_style = true;

        if (set_in.multiple === undefined) set_out.multiple = false;
        if (this.picker__input.hasAttribute("multiple")) set_out.multiple = true;

        if (set_in.preview_items === undefined) set_out.preview_items = 4;
        
        if (set_in.display_small === undefined) set_out.display_small = false;

        if (set_in.hide_search === undefined) set_out.hide_search = false;
    }
    
    /**
     * @override
     */
    setDefaultData() {
        if (this.picker__settings.use_display_style) {
            document.head.insertAdjacentHTML(`beforeend`, this.getDisplayStyle());
        }
        this.picker__original = this.picker__input;
        this.picker__original.style.display = "none";
        
        // Neues Display-Element als Stellvertreter erstellen
        this.picker__input = document.createElement("div");
        this.picker__input.setAttribute("class", "selectpicker_display");
        this.picker__input.setAttribute("id", "picker-"+new Date().getTime()+(Math.random() + 1).toString(36).substring(2));
        if (this.picker__settings.multiple)    {
            this.picker__original.setAttribute("multiple", "");
            this.picker__input.setAttribute("multiple", "");
        }
        this.picker__original.insertAdjacentElement("afterend", this.picker__input);
        this.picker__original.dataset.id= this.picker__input.id;
        
        this.picker__event_item = this.picker__original;

        this.computeData();
        this.updateDisplay();
    }

    /**
     * @override
     */
    preloadPicker() {}
    
    /**
     * @override
     */
    computeData() {        
        // options laden und und formatieren 
        const options = Array.from(this.picker__original.options);
        this.data.options = options.map(opt => {
            const opt_clone = opt.cloneNode(true);
            opt_clone.selected = opt.selected;
            return {
                elm_reel: opt,
                elm_fake: opt_clone,
                html: opt.hasAttribute("data-html")?opt.dataset.html : opt.innerHTML,
                plain: opt.textContent || ""
            };
        });
        
        // ausgewählt/e Optionen werden rausgesucht
        this.data.selected = this.data.options.filter(o => o.elm_fake.selected);
        // Falles kein ausgegältes Elemnt existiert wird das erste gewählt
        if (this.data.selected == []) {
            this.data.selected = [this.data.options[0]];
            this.data.selected.elm_fake.selected = true;
        }

        this.data.searchTerm = "";
        this.data.filteredOptions = this.data.options;
    }

    /**
     * @override
     */
    createPickerHTML() {
        this.picker__root.innerHTML = "";

        this.picker__root.insertAdjacentHTML("beforeend", `
            <header>
                <div>${this.data.text[this.picker__settings.lang].header}</div>
                <div>
                    <button id="clear_input" title="${this.data.text[this.picker__settings.lang].reset}"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="black"><path d="M520-330v-60h160v60H520Zm60 210v-50h-60v-60h60v-50h60v160h-60Zm100-50v-60h160v60H680Zm40-110v-160h60v50h60v60h-60v50h-60Zm111-280h-83q-26-88-99-144t-169-56q-117 0-198.5 81.5T200-480q0 72 32.5 132t87.5 98v-110h80v240H160v-80h94q-62-50-98-122.5T120-480q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-840q129 0 226.5 79.5T831-560Z"/></svg></button>
                    <button id="close_input" title="${this.data.text[this.picker__settings.lang].cancel}"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="black"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg></button>
                </div>
            </header>
            <main>
                <input type="text" ${this.picker__settings.hide_search?'style="display:none"':""} id="selectpicker_search" placeholder="${this.data.text[this.picker__settings.lang].placeholder}" />
                <div id="selectpicker_options_container"></div>
            </main>
            <footer>
                <button id="save_close_input" ${!this.picker__settings.show_save? 'style="display:none"':""}>${this.data.text[this.picker__settings.lang].save}</button>
            </footer>
        `);
        this.renderOptions();
    }

    /** 
     * @override
    */
    createPickerEvents() {
        const searchInput = this.picker__root.querySelector("#selectpicker_search");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.data.searchTerm = e.target.value;
                this.computeOptions();
                this.renderOptions();
            });
        }
        
        const container = this.picker__root.querySelector("#selectpicker_options_container");
        if (container) {
            container.addEventListener("click", (e) => {
                const optionDiv = e.target.closest(".selectpicker_option");
                if (!optionDiv)  return;

                const value = optionDiv.dataset.value;
                const optionInfo = this.data.options.find(opt => opt.elm_fake.value === value);
                
                if (!optionInfo) return;

                const alreadySelected = this.data.selected.some(s => s.elm_fake.value === value);
                if (alreadySelected) {
                    this.data.selected = this.data.selected.filter(s => s.elm_fake.value !== value);
                    optionInfo.elm_fake.selected = false;
                } else {
                    this.data.selected.push(optionInfo);
                    optionInfo.elm_fake.selected = true;
                }

                if (this.picker__settings.multiple) {   
                    this.renderOptions();
                } else {
                    this.data.selected.shift()
                    this.closePicker();
                }
                
            });
        }
    }
    
    /**
     * @override
     */
    savePickerData() {
        this.data.options.forEach(opt => {
            opt.elm_reel.selected = this.data.selected.some(s => s.elm_fake.value === opt.elm_fake.value);
        });
        this.computeData() // Manchmal 
        this.updateDisplay();
    }

    /**
     * @override
     */
    resetInput() {
        this.data.options.forEach(opt => {
            opt.elm_reel.selected = false;
        });
        if (this.picker__settings.first_default) {
            this.data.options[0].elm_reel.selected = true;
        }
        this.drawPicker();
        this.updateDisplay();
    }
    
    /**
     * @override
    */
    getDefaultStyle() { 
        return `
       <style>
:host{
    --clr-text: var(--picker-clr-text, black);
    --clr: var(--picker-clr, rgb(21, 130, 209));
    --clr-selected: var(--picker-clr-primary-2, rgb(185, 222, 248));
    --clr-shadow: var(--picker-shadow, rgb(150, 150, 150));
    --bg: var(--picker-bg, rgb(247, 247, 247));
    --bg-selected: var(--picker-bg-selected, rgb(220, 220, 220));
    --bg-hover: var(--picker-bg-hover, rgb(220, 220, 220));
    --br: var(--picker-br, 1rem);
    --fs: var(--picker-fs, clamp(14px, 2vw, 16px));
    --ff: var(--picker-ff, system-ui);
    --zIndex: var(--picker-zIndex, 999999);
}
*{
    color: inherit;
    font-size: inherit;
    box-sizing: border-box;
    border: none;
    fill: inherit;
    margin: 0;
    padding: 0;
}
/* Dropdown-Container im Shadow-DOM */
.picker_shadow {
    display: none;
}
.picker_shadow[data-open="true"]{
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
    border-radius: var(--br);
    box-shadow: 0 0 1rem var(--clr-shadow);
    background-color: var(--bg);
    color: var(--clr-text);
    font-family: var(--ff);
    font-size: var(--fs);
    z-index: var(--zIndex);

    input{
        background-color: var(--bg-selected);
        color: var(--clr-selected)
    }

    header{
        display: grid;
        grid-template-columns: auto min-content;
        gap: 0.75rem;
        align-items: center;
        div:first-child{
            width:max-content;
        }
        div{
            display: flex;
            gap: 0.5rem;
            font-weight: bold;
        }
        button{
            cursor: pointer;
            border-radius: var(--br);
            padding: 0.25rem;
            fill: var(--clr-text)!important;
            background-color: transparent;
            &:hover{
                background-color:var(--bg-hover);
                fill: var(--clr);
            }
            svg{
                height: 100%;
            }
        }
    }
    
    main{
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        
        #selectpicker_search{
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--bg-selected);
            border-radius: var(--br);
        }
        #selectpicker_options_container{
            overflow-y: auto;
            scrollbar-width: thin;
            
            .selectpicker_option{
                display: flex;
                align-items: center;
                align-content: center;
                gap: 0.5rem;
                padding: 0.5rem;
                cursor: pointer;
                height: 2.5rem;
                &:hover{
                    background-color: var(--bg-hover);
                }
                &.selected{
                    background-color: var(--bg-selected);
                    color: var(--clr-selected);
                }
                .checkmark{
                    margin-left: auto;
                }
            }
        }
    }
    
    footer{
        display: grid;
        button{
            cursor: pointer;
            border-radius: var(--br);
            padding: 0.5rem;
            fill: var(--clr-text)!important;
            background-color:transparent;
            background-color:var(--bg-selected);
            &:hover{
                outline: 1px solid var(--clr-primary-1);
            }
            svg{
                height: 100%;
            }
        }
    }
}

@media (prefers-color-scheme: dark) {
    :host{
        --clr-text: var(--picker-clr-text, white);
        --clr: var(--picker-clr-primary-1, rgb(21, 130, 209));
        --clr-selected: var(--picker-clr-primary-2, hsl(205, 82%, 17%));
        --clr-shadow: var(--picker-shadow, rgb(100, 100, 100));
        --bg: var(--picker-bg, rgb(40, 40, 40));
        --bg-selected: var(--picker-bg-selected, rgb(20, 20, 20));
    }
}

@media screen and (max-width:450px) {
    .picker_shadow[data-open="true"]{
        display: fixed!important;
        width: 100vw!important;
    }
}    
       </style>
       `;
    }


    // =========================
    // Eigene Methoden
    // =========================

    loadLanguageData() {
        this.data.text = {
            "de-DE": {
                header: "Option wählen",
                save: "Speichern",
                cancel:"Abbrechen",
                reset:"Zurücksetzen",
                placeholder: "Suche...", 
                no_data_selected: "Keine Daten ausgewählt",
                no_data_found: "Keine Daten gefunden" 
            },
            "en-EN": { 
                header: "Select option",
                save: "save",
                cancel:"cancel",
                reset:"reset", 
                placeholder: "Search...", 
                no_data_selected: "No data selected",
                no_data_found: "No data found" 
            },
            "fr-FR": { 
                header: "Choisir une option",
                save: "Enregistrer",
                cancel:"Annuler",
                reset:"Réinitialiser", 
                placeholder: "Recherche...", 
                no_data_selected: "Aucune donnée sélectionnée",
                no_data_found: "Aucune donnée trouvée" 
            },
            "es-ES": { 
                header: "Seleccionar opción",
                save: "Guardar",
                cancel:"Cancelar",
                reset:"Restablecer", 
                placeholder: "Buscar...", 
                no_data_selected: "No hay datos seleccionados",
                no_data_found: "No se encontraron datos" 
            },
            "it-IT": { 
                header: "Seleziona opzione",
                save: "Salva",
                cancel:"Annullamento",
                reset:"Reset", 
                placeholder: "Cerca...", 
                no_data_selected: "Nessun dato selezionato",
                no_data_found: "Nessun dato trovato" 
            }
        };
    }

    replaceLanguageDate(){
        for(const lang_name in this.picker__settings.text){
            for (const lang_arrtibute in this.picker__settings.text[lang_name]){
                this.data.text[lang_name][lang_arrtibute] = this.picker__settings.text[lang_name][lang_arrtibute];
            }
        }
    }

    renderOptions() {
        const container = this.picker__root.querySelector("#selectpicker_options_container");
        if (!container) return;
        container.innerHTML = "";
        if (this.data.filteredOptions.length == 0) {
            container.insertAdjacentHTML("beforeend", `<div class="no-data">${this.data.text[this.picker__settings.lang].no_data_found}</div>`);
            return;
        }
        this.data.filteredOptions.forEach(opt => {
            const optionDiv = document.createElement("div");
            optionDiv.classList.add("selectpicker_option");
  
            if (this.data.selected.some(s => s.elm_fake.value === opt.elm_fake.value)) {
                optionDiv.classList.add("selected");
                optionDiv.insertAdjacentHTML("beforeend", `<span class="checkmark">✓</span>`);
            }
            
            optionDiv.insertAdjacentHTML("afterbegin", opt.html);
            optionDiv.dataset.value = opt.elm_fake.value;
            container.appendChild(optionDiv);
        });
        container.style.maxHeight = `calc(${this.picker__settings.preview_items} * 2.5rem)`;
        container.style.overflowY = "auto";
    }

    computeOptions(){
        // Filtere basierend auf dem Suchbegriff
        if (this.data.searchTerm.trim() !== "") {
            const term = this.data.searchTerm.toLowerCase();
            this.data.filteredOptions = this.data.options.filter(opt =>
                opt.plain.toLowerCase().includes(term)
            );
        } else {
            this.data.filteredOptions = this.data.options;
        }
    }

    updateDisplay() {
        if(this.picker__settings.display_icon){
            this.picker__input.innerHTML = this.picker__settings.display_icon;
        }else{
            this.picker__input.dataset.render = true;
            if (this.data.selected.length === 0) {
                this.picker__input.innerHTML = this.data.text[this.picker__settings.lang].no_data_selected;
            } else {
                let previewHTML = `<div class="selectpicker_preview">`;
                this.data.selected.forEach(sel => {
                    previewHTML += `<div class="selectpicker_preview_item">${sel.html}</div>`;
                });
                previewHTML += `</div>`;
                this.picker__input.innerHTML = previewHTML;
            }
        }
    }

    getDisplayStyle() {
        const render = `[data-render]`;
        return `
       <style>
@layer custom{
    .selectpicker_display${render}{
        --clr-text: var(--picker-clr-text, black);
        --clr: var(--picker-clr, rgb(21, 130, 209));
        --clr-selected: var(--picker-clr-primary-2, rgb(185, 222, 248));
        --clr-shadow: var(--picker-shadow, rgb(150, 150, 150));
        --bg: var(--picker-bg, rgb(247, 247, 247));
        --bg-selected: var(--picker-bg-selected, rgb(220, 220, 220));
        --bg-hover: var(--picker-bg-hover, rgb(220, 220, 220));
        --br: var(--picker-br, 1rem);
        --fs: var(--picker-fs, clamp(14px, 2vw, 16px));
        --ff: var(--picker-ff, system-ui);
    }
    .selectpicker_display${render}, .selectpicker_display${render} *{
        color: inherit;
        font-size: inherit;
        box-sizing: border-box;
        border: none;
        fill: inherit;
        margin: 0;
        padding: 0;
    }

    .selectpicker_display${render}{
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 1000px;
        padding: 0.5rem;
        border: 1px solid var(--bg);
        border-radius: var(--br);
        cursor: pointer;
        font-family: var(--ff);
        font-size: var(--fs);
        background: var(--bg);
        color: var(--clr);
        &::before {
            content: "";
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid var(--clr);
        }

        &[multiple ${this.picker__settings.display_small? 'notactive' :''}] .selectpicker_preview{
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            .selectpicker_preview_item{
                background-color: var(--bg-selected);
                color:var(--clr-selected)
                padding: 0.5rem;
                border-radius: var(--br);
            }
        }

        .selectpicker_preview_item{
            display:flex;
            gap:0.5rem;
            align-content:center;
            align-items:center;
        }
    }
    @media screen and (max-width:450px) {
        .selectpicker_display${render} {
            width: 100%;
        }
    }
    @media (prefers-color-scheme: dark) {
        .selectpicker_display${render} {
            --clr-text: var(--picker-clr-text, white);
            --clr: var(--picker-clr, rgb(21, 130, 209));
            --clr-selected: var(--picker-clr-selected, hsl(205, 82%, 17%));
            --clr-shadow: var(--picker-shadow, rgb(100, 100, 100));
            --bg: var(--picker-bg, rgb(40, 40, 40));
            --bg-selected: var(--picker-selected, rgb(20, 20, 20));
        }
    }
}
       </style>`;
    }
}