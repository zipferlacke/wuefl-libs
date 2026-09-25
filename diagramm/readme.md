# Diagramm

> Vanilla JS · Kein Framework · ES-Modul · Zeichen-Bibliothek nicht enthalten

Zeitreihen-Diagramm mit Titel, beliebig vielen Chips, klickbarer Legende und Vollbild.
Der Rahmen und die ganze Rechnerei sind überall gleich; austauschbar sind nur zwei Dinge:

| Teil | Aufgabe | mitgeliefert |
| :--- | :--- | :--- |
| **Renderer** | zeichnet die fertige Option | `echartsRenderer` für ECharts |
| **Quelle** | liefert die Zahlen | keine – die schreibt das Projekt |

Damit läuft dasselbe Diagramm über eine SQL-Tabelle, über die Langzeitstatistik von
Home Assistant oder über sonst etwas. ECharts wird **nicht** mitgeliefert, sondern
übergeben – Projekte, die es ohnehin schon haben, laden es nicht ein zweites Mal.

## Installation

```html
<link rel="stylesheet" href="./diagramm.css">
```

```js
import * as echarts from 'echarts';
import { Diagramm } from './diagramm.js';
import { echartsRenderer } from './renderer-echarts.js';

const d = new Diagramm(document.querySelector('#box'), {
  renderer: echartsRenderer(echarts),
  source: meineQuelle,
});
d.setConfig({ title: 'Ladestand', series: [{ key: 'soc', name: 'Akku' }] });
```

Das Host-Element bestimmt die Größe. Es braucht eine Höhe – ein `<div style="height:300px">`
oder ein Grid-Feld genügt.

## Die Quelle

Eine Funktion. Mehr nicht.

```js
async function quelle(keys, start, end, stufe) {
  // stufe: '5minute' | 'hour' | 'day' | 'month'
  return { [keys[0]]: [{ start: '2026-01-01T00:00:00Z', change: 1.2 }, …] };
}
```

| Feld der Zeile | wofür |
| :--- | :--- |
| `start` | Zeitstempel, ms oder ISO-Text |
| `change` | Zuwachs im Zeitschritt (`stat_type: 'change'`, Standard) |
| `mean` | Mittelwert im Zeitschritt (`stat_type: 'mean'`) |
| `min` / `max` | für Chips mit `calc: 'min'` / `'max'` |

Was ein `key` bedeutet, entscheidet allein die Quelle: eine Spalte, eine Entität, ein
Messpunkt. In SQL wird daraus ein `GROUP BY` über den Zeitstempel, in Home Assistant
ein Aufruf von `recorder/statistics_during_period`.

### Auflösung wird erfragt, nicht geraten

Das Diagramm fragt zuerst die feinste Stufe an, die für das Wunschraster reicht, und
geht gröber, bis eine Stufe den Zeitraum **wirklich abdeckt** – gemessen wird die
Abdeckung, nicht bloß „kamen Zeilen“. Sonst gewinnt bei einer Wochenansicht die feine
Stufe, obwohl sie nur die letzten zwei Tage kennt.

Gezeigt wird am Ende das feinste Raster, das Wunsch und Quelle gemeinsam hergeben.
Wurde es gröber als gewünscht, steht das als Hinweis unter dem Diagramm.

## Konfiguration

`setConfig()` nimmt ein Objekt oder JSON als Text. Für YAML einmal einen Parser anmelden:

```js
import { setYamlParser } from './diagramm.js';
setYamlParser(jsyaml.load);
d.setConfig(yamlText);
```

```js
{
  title: 'Verteilung',          // steht immer oben, auch im Vollbild
  fullscreen: true,             // false blendet den Schalter aus
  range: '1w',                  // oder start/end
  start: '2026-01-01', end: '2026-01-31',
  aggregation: '2h',            // Wunschraster: 10min, 2h, 1d, 1m …
  type: 'line',                 // Vorgabe für alle Reihen
  bar_overlap: false,           // Balken nebeneinander statt übereinander
  y_axes: [{ unit: 'kWh', min: 0, max: 50 }],
  legend: { position: 'top-right', hidden: false },
  zoom: undefined,              // true immer, false nie, sonst nach Klick
  card: true,                   // false: ohne Hintergrund, Rand und Innenabstand
  chips: [ … ],
  series: [ … ],
}
```

### `range`

| Wert | Zeitraum |
| :--- | :--- |
| `1d` `3d` | heute ab 0 Uhr, bzw. die letzten 3 Kalendertage |
| `1w` `2w` | diese Kalenderwoche (ab Montag) |
| `1m` `1y` | dieser Kalendermonat / dieses Kalenderjahr |
| `last 7d` | rollendes Fenster: jetzt minus 7 Tage |
| `12h` `30min` | immer rollend |

`start` und `end` schlagen `range`.

### `series`

| Feld | Bedeutung |
| :--- | :--- |
| `key` | Bezeichner für die Quelle |
| `name` | Beschriftung in Legende und Tooltip |
| `color` | jede CSS-Farbe, auch `var(--…)` |
| `type` | `line` oder `bar` |
| `stat_type` | `change` (Standard) oder `mean` |
| `fill` | `gradient`, `soft`, `false` |
| `stack` | Name des Stapels; gleiche Namen stapeln sich |
| `sign` | `-1` klappt die Reihe unter die Nulllinie |
| `only_positive` | Rückschritte verrechnen statt sie unter Null zu zeigen |
| `smooth` `step` `dashed` | Linienform |
| `y_axis` | Index in `y_axes` |
| `unit` `multiplier` | Einheit der Quelle bzw. fester Faktor |
| `data` | fertige Punkte `[[ms, wert], …]` statt einer Abfrage |
| `background` | hinter die anderen Reihen legen |

### `chips`

Beliebig viele. Jeder fasst den ganzen Zeitraum in einer Zahl zusammen und steht
immer oben rechts – auch im Vollbild.

```js
chips: [
  { key: 'pv', label: 'Erzeugt', calc: 'sum',  unit: 'kWh', color: '#f5b301' },
  { key: 'soc', label: 'Jetzt',  calc: 'last', unit: '%',   decimals: 0 },
  { value: 32.4, label: 'Ziel', unit: 'kWh' },     // fester Wert
]
```

`calc`: `sum` (Standard), `mean`, `max`, `min`, `last`.

## Zoomen

Ohne Angabe wird das Zoomen per Geste erst nach einem Klick ins Diagramm scharf –
sonst bleibt auf dem Handy jede Wischbewegung im Diagramm hängen, statt die Seite zu
scrollen. Das scharfe Diagramm bekommt die Klasse `dg_aktiv`. Im Vollbild ist es
sofort aktiv. `zoom: true` schaltet es immer an, `zoom: false` ganz ab.

## Vollbild

`fullscreen: true` zeigt den Schalter; `d.toggleFullscreen()` schaltet von außen,
`d.fullscreen` fragt den Zustand ab.

Im Vollbild wandert **dasselbe** Diagramm in den Dialog und danach zurück – keine
Kopie. Titel, Chips und Legende sind dort deshalb zwangsläufig dieselben, und die
Zeichenfläche füllt die volle Höhe, weil nach jedem Umzug neu gemessen wird. An der
alten Stelle bleibt so lange ein Platzhalter, damit nichts darunter wegspringt.

## Zeitraum-Picker

`picker.js` bringt die Bedienung mit: Tag / Woche / Monat / Jahr, vor und zurück, ein
Feld für den freien Zeitraum und wahlweise eine Übersicht mit verschiebbarem Ausschnitt.

```js
import { Zeitpicker } from './picker.js';
import { DatePicker } from '../datepicker/datepicker.js';   // optional

const p = new Zeitpicker(document.querySelector('#leiste'), {
  id: 'oben',
  granularity: 'week',
  datePicker: DatePicker,        // Klasse oder fertige Instanz; ohne ihn
                                 // bleiben zwei <input type="date">
  min: new Date('2024-01-01'),   // nicht weiter zurück
});
```

Ohne `datePicker` bleiben es die Datumsfelder des Browsers – vollständig bedienbar,
nur schlichter. Der Picker blättert nie in die Zukunft und nicht vor `min`.

### Diagramme anhängen

```js
d1.setConfig({ picker: 'oben', series: [...] });
d2.setConfig({ picker: 'oben', series: [...] });
d3.setConfig({ picker: 'unten', series: [...] });   // anderer Picker
```

Steht `picker` in der Konfiguration, kommt der Zeitraum von dort und `range`/`start`/`end`
werden übergangen. Die Reihenfolge beim Bauen ist egal: Ein Diagramm, das sich an eine
noch nicht gebaute id hängt, wird benachrichtigt, sobald es sie gibt – und lädt genau
einmal, nicht zweimal.

| Methode | Zweck |
| :--- | :--- |
| `p.range` | `{ start, end }` |
| `p.setRange(a, b)` | Zeitraum von außen setzen |
| `p.setGranularity('month')` | Stufe wechseln, Anker bleibt |
| `p.setBounds(min, max)` | Grenzen nachreichen, z. B. sobald bekannt |
| `p.setOverviewKeys(keys)` | Reihen der Übersicht nachreichen |
| `p.on(cb)` / `p.off(cb)` | eigene Hörer |
| `p.destroy()` | abmelden und aufräumen |
| `getPicker(id)` / `onPicker(id, cb)` | von außen andocken |

### Übersicht mit Ausschnitt

```js
new Zeitpicker(box, {
  id: 'oben',
  overview: { keys: ['pv'], renderer: echartsRenderer(echarts), source: quelle,
              color: '#f5b301', height: 72 },
});
```

Zeichnet den ganzen Zeitraum zwischen `min` und `max` grob als Kurve und hebt den
aktuellen Ausschnitt darin hervor. Der Ausschnitt lässt sich ziehen und an den Rändern
aufziehen; alle angehängten Diagramme folgen.

`height` ist die Höhe des Streifens in Pixeln (Vorgabe 64) und bestimmt zugleich die
Höhe des Reglers. Die Kurve steckt im Regler selbst – eine zweite darüber wäre
dieselbe Linie doppelt.

## Gemeinsame X-Achse

Zwei Angaben, die zusammengehören:

```js
{ group: 'oben', axis_width: 56 }
```

`group` koppelt die Diagramme: Fadenkreuz, Tooltip und Zoom laufen gemeinsam.
`axis_width` gibt der Y-Achse eine feste Breite in Pixeln – ohne sie richtet sich jedes
Diagramm nach der Breite seiner eigenen Zahlen und die Achsen stehen um ein paar Pixel
versetzt. Zusammen mit demselben `picker` stehen mehrere Diagramme dann wirklich
untereinander bündig.

## Mit oder ohne Kachel

`card: false` nimmt dem Diagramm Hintergrund, Rand und Innenabstand. Es sitzt dann
nackt in dem, was es umgibt – nützlich, wenn schon eine Karte drumherum ist oder
mehrere Diagramme in einem gemeinsamen Rahmen stehen sollen.

## SVG statt Canvas

```js
echartsRenderer(echarts, { renderer: 'svg' })
```

SVG ist gestochen scharf und druckbar, Canvas bei sehr vielen Punkten flüssiger – bis
ein paar tausend Punkte nimmt sich das nichts. Der Renderer wird beim Anlegen gewählt
und lässt sich im Betrieb nicht umstellen; zum Wechseln das Diagramm neu aufsetzen.

## Icons

Default sind reine UTF-8-Zeichen, keine Icon-Schrift nötig. Verwendete Schlüssel:
`fullscreen`, `fullscreenExit`.

```js
import { setIcons } from './diagramm.js';
setIcons('default-msr');                                   // Material Symbols
setIcons({ fullscreen: '<ha-icon icon="mdi:fullscreen"></ha-icon>' });
```

Eine Map wird über das aktuelle Set gelegt – was fehlt, bleibt beim Default. Auch
direkt beim Import wählbar: `./diagramm.js?icons=msr`.

## Aussehen

Alles hängt an CSS-Variablen auf `.dg`:

```css
.dg {
  --dg-text: #1c1c1c;        --dg-text-soft: #5f6368;
  --dg-bg: #fff;             --dg-line: #e0e0e0;
  --dg-title-size: 1.25rem;  --dg-chip-size: .875rem;
  --dg-legend-size: .75rem;  --dg-min-height: 180px;
}
```

## Eigener Renderer

Vier Methoden. Nur diese Datei ist pro Projekt anders.

```js
export const meinRenderer = {
  mount(host)          { … return griff; },
  draw(griff, option)  { … },
  resize(griff)        { … },
  destroy(griff)       { … },
};
```

`option` ist eine fertige ECharts-Option. Wer etwas anderes zeichnet, liest daraus
`series`, `xAxis` und `yAxis` – oder baut mit den exportierten Bausteinen
(`bucketize`, `zeitraum`, `rasterAus`, `skalierung`) etwas Eigenes.

## Exporte

| Name | Zweck |
| :--- | :--- |
| `Diagramm` | die Klasse |
| `setIcons` `getIcons` `ICON_SETS` | Icons |
| `parseConfig` `setYamlParser` | Konfiguration |
| `getData` `STUFEN` | Auflösungsleiter |
| `zeitraum` `rasterAus` `rasterAusQuelle` | Zeit und Raster |
| `prepareRows` `bucketize` | Zeilen aufbereiten und zusammenfassen |
| `skalierung` | Einheiten umrechnen |
| `buildOption` | ECharts-Option bauen |
| `Zeitpicker` `getPicker` `onPicker` | Zeitraumauswahl (aus `picker.js`) |
| `spanne` `verschiebe` `beschriftung` | Kalenderrechnung (aus `picker.js`) |
