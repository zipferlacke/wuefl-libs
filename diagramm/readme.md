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
