# tableView — Sort, Group & Search

> Vanilla JS · ES-Modul

Macht klassische HTML-Tabellen interaktiv: Spalten sortieren, nach Werten gruppieren (auch verschachtelt und mit Multi-Value-Split), und die ganze Tabelle live filtern. Komplett über Attribute steuerbar, ohne Build-Schritt.

---

## Installation

```html
<script src="tableview.js" type="module"></script>
```

Keine Abhängigkeiten. Beim Import registriert sich tableView automatisch als Klick-Handler und beobachtet das DOM via `MutationObserver` — neue Tabellen die per Fetch oder JavaScript eingefügt werden, werden automatisch initialisiert. Ein zugehöriges Stylesheet (`tableview.css`) wird beim ersten Aufruf nachgeladen.

Zum manuellen Initialisieren bestimmter Tabellen (eigentlich nicht notwendig):

```js
import { prepareTables } from './tableview.js';
prepareTables(document.getElementById('container'));
```

---

## Attribut-Steuerung

### Auf `<th>`: `t-sort`

Macht eine Spalte sortierbar. Bei Klick auf die Spaltenüberschrift wechselt die Sortierung zwischen aufsteigend → absteigend → unsortiert.

```html
<th t-sort>Name</th>
```

Als Default-Sortierung kann `asc` oder `desc` gesetzt werden:

```html
<th t-sort="desc">Datum</th>
```

### Auf `<th>`: `t-type`

Bestimmt wie die Werte für die Sortierung verglichen werden. Ohne dieses Attribut wird automatisch erkannt (Datum, Zahl, Text in dieser Reihenfolge).

| Wert | Beschreibung |
|---|---|
| `num` | Numerisch (`parseFloat`) |
| `date` | Datum (ISO `YYYY-MM-DD` oder `DD.MM.YYYY [HH:MM]`) |

```html
<th t-sort t-type="num">Preis</th>
<th t-sort t-type="date">Erstellt</th>
```

Für komplexere Werte kann pro Zelle `data-sort-value` gesetzt werden — der Inhalt der Zelle wird dann nur angezeigt, sortiert wird nach dem Datenwert:

```html
<td data-sort-value="2025-03-12">12. März 2025</td>
```

### Auf `<th>`: `t-group`

Macht eine Spalte gruppierbar. Beim Klick auf das Gruppen-Icon werden alle Zeilen mit demselben Wert in der Spalte zu einer aufklappbaren Gruppe zusammengefasst. Mehrere Spalten können gleichzeitig gruppiert sein — sie werden dann verschachtelt.

```html
<th t-sort t-group>Kategorie</th>
```

Als Default-Gruppierung wird der Wert `active` verwendet:

```html
<th t-group="active">Status</th>
```

#### Multi-Value-Gruppierung

Wenn eine Zelle mehrere Werte enthält (z.B. `"Sport, Musik"`), kann der Separator als Wert von `t-group` angegeben werden. Die Zeile erscheint dann in jeder zutreffenden Gruppe:

```html
<th t-group=",">Tags</th>
```

Eine Zelle mit `"Sport, Musik"` taucht so unter "Sport" **und** unter "Musik" auf. Beim mehrfachen Erscheinen wird die ursprüngliche Zeile geklont; die Klone bekommen die Klasse `tv-clone`.

### Auf `<table>`: `t-search`

Fügt automatisch ein Suchfeld in den `<thead>` ein. Die Eingabe wird in Tokens (durch Leerzeichen getrennt) zerlegt — eine Zeile bleibt sichtbar wenn **alle** Tokens irgendwo in irgendeiner Spalte vorkommen. Live-Filterung mit 150ms Debounce.

```html
<table t-search>
  ...
</table>
```

Gruppen ohne sichtbare Treffer werden automatisch ausgeblendet, der Treffer-Counter zeigt `gefiltert/gesamt`.

---

## Robustheit

tableView akzeptiert auch unvollständige Tabellenstrukturen:

- **Kein `<tbody>`** → wird automatisch ergänzt, lose `<tr>` werden hineinverschoben
- **Kein `<thead>`** → wenn die erste Zeile `<th>`-Zellen enthält, wird sie zum `<thead>` promoted
- **Keine `<th>` vorhanden** → Tabelle wird unverändert gelassen

Damit funktioniert auch das hier ohne weitere Anpassung:

```html
<table>
  <tr><th>Name</th><th t-sort>Preis</th></tr>
  <tr><td>A</td><td>10</td></tr>
  <tr><td>B</td><td>5</td></tr>
</table>
```

---

## Beispiele

### Sortier- und gruppierbare Tabelle

```html
<table>
  <thead>
    <tr>
      <th t-sort>Name</th>
      <th t-sort t-type="date">Datum</th>
      <th t-sort t-group>Kategorie</th>
      <th t-sort t-type="num">Preis</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Apfel</td><td>2025-03-12</td><td>Obst</td><td>1.20</td></tr>
    <tr><td>Brot</td><td>2025-03-13</td><td>Backwaren</td><td>2.50</td></tr>
    ...
  </tbody>
</table>
```

### Multi-Value-Gruppierung

```html
<table t-search>
  <thead>
    <tr>
      <th t-sort>Veranstaltung</th>
      <th t-sort t-type="date">Datum</th>
      <th t-group=",">Tags</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Sommerkonzert</td>
      <td>2025-06-21</td>
      <td>Musik, Open Air, Familie</td>
    </tr>
    <tr>
      <td>Sportfest</td>
      <td>2025-07-04</td>
      <td>Sport, Familie</td>
    </tr>
  </tbody>
</table>
```

Die Sportfest-Zeile erscheint in den Gruppen "Sport" und "Familie", die Sommerkonzert-Zeile in "Musik", "Open Air" und "Familie".

### Mehrere Gruppierungen verschachtelt

```html
<table>
  <thead>
    <tr>
      <th t-group="active">Jahr</th>
      <th t-group>Kategorie</th>
      <th t-sort>Titel</th>
    </tr>
  </thead>
  ...
</table>
```

Zuerst gruppiert nach Jahr, innerhalb jedes Jahres nach Kategorie, innerhalb davon sortiert nach Titel.

---

## Eigene Aktionen pro Gruppe

Wenn eine Gruppen-Header-Zeile gerendert wird, enthält sie einen leeren Container `.tv-group-actions`. Beim Render-Vorgang feuert tableView ein Custom-Event `tableview:groups-rendered`, sodass externe Skripte ihre eigenen Buttons einhängen können:

```js
table.addEventListener('tableview:groups-rendered', (e) => {
  e.detail.actionBoxes.forEach(box => {
    const path = box.dataset.groupPath;
    box.innerHTML = `<button onclick="exportGroup('${path}')">Export</button>`;
  });
});
```

Die übergebenen Daten:

| Feld | Beschreibung |
|---|---|
| `e.detail.table` | Die betroffene Tabelle |
| `e.detail.groupedColumns` | Indizes der aktiv gruppierten Spalten |
| `e.detail.actionBoxes` | Array aller `.tv-group-actions`-Container |

---

## CSS-Klassen

Klassen die von tableView gesetzt werden — alle in `tableview.css` mit Defaults belegt:

| Klasse | Wirkung |
|---|---|
| `.tv-enabled` | Tabelle wurde initialisiert |
| `.tv-hidden` | Zeile/Element ausgeblendet (`display: none`) |
| `.tv-group-row` | Gruppen-Header-Zeile |
| `.tv-group-collapsed` | Gruppe ist zugeklappt |
| `.tv-clone` | Geklonte Zeile bei Multi-Value-Gruppierung |
| `.tv-col-hidden` | Spalte versteckt (weil gruppiert) |
| `.tv-ico-active` | Sortier-/Gruppen-Icon aktiv |
| `.tv-search-row` | Suchfeld-Zeile im Thead |
| `.tv-empty-row` | "Keine Treffer"-Zeile |
| `.tv-icons` | Container der Sort/Group-Icons im `<th>` |

---

## Browser-Support

Nutzt `WeakMap`, `MutationObserver`, ES-Module-Imports und template literals — modernes Standard-JS ohne Polyfill-Bedarf. Funktioniert in allen aktuellen Browsern (Chrome, Firefox, Safari, Edge).