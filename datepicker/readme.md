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
| `data-tp-min="2026-08-11"` | Frühestes wählbares Datum. Ohne Angabe gilt auch `min` des Inputs. |
| `data-tp-max="2026-09-24"` | Spätestes wählbares Datum. Ohne Angabe gilt auch `max` des Inputs. |
| `data-tp-disabled='[…]'` | Gesperrte Abschnitte als JSON, siehe unten. |
| `data-tp-limit-view="false"` | Blättern über `min`/`max` hinaus wieder erlauben. |
| `data-tp-quick='[…]'` | Schnellwahl als JSON, siehe unten. |
| `data-tp-quick-apply="false"` | Schnellwahl wählt nur aus, statt zu speichern und zu schließen. |
| `data-tp-span-blocked="false"` | Ein Zeitraum darf nichts Gesperrtes überspringen. |

## Gesperrte Tage

`min`, `max` und `disabled` sperren einzelne Tage — nicht nur ganze Monate. Gesperrte Tage bleiben sichtbar (durchgestrichen und blass), nehmen aber weder Klick noch Hover an: Sie stehen auf `pointer-events: none`, der Zeiger über ihnen ist das Verbotszeichen.

```js
dp.create([von, bis], {
  min: '2026-08-11',                 // davor gibt es keine Daten
  max: '2026-09-24',                 // heute
  disabled: [
    { from: '2026-08-20', to: '2026-08-25' },  // Abschnitt
    '2026-09-03',                              // einzelner Tag
  ],
});
```

Erlaubt sind `'YYYY-MM-DD'`, `Date` und Millisekunden.

Mit `limitView` (Standard **an**, sobald `min`/`max` gesetzt sind) endet auch das Blättern: Der Pfeil zum Vormonat ist am ersten Monat ausgegraut, der zum Folgemonat am letzten, und die Jahresliste zeigt nur Jahre, in denen es überhaupt etwas zu wählen gibt. Mit `limitView: false` bleibt das Blättern frei, die Tage bleiben trotzdem gesperrt.

## Schnellwahl

Standardmäßig aus. Wird eine Liste übergeben, erscheint je Eintrag ein Knopf — am Rechner in einer Spalte links neben dem Kalender, am Handy als Zeile darüber. So bekommt eine Datenauswahl andere Knöpfe als eine Hotelbuchung.

Sind es mehr Knöpfe, als nebeneinander bzw. untereinander passen, scrollt die Schnellwahl für sich; das Popover bleibt so hoch wie der Kalender.

```js
dp.create([von, bis], {
  quick: [
    { name: 'Heute',         rule: 'today' },
    { name: 'Letzte 7 Tage', rule: { days: 7 } },
    { name: 'Letzter Monat', rule: 'lastMonth' },
    { name: 'Alles',         rule: 'all' },
    { name: 'Quartal',       rule: () => [new Date(2026, 6, 1), new Date(2026, 8, 30)] },
  ],
});
```

| Regel | Zeitraum |
|---|---|
| `'today'` / `'yesterday'` | Heute bzw. gestern |
| `'thisWeek'` / `'lastWeek'` | Diese Woche ab Montag bis heute bzw. die ganze Vorwoche |
| `'fullWeek'` / `'nextWeek'` | Diese bzw. nächste Woche ganz, Montag bis Sonntag |
| `'weekend'` | Freitag bis Sonntag; ist dieses Wochenende vorbei, das nächste |
| `'thisMonth'` / `'lastMonth'` | Dieser Monat bis heute bzw. der ganze Vormonat |
| `'thisYear'` / `'lastYear'` | Dieses Jahr bis heute bzw. das ganze Vorjahr |
| `'last7'` / `'last30'` | Die letzten 7 bzw. 30 Tage inklusive heute |
| `'all'` | `min` bis `max` |
| `{ days: n }` / `{ months: n }` | Die letzten n Tage bzw. Monate bis heute |
| `{ nextDays: n }` | Heute und die n−1 folgenden Tage — fürs Buchen, wo es nach vorn geht |
| `{ from, to }` | Fester Zeitraum |
| `() => [von, bis]` | Eigene Funktion |

Der Zeitraum wird immer auf `min`/`max` beschnitten — „letzte 30 Tage" bei zwölf Tagen Daten endet also nicht im Leeren. `name` darf auch ein Sprachobjekt sein (`{ de: 'Heute', en: 'Today' }`).

Mit `quickApply: false` wird nur ausgewählt und der Kalender bleibt offen; Standard ist übernehmen und schließen.

## Zeiträume über gesperrte Tage

Was passieren soll, wenn zwischen Anfang und Ende etwas Gesperrtes liegt, hängt vom Zweck ab — deshalb entscheidet es `spanBlocked`.

```js
// Daten ansehen: Lücken in den Messwerten sind kein Grund abzubrechen
dp.create([von, bis], { disabled: lücken });            // spanBlocked: true (Standard)

// Wohnung buchen: zwischen zwei freien Nächten darf keine belegte liegen
dp.create([anreise, abreise], { disabled: belegt, spanBlocked: false });
```

Mit `spanBlocked: false` endet der wählbare Bereich nach dem ersten Klick am nächsten gesperrten Tag — in beide Richtungen. Alles dahinter wird blass (`dp_unreachable`) und nimmt keine Klicks an; anders als gesperrte Tage ist es nicht durchgestrichen, denn es ist nicht grundsätzlich gesperrt, sondern nur von diesem Anfang aus nicht erreichbar.

Überfahren lassen sich diese Tage trotzdem: Dann färbt sich die Vorschau rot (`--clr-picker-bad`), damit sichtbar ist, warum der Klick nichts tut — stillschweigend zu schlucken wäre schlechter als zu zeigen, woran es liegt.

Auch die Schnellwahl hält sich daran. Aus ihrem Vorschlag wird der **längste freie Abschnitt**: „Ganze Woche" gedrückt und der Sonntag ist schon gebucht, dann werden es Montag bis Samstag. Liegt die Sperre in der Mitte, gewinnt die längere der beiden Hälften; ist der ganze Vorschlag gesperrt, passiert nichts. Ein per Hand getippter Zeitraum wird beim Speichern auf den letzten erreichbaren Tag gekürzt.

Mit `spanBlocked: true` liegt der Balken durch die gesperrten Tage hindurch; sie bleiben als solche erkennbar und lassen sich weiterhin nicht als Anfang oder Ende wählen.

## Zeitraum auswählen

Jeder Klick auf einen Tag beginnt einen neuen Zeitraum: Der erste Klick setzt das Von-Datum (nur der Kreis, noch kein Balken), der zweite das Bis-Datum. Ein schon gewählter Zeitraum wird dabei verworfen, statt dass die beiden Seiten abwechselnd verschoben werden.

Zwischen den beiden Klicks zeigt der Kalender beim Überfahren eine Vorschau des Zeitraums. Wird nach dem ersten Klick gespeichert, gilt dieser eine Tag als Zeitraum von sich selbst bis zu sich selbst. Ein Zeitraum aus einem einzigen Tag bleibt auch in der Anzeige ein Punkt — die halben Balken kämen sonst als Kasten um einen einzelnen Tag heraus.

Mit `allowSameDay: false` reicht ein Tag nicht: Dann bleibt **Speichern** ausgegraut, bis auch das Ende gesetzt ist. Für Übernachtungen, wo ein Datum allein keinen Aufenthalt ergibt.

## Wo das Popover aufgeht

Die linken Kanten von Trigger und Popover liegen bündig; erst wenn rechts kein Platz mehr ist, werden es die rechten, und erst dann geht es nach oben statt nach unten. Zentriert wird nie — bei einem breiten Popover über einem schmalen Trigger hinge es sonst über den Rand.

Damit beim Auswählen nichts springt, reserviert der Trigger von Anfang an Platz für ein vollständiges Datum je Seite (`--picker-seg-width`). Sonst würde er in dem Moment wachsen, in dem der Platzhalter durch das Datum ersetzt wird, und alles daneben mitrutschen.

## Größe und Aufteilung

Die Breite kommt am Rechner aus dem Inhalt: Der Kalenderblock ist mindestens `--picker-cal-min` (300px) und höchstens `--picker-cal-max` (26rem) breit, die Schnellwahl legt ihre Inhaltsbreite daneben — höchstens `--picker-quick-max` (12rem) — und bei `--picker-max-width` (600px) ist Schluss. Ohne Schnellwahl bleibt es also bei gut 330px, mit langen Namen werden es rund 520px. Unter 300px geht der Kalender nie, auch auf einem schmalen Bildschirm nicht.

Die Schnellwahl wird nie höher als der Kalender; mehr Knöpfe scrollen in der Spalte. Diese Grenze setzt der Picker beim Öffnen per JavaScript, weil sich in CSS keine Spalte an der Höhe ihres Nachbarn ausrichten lässt, ohne dass die Höhe des Nachbarn davon wieder abhängt.

Unter 600px Bildschirmbreite nimmt das Popover die volle Breite ein und die Schnellwahl rutscht als waagerecht scrollbare Zeile über den Kalender. Der Kalender selbst bleibt auch dort bei `--picker-cal-max` und sitzt mittig — sonst würden die Tageszellen auf breiten Geräten albern groß.

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
| `min` / `max` | `string\|Date\|number` | `null` | Frühestes / spätestes wählbares Datum. |
| `disabled` | `Array` | `[]` | Gesperrte Tage und Abschnitte. |
| `limitView` | `boolean` | `true` | Blättern und Jahresliste auf `min`/`max` begrenzen. |
| `quick` | `Array` | `[]` | Schnellwahl-Knöpfe `{ name, rule }`. |
| `quickApply` | `boolean` | `true` | Schnellwahl speichert und schließt. |
| `spanBlocked` | `boolean` | `true` | Zeitraum darf über gesperrte Tage hinweggehen. |

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
| `--clr-picker-bad` | `hsl(0,72%,52%)` | „So nicht": Vorschau über einen gesperrten Abschnitt |
| `--clr-danger-200` / `--clr-danger-500` | — | Farben für ungültige Eingaben im Bearbeiten-Modus |
| `--fs-picker-header` | `1.15rem` | Schriftgröße Header/Monat |
| `--fs-input-picker` | `1rem` | Schriftgröße Tage & Inputs |
| `--br-picker` | `0.5rem` | Border-Radius |
| `--height-input-picker` | `2.25rem` | Höhe Buttons & Zeit-Inputs |
| `--picker-cal-min` | `300px` | Mindestbreite des Kalenderblocks |
| `--picker-cal-max` | `26rem` | Höchstbreite des Kalenderblocks |
| `--picker-max-width` | `600px` | Höchstbreite des Popovers |
| `--picker-quick-max` | `12rem` | Höchstbreite der Schnellwahl-Spalte |
| `--picker-seg-width` | `9ch` | Platz je Datum im Trigger |
| `--picker-seg-width-time` | `15ch` | dasselbe, wenn eine Uhrzeit mit drin steht |
| `--picker-sel-size` | `2.2rem` | Durchmesser des Auswahl-/Heute-Kreises |

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
