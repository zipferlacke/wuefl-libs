# SelectPicker

Leichtgewichtiger Custom-Select-Picker ohne externe Abhängigkeiten. Unterstützt Single- und Multiselect, Auto-Initialisierung per Attribut, Suchfunktion, Icons, Mehrsprachigkeit, Style-Gruppen und Min/Max-Constraints.

---

## Installation

```html
<script type="module" src="./selectpicker.js"></script>
```

Beim Import wird automatisch eine globale `SelectPicker`-Instanz erzeugt, das CSS (`selectpicker.css`) nachgeladen, alle bestehenden `<select>` mit `[data-sp-picker]` initialisiert und ein `MutationObserver` registriert, der neue Elemente automatisch übernimmt.

Für vollen Konfigurationszugriff (Sprache, eigene Übersetzungen, globale Defaults) kann eine eigene Instanz erstellt werden:

```js
import { SelectPicker } from './selectpicker.js';

const sp = new SelectPicker({
  lang: 'de',
  options: { saveButton: true, showControls: true }
});
```

---

## Auto-Init per Attribut

Jedes `<select>` mit `data-sp-picker` wird automatisch zum SelectPicker. Der Wert des Attributs wird als Titel verwendet — leer = kein Titel.

```html
<!-- Picker ohne Titel -->
<select data-sp-picker>
  <option value="a">A</option>
  <option value="b">B</option>
</select>

<!-- Picker mit Titel -->
<select data-sp-picker="Bitte wählen">
  ...
</select>

<!-- Multiselect mit Save-Button -->
<select data-sp-picker="Personen" multiple data-sp-save>
  ...
</select>
```

### Attribute auf `<select>`

| Attribut | Wirkung |
|---|---|
| `data-sp-picker` | Auf jedem `<select>`, das vom Picker übernommen werden soll. Wert (optional) wird als Titel verwendet. |
| `data-sp-search="false"` | Suchfeld komplett deaktivieren. Ohne Attribut: erscheint automatisch ab >5 Einträgen. |
| `data-sp-save` | Speichern-Button im Footer (empfohlen für Multiselect). |
| `data-sp-controls` | Reset- und Close-Button im Header anzeigen. |
| `data-sp-group="<name>"` | Style-Gruppe zuweisen (siehe `createGroup`). |
| `data-sp-jsposition` | JS-Positionierung erzwingen, auch wenn der Browser CSS Anchor Positioning unterstützt. |
| `data-default='["a","b"]'` | JSON-Array mit Reset-Werten. Wenn gesetzt, erscheint der Reset-Button. |
| `min` / `max` | Bei Multiselect: Mindest- und Höchstanzahl ausgewählter Optionen. Über `max` hinaus kann nichts mehr ausgewählt werden, unter `min` lässt sich der Picker nicht schließen. |
| `multiple` | Standard-HTML-Attribut — aktiviert Multiselect. |

---

## Manuelle Initialisierung

Für volle Kontrolle pro Picker kann `create()` direkt aufgerufen werden — überschreibt etwaige Attribut-Konfiguration:

```js
import { SelectPicker } from './selectpicker.js';

const sp = new SelectPicker();
const instance = sp.create(document.getElementById('mySelect'), {
  title: 'Option wählen',
  search: true,
  saveButton: true,
  showControls: true,
  group: 'dark',
  forceJsPosition: true,
});
```

### Optionen für `create()`

| Option | Typ | Standard | Beschreibung |
|---|---|---|---|
| `title` | `string \| {de, en}` | leer | Titel im Header. Wenn nicht gesetzt **und** `showControls: false`, wird kein Header gerendert. |
| `group` | `string` | `"default"` | Style-Gruppe (siehe unten). |
| `search` | `boolean` | auto | `false` = nie. Sonst automatisch ab >5 Optionen. |
| `saveButton` | `boolean` | `false` | Speichern-Button im Footer. |
| `showControls` | `boolean` | `false` | Reset- und Close-Button im Header. |
| `forceJsPosition` | `boolean` | `false` | JS-Positionierung erzwingen statt CSS-Anchor. |

---

## Globale Konfiguration

`new SelectPicker(config)` akzeptiert drei optionale Felder:

| Feld | Typ | Beschreibung |
|---|---|---|
| `lang` | `string` | Startsprache `'de'` oder `'en'`. Standard: Browser-Sprache, sonst `'en'`. |
| `translations` | `Object` | Eigene Übersetzungen (siehe unten). |
| `options` | `Object` | Globale Defaults für alle `create()`-Aufrufe — werden pro Aufruf überschrieben. |

---

## Style-Gruppen

Mit `createGroup(name, className)` können mehrere visuelle Varianten gleichzeitig verwendet werden — die CSS-Klasse landet zusätzlich am Popover.

```js
sp.createGroup('dark',  'sp-theme-dark');
sp.createGroup('light', 'sp-theme-light');
```

```html
<select data-sp-picker data-sp-group="dark">...</select>
```

```css
.sp_popover.sp-theme-dark {
  --clr-picker: hsl(0, 0%, 15%);
  --clr-picker-trigger: hsl(0, 0%, 20%);
}
```

---

## Mehrsprachige Titel

Statt eines Strings kann ein Sprachobjekt übergeben werden — `resolveLangString` wählt nach `this.lang` aus, mit Fallback auf `en`.

```js
sp.create(el, {
  title: { de: 'Sprache wählen', en: 'Choose language' }
});
```

## Eigene Übersetzungen

```js
new SelectPicker({
  lang: 'de',
  translations: {
    de: { save: "OK", cancel: "Abbruch", search: "Filter...", search_nodata: "Leer", reset: "Reset", empty: "—" },
    en: { save: "OK", cancel: "Cancel",  search: "Filter...", search_nodata: "Empty", reset: "Reset", empty: "—" }
  }
});
```

---

## Icons

Jede `<option>` kann ein Icon erhalten — entweder als Material-Symbol-Ligaturname oder als beliebiger SVG-String.

```html
<select data-sp-picker>
  <option value="home" data-icon="home">Startseite</option>
  <option value="x" data-icon='<svg viewBox="0 0 24 24">...</svg>'>SVG-Icon</option>
</select>
```

---

## Min / Max bei Multiselect

```html
<select data-sp-picker multiple min="1" max="3">
  ...
</select>
```

- Beim Erreichen von `max` können keine weiteren Optionen hinzugefügt werden
- Unter `min` lässt sich der Picker nicht schließen (`closePicker` blockiert)

---

## Standardwerte & Reset

Mit `data-default` werden feste Reset-Werte definiert. Der Reset-Button ist nur sichtbar wenn das Attribut gesetzt ist.

```html
<select data-sp-picker multiple data-default='["a","b"]' data-sp-controls>
  <option value="a" selected>Alpha</option>
  <option value="b" selected>Beta</option>
  <option value="c">Gamma</option>
</select>
```

Ohne `data-default` werden bei Reset die ursprünglich `selected`-markierten Optionen wiederhergestellt — der Reset-Button bleibt aber versteckt.

---

## Programmatische API

`sp.create()` gibt eine `SelectInstance` zurück. Methoden:

| Methode | Beschreibung |
|---|---|
| `instance.open()` | Popover öffnen |
| `instance.close()` | Schließen **ohne** Speichern (respektiert `min`-Constraint) |
| `instance.saveAndClose()` | Auswahl ins originale `<select>` schreiben + `change`-Event feuern + schließen |
| `instance.reset()` | Auf `defaultValues` zurücksetzen, Popover bleibt offen |

Wichtige Eigenschaften:

| Eigenschaft | Beschreibung |
|---|---|
| `instance.originalSelect` | Das versteckte `<select>` — bleibt im DOM, feuert `change`-Events |
| `instance.triggerElm` | Das sichtbare Element (`.sp_trigger`) |
| `instance.popover` | Das `<dialog>` |
| `instance.tempValue` | Aktuelle Auswahl vor `saveAndClose()` |
| `instance.defaultValues` | Reset-Werte |
| `instance.isOpen` | `true` wenn offen |
| `instance.isMulti` | `true` bei `<select multiple>` |
| `instance.min` / `instance.max` | Aus dem `<select>` übernommene Constraints |

### Auf Änderungen reagieren

Das originale `<select>` ist im DOM und feuert standardmäßiges `change`:

```js
document.getElementById('mySelect').addEventListener('change', (e) => {
  const values = [...e.target.selectedOptions].map(o => o.value);
  console.log(values);
});
```

---

## CSS-Variablen

```css
:root {
  /* Basisfarben — diese überschreiben */
  --clr-picker:          hsl(0, 0%, 90%);   /* Popover-Hintergrund */
  --clr-picker-trigger:  hsl(0, 0%, 90%);   /* Trigger-Hintergrund */
  --clr-picker-input:    hsl(219, 100%, 50%); /* Akzentfarbe */

  /* Größen */
  --fs-picker-header:    1rem;
  --fs-input-picker:     0.9rem;
  --br-picker:           0.5rem;
  --height-input-picker: 2rem;
}
```

Light/Dark wird via `light-dark()` automatisch unterstützt.

---

## CSS-Klassen

Präfix `sp_` — vollständig isoliert:

| Klasse | Element |
|---|---|
| `sp_trigger` | Trigger-Button (ersetzt das `<select>` optisch) |
| `sp_popover` | Popover-`<dialog>` |
| `sp_header` / `sp_title` / `sp_actions` | Header (optional) |
| `sp_btn` / `sp_btn_close` / `sp_btn_reset` / `sp_btn_save` | Buttons |
| `sp_btn_reset_inline` | Kleiner Reset im Multi-Footer |
| `sp_footer` / `sp_footer_inline` | Footer |
| `sp_search` | Suchfeld |
| `sp_content` | Optionen-Liste |
| `sp_option` / `sp_selected` / `sp_option_hidden` | Einzelne Option |
| `sp_chip` / `sp_single_value` / `sp_placeholder` | Trigger-Inhalt |
| `sp_msr` | Material-Symbol-Icon |
| `sp_open` | Auf `.sp_popover` solange offen |
| `dp_trigger_open` | Auf `.sp_trigger` solange Popover offen |

---

## Positionierung

### CSS Anchor Positioning (modern)

In Chrome/Edge 125+ läuft die Positionierung per CSS via `position-anchor` mit folgenden Fallback-Stufen:

1. Standard: unter dem Trigger, linksbündig
2. `flip-block`: kein Platz unten → über den Trigger
3. `--sp-center-bottom`: kein Platz seitlich → horizontal zentriert, unter Trigger
4. `--sp-center-top`: kein Platz weder seitlich noch unten → zentriert, über Trigger

### JS-Fallback

In Browsern ohne Anchor Positioning übernimmt eine JS-Routine die identische Logik. Bei Scroll und Resize wird automatisch neu positioniert — auch in scrollbaren Vorfahren.

### `forceJsPosition`

In manchen Layouts bricht CSS Anchor Positioning auch in modernen Browsern, weil ein Vorfahre `transform`, `filter` oder `contain` setzt — diese erzeugen einen Containing-Block, der das Anchor-Positioning unmöglich macht. Auch in einem `<dialog>` mit `showModal()` gibt's regelmäßig Probleme.

```html
<select data-sp-picker data-sp-jsposition>...</select>
```

oder global:

```js
new SelectPicker({ options: { forceJsPosition: true } });
```

---

## Barrierefreiheit

- Trigger ist per `Tab` fokussierbar, öffnet mit `Enter` oder `Space`
- Originales `<select>` bleibt im DOM (visuell auf 0×0 reduziert, nicht `display:none`) — Formular-Validierung und Screenreader funktionieren weiter
- Suchfeld erhält nach dem Öffnen automatisch Fokus (mit 50ms Delay damit `popover` sicher offen ist)
- Klick außerhalb schließt automatisch (mit Save bei Single, ohne wenn `min` nicht erfüllt ist)

---

## CSS-Layer & Robustheit

Das CSS liegt in `@layer components`. Globale Resets können den Layer überschreiben. Pack deinen Reset ebenfalls in einen Layer:

```css
@layer resets, components;
@layer resets {
  * { padding: 0; margin: 0; box-sizing: border-box; }
}
```