# DatePicker

> Vanilla JS · Kein Framework · ES-Modul

Vanilla JS Datum- und Zeitpicker als Ergänzung zum SelectPicker. Standardmäßig per Attribut gesteuert — kein Build-Schritt, keine manuelle Initialisierung nötig.

## Installation

```html
<script type="module" src="./datepicker.js"></script>
```

Beim Import wird automatisch eine globale `DatePicker`-Instanz erzeugt, das CSS (`datepicker.css`) nachgeladen, alle Inputs mit `[data-tp-picker]` initialisiert und ein `MutationObserver` registriert, der neue Inputs automatisch übernimmt.

## Attribut-Steuerung

Jedes `<input>` mit `data-tp-picker` wird automatisch zum DatePicker. Der Wert ist eine **Gruppen-ID** — zwei Inputs mit derselben ID bilden zusammen einen Range-Picker.

```html
<!-- Single-Datum -->
<input type="date" data-tp-picker="1">

<!-- Range: gleiche Gruppen-ID, DOM-Reihenfolge entscheidet von/bis -->
<input type="date" data-tp-picker="2">
<input type="date" data-tp-picker="2">
```

### Explizite Rollen

Wenn die DOM-Reihenfolge nicht eindeutig ist, kann die Rolle explizit mit `+` (von) oder `-` (bis) angehängt werden:

```html
<input type="date" data-tp-picker="3+">
<input type="date" data-tp-picker="3-">
```

### showDate / showTime — automatisch aus dem `type`

| `type` des Inputs | Ergebnis |
|---|---|
| `date` | Nur Kalender |
| `time` | Nur Zeitauswahl |
| `datetime-local` | Kalender + Zeitauswahl |

### Weitere Attribute

| Attribut | Beschreibung |
|---|---|
| `data-tp-picker="<id>"` | **Pflicht.** Gruppen-ID, optional mit `+`/`-`-Suffix für die Rolle. |
| `data-tp-format="native\|iso\|ms\|locale"` | Format des gespeicherten Werts (siehe unten). Standard: `native`. |
| `data-tp-same-day="false"` | Bei Range: gleicher Tag als Von+Bis nicht erlaubt. Standard: erlaubt. |
| `data-tp-position="js"` | JS-Positionierung erzwingen statt CSS Anchor Positioning. |

## Beispiele

```html
<!-- Einzelnes Datum -->
<input type="date" data-tp-picker="a">

<!-- Datum + Uhrzeit -->
<input type="datetime-local" data-tp-picker="b">

<!-- Nur Uhrzeit -->
<input type="time" data-tp-picker="c">

<!-- Zeitspanne -->
<input type="date" data-tp-picker="d">
<input type="date" data-tp-picker="d">

<script type="module" src="./datepicker.js"></script>
<script>
  document.querySelector('[data-tp-picker="a"]')
    .addEventListener('change', e => console.log(e.target.value));
</script>
```

Das ursprüngliche `<input>` bleibt im DOM (visuell ausgeblendet) und feuert beim Speichern ein normales `change`-Event — der Wert steht in `input.value`.

## outputFormat / data-tp-format

| Wert | Beispiel | Beschreibung |
|---|---|---|
| `native` (Standard) | `2026-03-13` / `2026-03-13T14:30` / `14:30` | Format passend zum `type` des Inputs. |
| `locale` | `13.03.2026` / `13.03.2026, 14:30` | Regionalformat nach `navigator.language`. |
| `ms` | `1742169600000` | Unix-Millisekunden als String. |
| `iso` | `2026-03-13` / `2026-03-13T14:30` | ISO 8601, lokal (nicht UTC). |

> Die Anzeige im Trigger-Element ist immer im Regionalformat — unabhängig vom gewählten Format.

## Verhalten

**Single ohne Zeit** — Klick auf Tag speichert sofort und schließt den Picker.

**Single mit Zeit** — Speichern-Button erscheint, Picker schließt erst nach Klick.

**Range** — Erster Klick setzt Von = Bis (einzelner Tag). Zweiter Klick weitet auf Bis aus. Hover zeigt Vorschau des Bereichs. Speichern-Button immer vorhanden.

**Bearbeiten-Modus** — Doppelklick auf den Trigger (oder Klick auf das Stift-Icon) erlaubt manuelle Texteingabe des Datums, z.B. `13.03.2026`.

## Manuell — Erweiterte API

Für volle Kontrolle (eigene Sprache/Übersetzungen, globale Defaults, programmatischer Zugriff) kann eine eigene Instanz erstellt und `create()` direkt aufgerufen werden — nötig nur, wenn die Attribut-Steuerung nicht ausreicht.

```js
import { DatePicker } from './datepicker.js';

const dp = new DatePicker({ lang: 'de' });
const picker = dp.create(document.getElementById('meinInput'), { showTime: true });
```

### new DatePicker(config)

| Parameter | Typ | Beschreibung |
|---|---|---|
| `config.lang` | `string` | UI-Sprache: `'de'` oder `'en'`. Standard: Browser-Sprache. |
| `config.locale` | `string` | Locale für Datumsformatierung, z.B. `'de-DE'`. Standard: `navigator.language`. |
| `config.translations` | `Object` | Eigene Texte für Buttons und Labels. |
| `config.options` | `Object` | Globale Standardoptionen für alle `create()`-Aufrufe dieser Instanz. |

### dp.create(inputConfig, options)

| Form von `inputConfig` | Ergebnis |
|---|---|
| `element` | Single-Modus |
| `[start, end]` | Range-Modus |

| Option | Typ | Standard | Beschreibung |
|---|---|---|---|
| `showDate` | `boolean` | auto aus `type` | Kalender anzeigen. |
| `showTime` | `boolean` | auto aus `type` | Zeitpicker anzeigen. |
| `outputFormat` | `'native'\|'locale'\|'ms'\|'iso'` | `'native'` | Format des gespeicherten Werts. |
| `allowSameDay` | `boolean` | `true` | Range: gleicher Tag als Start+Ende erlaubt. |
| `forceJsPosition` | `boolean` | `false` | JS-Positionierung erzwingen. |

> `create()` wird intern auch von der Attribut-Steuerung verwendet — beide Wege erzeugen dieselbe Picker-Instanz.

### Instanz-API

```js
const picker = dp.create(inputEl);

picker.open();          // Picker öffnen
picker.close();          // Schließen ohne Speichern
picker.saveAndClose();   // Speichern und schließen
picker.reset();          // Auswahl zurücksetzen
```

## CSS-Variablen

Alle Variablen einmal in `:root` setzen. Die Lightness-Abstufungen (hover, aktiv, gedämpft etc.) werden automatisch berechnet — nur der Farbton (h + s) der Basisfarbe ist relevant. Dark-Mode wird über `color-scheme: light dark` automatisch unterstützt.

| Variable | Standard | Beschreibung |
|---|---|---|
| `--clr-picker` | `hsl(0,0%,90%)` | Farbton des Popovers |
| `--clr-picker-trigger` | `hsl(0,0%,90%)` | Farbton des Trigger-Elements |
| `--clr-picker-input` | `hsl(219,100%,50%)` | Akzentfarbe: Buttons, Auswahl, Range-Balken |
| `--clr-picker-today` | `hsl(30,100%,52%)` | Farbe des Heute-Kreises |
| `--clr-danger-200` / `--clr-danger-500` | — | Farben für ungültige Eingaben im Bearbeiten-Modus |
| `--fs-picker-header` | `1rem` | Schriftgröße Header/Monat |
| `--fs-input-picker` | `0.9rem` | Schriftgröße Tage & Inputs |
| `--br-picker` | `0.5rem` | Border-Radius |
| `--height-input-picker` | `2rem` | Höhe Buttons & Zeit-Inputs |
| `--picker-cal-width` | `290px` | Breite des Kalender-Popovers |
| `--picker-sel-size` | `1.9rem` | Durchmesser des Auswahl-/Heute-Kreises |

### Beispiel: Eigene Farben

```css
:root {
  --clr-picker:         hsl(220, 15%, 50%);  /* blaugrau */
  --clr-picker-trigger: hsl(220, 15%, 50%);
  --clr-picker-input:   hsl(262, 80%, 55%);  /* violett */
  --clr-picker-today:   hsl(16, 90%, 55%);   /* orange */
}
```

## Icons (Material Symbols Rounded)

Die CSS enthält einen eingebetteten Base64-Font-Subset. Verwendete Icons:

`close` · `refresh` · `check` · `search` · `apps_outage` · `chevron_left` · `chevron_right`

Um den Font neu zu generieren:

```bash
conda activate tools
pyftsubset google-icons-rounded.woff2 \
  --glyphs="close,refresh,check,search,apps_outage,chevron_left,chevron_right" \
  --layout-features="*" \
  --flavor=woff2 \
  --output-file=picker-icons.woff2

base64 -i picker-icons.woff2 | tr -d '\n' > picker-icons-base64.txt
```

Den Inhalt von `picker-icons-base64.txt` dann als `BASE64_FONT_HERE` in der CSS einsetzen.

## Browser-Support

CSS Anchor Positioning (für automatische Positionierung des Popovers) ist in Chrome 125+, Edge 125+, Firefox 147+ vollständig unterstützt. Für ältere Browser greift ein JS-Fallback (`getBoundingClientRect`).
