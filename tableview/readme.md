# tableView — Sort, Group & Search

> Vanilla JS · ES-Modul

Macht klassische HTML-Tabellen interaktiv: Spalten sortieren, nach Werten gruppieren (auch verschachtelt und mit Multi-Value-Split), die ganze Tabelle live durchsuchen, Spalten zusammenfassen und die eigene Ansicht speichern.

---

## Installation

```html
<script src="tableview.js" type="module"></script>
```

Achtung das CSS `tableview.css` in den selben Ordner wie das `.js` es wird automatisch geladen. (oder css Pfad in Datei anpassen)

Keine Abhängigkeiten, auch keine Icon-Schrift. Beim Import registriert sich tableView automatisch als Klick-Handler und beobachtet das DOM via `MutationObserver` — neue Tabellen die per Fetch oder JavaScript eingefügt werden, werden automatisch initialisiert.

Das lässt sich alles anpassen, siehe [Import-Optionen](#import-optionen).

---

## Attribut-Steuerung

Eine Spalte kann **sortierbar**, **gruppierbar**, **filterbar** und **zusammenfassbar** gemacht werden, die ganze Tabelle **durchsuchbar**.

### Auf den Zellen der ersten Zeile (`<th>` oder `<td>`)

| Attribut | Wirkung | Besonderheit |
|---|---|---|
| [`t-sort`](#t-sort) | Spalte sortierbar | Wert `asc`/`desc` setzt die Startsortierung |
| [`t-group`](#t-group) | Spalte gruppierbar | Wert `active:0`, `active:1` … setzt die Startgruppierung samt Reihenfolge; sonst ergibt sie sich aus der **Klickreihenfolge** |
| [`t-split`](#t-split) | Mehrfachwerte in der Zelle trennen | Die Zeile erscheint in jeder Gruppe — als Klon, der auf die echte Zeile zeigt |
| [`t-filter`](#t-filter) | Spalte filterbar | Der aktive Filter steht als JSON im Attribut |
| [`t-type`](#t-type) | Datentyp `num`, `date`, `string` | Wird automatisch erkannt, nur bei Bedarf selbst setzen |
| [`t-sum` `t-mean` `t-min` `t-max`](#t-sum-t-mean-t-min-t-max) | Spalte zusammenfassen | Attributwert ersetzt die Beschriftung, `"-"` lässt sie weg |
| [`data-sortValue`](#data-sortvalue) | Ersatzwert fürs Sortieren und Gruppieren | Greift auch beim Rechnen und Filtern |

### Auf dem `<table>`

| Attribut | Wirkung | Besonderheit |
|---|---|---|
| [`t-search`](#t-search) | Suchfeld einblenden | Erscheint erst ab mehr als 7 Datenzeilen |
| [`t-highlight`](#t-highlight) | Treffermarkierung | Standardmäßig an, `"false"` schaltet sie ab |
| [`t-summarize`](#t-summarize) | Position der Zusammenfassungszeile | `bottom` (Default) oder `top` |
| [`t-open`](#t-open) | Startzustand der Gruppen | Als Zahl gelesen: „die ersten n Ebenen offen" |
| [`t-group-empty`](#t-group-empty) | Zeilen ohne Gruppenwert | `"inline"`: direkt in die Gruppe darüber statt in eine Gruppe „—“ |
| [`t-sticky`](#t-sticky) | Gruppenköpfe bleiben beim Scrollen stehen | Standardmäßig an, `"false"` schaltet sie ab |
| [`t-view`](#gespeicherte-ansichten) | Schlüssel der gespeicherten Ansicht | Optional — ohne das Attribut ergibt er sich selbst |

---

### `t-sort`

Macht eine Spalte sortierbar. Bei Klick auf die Spaltenüberschrift wechselt die Sortierung zwischen aufsteigend → absteigend → unsortiert.

```html
<th t-sort>Name</th>
```

Als Default-Sortierung kann `asc` oder `desc` gesetzt werden:

```html
<th t-sort="desc">Datum</th>
```

Es ist immer nur eine Spalte gleichzeitig sortiert.

### `t-group`

Macht eine Spalte gruppierbar. Beim Klick auf das Gruppen-Icon werden alle Zeilen mit demselben Wert zu einer aufklappbaren Gruppe zusammengefasst.

```html
<th t-group>Kategorie</th>
```

Mehrere Spalten können gleichzeitig gruppiert sein — sie werden dann verschachtelt. **Die Reihenfolge ergibt sich aus der Klickreihenfolge**, nicht aus der Spaltenposition: die zuerst gruppierte Spalte ist die äußerste, jede weitere wird darunter feiner. Gespeichert wird das als `t-group="active:0"`, `t-group="active:1"` usw.

**Startgruppierung.** Dieselbe Schreibweise im HTML lässt die Tabelle bereits gruppiert starten, ohne dass der Nutzer etwas anklicken muss:

```html
<th t-group="active">Kategorie</th>
```

Bei mehreren Ebenen gibt die Zahl die Reihenfolge vor — hier ist Jahr die äußere Ebene, obwohl Kategorie links davon steht:

```html
<th t-group="active:1">Kategorie</th>
<th t-group="active:0">Jahr</th>
```

Ein blankes `t-group="active"` gilt als Position 0. Sinnvoll dazu ist [`t-open`](#t-open), sonst sieht der Nutzer zunächst nur zugeklappte Balken.

Diese Vorgabe ist zugleich der Ausgangszustand für die [gespeicherten Ansichten](#gespeicherte-ansichten): die Knöpfe bleiben aus solange nichts davon abweicht, und ein Zurücksetzen landet genau hier — nicht bei „ungruppiert".

Mehr dazu unter [Verschachtelte Gruppen](#verschachtelte-gruppen).

### `t-split`

Enthält eine Zelle mehrere Werte (z.B. `"Sport, Musik"`), gibt `t-split` das Trennzeichen an. tableView geht die Spalte Zeile für Zeile durch, zerlegt sie und baut daraus eine Uniq-Liste aller vorkommenden Werte. Eine Zeile erscheint danach in jeder Gruppe, in die sie gehört.

```html
<th t-group t-split=",">Tags</th>
```

Im DOM existiert die Zeile trotzdem nur **einmal echt** — alle weiteren Vorkommen sind Klone, die an das Original gekoppelt sind. Siehe [Multi-Value: geklonte Zeilen](#multi-value-geklonte-zeilen).

### `t-filter`

Lässt eine Spalte über ein Popover filtern. Der aktive Filter steht als JSON im Attribut, z.B. `t-filter='{"min":"5"}'`.

```html
<th t-filter>Kategorie</th>
```

### `t-type`

Der Datentyp der Spalte. Wird automatisch erkannt und gesetzt (automatisch gesetzte tragen zusätzlich `t-type-auto`), bei Bedarf selbst setzen:

- `num` — Zahl
- `date` — Datum, ISO `YYYY-MM-DD` oder `DD.MM.YYYY [HH:MM]`
- `string` — Text

```html
<th t-sort t-type="num">Preis</th>
<th t-sort t-type="date">Erstellt</th>
```

Der Typ entscheidet über die Sortierung, die Filteroptionen und darüber, welche Zusammenfassungen erlaubt sind.

### `t-sum` `t-mean` `t-min` `t-max`

Fassen eine Spalte zusammen. Sobald **irgendeine** Spalte eines der vier Attribute trägt, erscheint eine Zusammenfassungszeile.

| Attribut | Bedeutung | Erlaubte `t-type` |
|---|---|---|
| `t-sum` | Summe | `num` |
| `t-mean` | Mittelwert | `num` |
| `t-min` | kleinster Wert | `num`, `date` |
| `t-max` | größter Wert | `num`, `date` |

```html
<th t-sort t-type="num" t-sum t-mean>Preis</th>
```

Gerechnet wird immer über die **aktuell sichtbaren Zeilen** — Spaltenfilter und Suche wirken sich direkt auf die Werte aus. Bei Multi-Value-Gruppierung zählen Klon-Zeilen nicht doppelt. Sind keine Zeilen sichtbar, verschwindet die Zeile.

Passt das Attribut nicht zum Spaltentyp (z.B. `t-sum` auf einer Textspalte), wird es ignoriert und einmalig in der Console gewarnt.

**Beschriftung.** Der Attributwert ersetzt das Standardlabel (`Σ`, `⌀`, `Min`, `Max`):

```html
<th t-type="num" t-sum="Gesamt" t-mean="Schnitt">Umsatz</th>
```

`<th t-min>` und `<th t-min="">` sind im HTML nicht unterscheidbar — beide liefern einen leeren Attributwert. Um **nur die Zahl** zu bekommen, gibt es deshalb ein Schlüsselwort:

```html
<th t-type="num" t-sum="-">Umsatz</th>
```

Als Schlüsselwort gelten `-`, `none`, `off`, `false`, `no`, `ohne`, `kein`, `keine`.

**Darstellung.** Die Ausgabereihenfolge entspricht der Attributreihenfolge im HTML:

```html
<th t-type="num" t-max t-min t-mean>Preis</th>   <!-- Max, Min, ⌀ -->
```

Mehrere Aggregate einer Spalte stehen in einer umbrechenden Zeile, linksbündig. Die Mindestbreite bestimmt nur das breiteste Einzelaggregat — die Spaltenbreite ändert sich also kaum — aber wo Platz ist, stehen mehrere nebeneinander. Die Zeile bekommt keine eigene Hintergrundfarbe und keine eigene Schriftgröße, nur eine kräftige Trennlinie.

Ist eine Gruppierung aktiv, erscheinen dieselben Werte zusätzlich in jedem Gruppenkopf, gerechnet über die sichtbaren Zeilen dieser Gruppe.

### `data-sortValue`

Für komplexere Werte kann pro Zelle `data-sortValue` gesetzt werden — es wird dann fürs Sortieren, Gruppieren, Filtern und Rechnen nur dieser Wert berücksichtigt:

```html
<td data-sortValue="2025-03-12">12. März 2025</td>
```

### `t-search`

Fügt automatisch ein Suchfeld unter die Kopfzeile ein. Die Eingabe wird in Tokens (durch Leerzeichen getrennt) zerlegt — eine Zeile bleibt sichtbar wenn **alle** Tokens irgendwo in irgendeiner Spalte vorkommen.

```html
<table t-search>
  ...
</table>
```

Das Feld erscheint erst ab mehr als 7 Datenzeilen, bleibt aber sichtbar solange etwas eingegeben ist. Gruppen ohne sichtbare Treffer werden ausgeblendet, der Treffer-Counter zeigt `gefiltert/gesamt`.

Bei jeder **geänderten Eingabe** werden alle Gruppen mit Treffern aufgeklappt. Das landet im gespeicherten Zustand, du kannst also direkt danach wieder zuklappen und es bleibt zu — bis zum nächsten Tastendruck im Suchfeld.

### `t-highlight`

Die eingegebenen Tokens werden in den sichtbaren Zeilen markiert — jeder Treffer landet in einem `<mark class="tv-hit">`, auch in Gruppenköpfen. Die Markierung wird vor jedem Render wieder aufgelöst, der Zellentext bleibt also unverändert; `t-value`, `data-sortValue` und eigenes Markup in den Zellen bleiben erhalten.

Standardmäßig an, abschalten mit:

```html
<table t-search t-highlight="false">
```

Nur das Aussehen ändern geht über CSS:

```css
mark.tv-hit { background: gold; }
```

### `t-summarize`

Legt fest, wo die Zusammenfassungszeile landet:

```html
<table t-search t-summarize="top">
```

| Wert | Wirkung |
|---|---|
| `bottom` | unter der letzten Datenzeile (**Default**) |
| `top` | direkt unter Kopf- bzw. Suchzeile |

Ohne `t-summarize` gilt `bottom`, sobald eines der vier Aggregat-Attribute gesetzt ist. Unbekannte Werte fallen auf `bottom` zurück (mit Console-Warnung).

### `t-open`

Als Zahl gelesen heißt `t-open` „die ersten n Ebenen offen":

```html
<table t-open="1">   <!-- oberste Ebene aufgeklappt -->
<table t-open="2">   <!-- zwei Ebenen tief aufgeklappt -->
```

Beim ersten Render mit aktiver Gruppierung wird die Zahl in die interne Pfadliste übersetzt und danach normal weitergepflegt. Ohne `t-open` startet alles zugeklappt.

### `t-group-empty`

Hat eine Zeile in einer gruppierten Spalte keinen Wert, landet sie normalerweise in einer eigenen Gruppe „—“. Mit `t-group-empty="inline"` bekommt sie keine Gruppe, sondern steht direkt in der Gruppe darüber — hinter deren Untergruppen, so wie Dateien neben Unterordnern.

Damit lassen sich Ordnerpfade abbilden: je Ebene eine gruppierte Spalte, tiefere Ebenen bleiben leer.

```html
<table t-group-empty="inline">
  <tr><th t-group="active:0">Ordner</th><th t-group="active:1">Unterordner</th><th>Name</th></tr>
  <tr><td>Bank</td><td></td><td>Sparkasse</td></tr>        <!-- direkt unter „Bank“ -->
  <tr><td>Bank</td><td>Konten</td><td>Girokonto</td></tr>  <!-- in „Bank › Konten“ -->
</table>
```

Ohne das Attribut (oder mit `"group"`) bleibt es bei der Gruppe „—“.

### `t-sticky`

Beim Scrollen bleiben die Gruppenköpfe stehen, jede Ebene rastet unter der darüberliegenden ein. Abschalten mit `t-sticky="false"`. Sitzt die Tabelle unter einem eigenen fixierten Header, verschiebt `--tv-sticky-offset` den Einrastpunkt.

---

## Import-Optionen

Drei Schalter lassen sich an die Import-URL hängen. Als „aus" gelten `false`, `0`, `off`, `no`, `nein`, `aus`; alles andere und ein fehlender Parameter heißen „an".

| Parameter | Default | Wirkung |
|---|---|---|
| `autodetect` | an | Tabellen automatisch finden und initialisieren |
| `icons` | `utf8` | Icon-Set, siehe [Icons](#icons) |
| `viewurl` | an | Gespeicherte Ansichten auch in die URL schreiben |

```html
<script src="tableview.js?autodetect=false&icons=msr" type="module"></script>
```

### Autoerkennung abschalten

```js
import { prepareTables } from './tableview.js?autodetect=false';
prepareTables();                                   // ganzes Dokument
prepareTables(document.querySelector('#report'));  // nur ein Ausschnitt
prepareTables(meineTabelle);                       // eine einzelne Tabelle
```

Dann wird beim Import nichts initialisiert und kein DOM-Observer gestartet — nur was `prepareTables()` bekommt, wird interaktiv. Nachträglich anschalten geht mit `startAutodetect()`: initialisiert alle vorhandenen Tabellen und zieht ab dann neue automatisch nach.

---

## Icons

tableView bringt **keine Icon-Schrift** mit. Standardmäßig werden reine UTF-8-Zeichen ausgegeben, das funktioniert ohne jede zusätzliche Datei.

Ein Icon-Set ist eine flache Map. Der Wert wird als **Markup** in den Icon-Span gesetzt — ein Zeichen reicht, es darf aber genauso gut ein eigenes Element mit eigener Klasse sein.

| Schlüssel | `default-utf8` | `default-msr` | wo |
|---|---|---|---|
| `sort` | ⇅ | `unfold_more` | Spalte unsortiert |
| `asc` | ↑ | `arrow_upward` | aufsteigend |
| `desc` | ↓ | `arrow_downward` | absteigend |
| `group` | ☰ | `workspaces` | Gruppieren-Icon |
| `filter` | ▽ | `filter_alt` | Filter-Button |
| `clear` | ⊘ | `filter_alt_off` | Filter löschen |
| `open` | ▾ | `expand_more` | Gruppe offen |
| `closed` | ▸ | `chevron_right` | Gruppe zu |
| `remove` | ✕ | `close` | Suche leeren / Gruppierung aufheben |
| `search` | ⌕ | `search` | Suchfeld |
| `deepOpen` | ⊞ | `unfold_more` | Gruppe samt Unterebenen aufklappen |
| `deepClosed` | ⊟ | `unfold_less` | Gruppe samt Unterebenen zuklappen |
| `viewSave` | ★ | `bookmark_add` | Ansicht merken |
| `viewReset` | ↺ | `restart_alt` | Ansicht zurücksetzen |

Im Set `default-msr` stecken die Namen jeweils in `<span class="msr">…</span>` — dieselbe Klasse die datepicker und selectpicker für Material Symbols Rounded verwenden. Die Schrift dafür musst du selbst einbinden.

`setIcons()` nimmt **genau einen Parameter**: einen Set-Namen oder eine eigene Map.

```js
import { setIcons } from './tableview.js';

setIcons('default-msr');    // mitgeliefertes Material-Set
setIcons('default-utf8');   // zurück zum Default

setIcons({
  search: '<span class="meine-font">xyz</span>',
  open:   '<img src="/icons/chevron-down.svg" alt="">',
  closed: '▸'
});
```

Die Map wird über das aktuelle Set gelegt — was nicht drinsteht bleibt wie es war, unbekannte Schlüssel landen als Warnung in der Console. Damit lässt sich auch nur ein einzelnes Icon tauschen. `setIcons()` wirkt sofort auf alle bereits gerenderten Tabellen, auch auf die Filter-Popovers im `<body>`. `getIcons()` liefert die aktuelle Map als Kopie, `ICON_SETS` die beiden mitgelieferten.

Jedes Icon steckt in einem `<span class="tv-glyph" data-tv-ico="…">`. `.tv-glyph` setzt nur Größe und Ausrichtung, keine `font-family` — die kommt bei eigenen Sets aus deinem Markup.

---

## Verschachtelte Gruppen

Mehrere aktive `t-group`-Spalten werden ineinander geschachtelt. Damit das bei drei oder vier Ebenen übersichtlich bleibt, macht tableView folgendes:

**Tiefe sichtbar.** Jede Gruppenzeile trägt `data-depth` und `--tv-d`. Daraus ergeben sich Einrückung, eine linke Führungslinie und ein leicht abgestufter Hintergrund. Die Datenzeilen bleiben unangetastet: volle Breite, keine Einrückung, eigener Hintergrund — Zebrastreifen über `:nth-child()` bleiben intakt. Sie tragen trotzdem `.tv-in-group`, `data-group-path` und `--tv-d`, falls du selbst etwas daran hängen willst.

**Abgerundet, außer die Zeilen schließen direkt an.** Ein Gruppenbalken ist rundum abgerundet. Gerade wird die Unterkante nur, wenn die Gruppe aufgeklappt ist **und** direkt darunter ihre Datenzeilen stehen (`.tv-flat-bottom`). Enthält eine aufgeklappte Gruppe ausschließlich weitere Gruppen, bleibt sie rund.

**Einzelkind-Ketten werden gefaltet.** Hat eine Gruppe genau ein Unterkind das selbst eine Gruppe ist, landen beide in einer Zeile: `Kat Solo › Jahr 2026 › Q Q9`. Das spart bei schiefen Daten sehr viele Balken. Auf-/Zuklappen wirkt auf die Kette als Ganzes, das ✕ hebt alle Gruppierungen der Kette auf.

**Feste Geometrie links.** Der Kopf beginnt immer gleich: `0.5rem` Rand, `1rem` Pfeil, `0.25rem` Luft, dann direkt der Text — unabhängig davon ob die Gruppe Unterebenen hat. Der Spaltenname steht klein und in Versalien über dem Wert, linksbündig. Alles Weitere (Zwischensummen, Zweig-Schalter, Zähler, Schließen) sitzt am rechten Rand.

**Zwischensummen.** Trägt eine Spalte eines der Aggregat-Attribute, erscheinen die Werte auch in jedem Gruppenkopf — bewusst im Kopf und nicht als eigene Zeile, sonst verdoppelt sich die Zeilenzahl.

### Auf- und Zuklappen

Jeder Gruppenkopf hat zwei Schalter. Links das Dreieck, es klappt **nur diese Ebene**. Rechts neben dem Zähler `.tv-deep`, das klappt die **Gruppe samt allen Unterebenen** auf bzw. zu; ohne Untergruppen bleibt der Platz als `.tv-deep-off` leer stehen, damit Zähler und Schließen-Knopf in einer Flucht bleiben. **Shift-Klick** auf den Kopf tut dasselbe wie `.tv-deep`.

Alle Bedienelemente sind dauerhaft sichtbar — auf dem Handy gibt es kein Hover.

Per JS:

```js
import { expandTo, expandAll, collapseAll, toggleBranch } from './tableview.js';

expandTo(table, 2);          // bis Ebene 2 aufklappen
collapseAll(table);          // = expandTo(table, 0)
expandAll(table);
toggleBranch(table, pfad);   // eine Gruppe samt Unterbau
```

### Multi-Value: geklonte Zeilen

Bei [`t-split`](#t-split) taucht eine Zeile in mehreren Gruppen auf. Im DOM existiert sie trotzdem nur **einmal echt**; alle weiteren Vorkommen sind Klone, und die sind an das Original gekoppelt:

| | |
|---|---|
| `id` und `name` | trägt nur das Original. Im Klon liegen sie als `data-tv-id` / `data-tv-name`. `getElementById()` und `querySelector('#x')` treffen also immer das Echte, Radio-Gruppen bleiben heil. |
| Klasse | bleibt auf dem Klon erhalten. Das Original erkennst du über `:not(.tv-clone)`. |
| Klick | wird abgefangen und auf dem Originalelement ausgelöst. Dein Handler läuft genau einmal, `event.target` ist das echte Element. |
| `input` / `change` | Wert bzw. `checked` wandert ins Original, das Event feuert dort, anschließend werden alle anderen Klone nachgezogen. |
| `keydown` / `keyup` | werden auf das Original gespiegelt. |
| Feldzustand | `cloneNode()` kopiert keine Live-Werte — tableView überträgt `value`, `checked` und `selectedIndex` beim Klonen selbst. |

Die Zuordnung läuft über `data-tv-clone-of` an der Klonzeile und `data-tv-ref` an jedem Element. Praktisch heißt das: du kannst in eine solche Zeile Buttons oder Inputs setzen und musst dich nicht darum kümmern, in welcher Gruppe der Nutzer sie gerade bedient.

---

## Gespeicherte Ansichten

Läuft ohne Zutun — kein Attribut, keine Konfiguration. Jede Tabelle bekommt automatisch einen Schlüssel:

1. eine eigene `id`, falls vorhanden
2. sonst ein Hash über die Spaltenüberschriften — der übersteht auch das Umsortieren mehrerer Tabellen auf einer Seite
3. sonst die Position im Dokument

Die von tableView selbst vergebene `tv-table-N` zählt nicht mit, die ist nur ein Zähler. Wer den Schlüssel doch in der Hand haben will, setzt `t-view="name"` am `<table>`.

Gesichert wird **nur wonach sortiert und gruppiert wird, inklusive der Gruppierungsreihenfolge**. Welche Gruppe gerade offen oder zu ist, gehört bewusst nicht dazu — das ist Arbeitszustand, keine Ansicht, und er bezieht sich auf konkrete Werte die es morgen vielleicht nicht mehr gibt. Spalten stehen als Index drin; ändert sich der Aufbau der Tabelle, baut sich der Nutzer die Ansicht im Zweifel ohnehin neu.

Gespeichert wird pro Seitenpfad: dieselbe Tabelle unter einer anderen Route ist eine andere Ansicht.

### Knöpfe

Die beiden Icon-Knöpfe baut tableView selbst ein, rechtsbündig über der Titelzeile:

- **Ohne eigenes `<caption>`** legt tableView eines an (`caption.tv-viewbar`). Es rendert als eigene Zeile über der Tabelle, ohne Spaltenbreiten anzufassen und ohne den Kopf zu überlagern.
- **Mit eigenem `<caption>`** hängen die Knöpfe als `span.tv-viewbar-inline` rechts in deine Beschriftung — eine Tabelle darf nur ein `<caption>` haben. Dein Text bleibt links stehen.

Sie erscheinen nur wenn sie etwas zu tun haben:

| Knopf | sichtbar sobald |
|---|---|
| Merken (`viewSave`) | die Ansicht von der **zuletzt gespeicherten** abweicht. Ist noch nichts gespeichert, gilt der HTML-Stand als Vergleich |
| Zurücksetzen (`viewReset`) | die Ansicht vom **HTML-Stand** abweicht |

Stimmt beides überein, verschwindet der Zusatz restlos — dein Caption-Text bleibt dabei unberührt.

Wer die Knöpfe zusätzlich woanders haben will, setzt die Attribute selbst; der Klick wird global abgefangen:

```html
<button t-view-save>Ansicht merken</button>
<button t-view-reset>Zurücksetzen</button>
<button t-view-share>Link kopieren</button>
```

Ohne Wert gilt die umgebende Tabelle, und wenn der Knopf außerhalb steht und es nur eine Tabelle auf der Seite gibt, eben die. Bei mehreren verweist der Attributwert auf `id` oder `t-view`.

### Speicherort

Gespeichert wird in `localStorage` unter `tableview:<pfad>:<schlüssel>` **und** als Query-Parameter `tv-<schlüssel>` in der URL. Damit ist eine gemerkte Ansicht gleichzeitig teilbar: Link kopieren, verschicken, der Empfänger sieht dieselbe Sortierung.

Beim Laden schlägt die URL den `localStorage` — ein geteilter Link zeigt also immer das, was der Absender gemeint hat, ohne die eigene gespeicherte Ansicht zu überschreiben.

Wer die URL nicht anfassen will, schaltet sie mit `?viewurl=false` ab (siehe [Import-Optionen](#import-optionen)). Dann bleibt alles im `localStorage`, und `shareUrl()` ist die einzige Stelle die noch einen Link erzeugt.

### JS-API

```js
import { saveView, loadView, resetView, shareUrl } from './tableview.js';

saveView(table);     // aktuelle Ansicht sichern
loadView(table);     // gespeicherte anwenden (passiert beim Init automatisch)
resetView(table);    // zurück auf HTML-Stand, Gespeichertes löschen
shareUrl(table);     // Link auf die aktuelle Ansicht, ohne lokal zu speichern
```

Dazu zwei Events am `<table>`, beide `bubbles: true`: `tableview:view-saved` mit `{ key, view }` und `tableview:view-reset` mit `{ key }`.

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

### Mit Zusammenfassung

```html
<table t-search t-summarize="top">
  <thead>
    <tr>
      <th t-sort>Artikel</th>
      <th t-sort t-group>Kategorie</th>
      <th t-sort t-filter t-type="num" t-sum t-mean t-min t-max>Preis</th>
      <th t-sort t-type="date" t-min t-max>Datum</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Apfel</td><td>Obst</td><td>1,20</td><td>2025-03-12</td></tr>
    <tr><td>Brot</td><td>Backwaren</td><td>2,50</td><td>2025-03-13</td></tr>
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
      <th t-group t-split=",">Tags</th>
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

Die Sportfest-Zeile erscheint in den Gruppen „Sport" und „Familie", die Sommerkonzert-Zeile in „Musik", „Open Air" und „Familie".

### Mehrere Gruppierungen verschachtelt

```html
<table t-open="1">
  <thead>
    <tr>
      <th t-group="active:0">Jahr</th>
      <th t-group="active:1">Kategorie</th>
      <th t-sort>Titel</th>
    </tr>
  </thead>
  ...
</table>
```

Zuerst gruppiert nach Jahr, innerhalb jedes Jahres nach Kategorie, innerhalb davon sortiert nach Titel. Die oberste Ebene startet aufgeklappt.

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
| `.tv-col-hidden` | Spalte versteckt (weil gruppiert) |
| `.tv-icons` | Container der Sort/Group-Icons im `<th>` |
| `.tv-glyph` | Jeder Icon-Span, trägt `data-tv-ico="…"` |
| `.tv-ico-active` | Sortier-/Gruppen-Icon aktiv |
| `.tv-search-row` | Suchfeld-Zeile im Thead |
| `mark.tv-hit` | Markierter Suchtreffer in einer Zeile |
| `.tv-empty-row` | „Keine Treffer"-Zeile (nur wenn Zeilen da sind, aber alle gefiltert) |
| `.tv-group-row` | Gruppen-Header-Zeile (trägt `data-depth` und `--tv-d`) |
| `.tv-group-collapsed` | Gruppe ist zugeklappt |
| `.tv-flat-bottom` | Aufgeklappte Gruppe mit Datenzeilen direkt darunter |
| `.tv-in-group` | Datenzeile innerhalb einer Gruppe (ungestylt) |
| `.tv-group-trail` | Kette aus Spaltenname + Wert im Gruppenkopf |
| `.tv-group-label` / `.tv-group-value` | Spaltenname (klein, oben) / Gruppenwert |
| `.tv-group-sep` | „›" zwischen gefalteten Kettengliedern |
| `.tv-deep` / `.tv-deep-off` | Schalter „Gruppe samt Unterebenen" / leerer Platzhalter |
| `.tv-group-spacer` | Schiebt Zähler und Schließen-Knopf nach rechts |
| `.tv-group-sums` / `.tv-group-sum` | Zwischensummen im Gruppenkopf |
| `.tv-clone` | Geklonte Zeile bei Multi-Value-Gruppierung (`data-tv-clone-of`) |
| `.tv-summary-row` | Zeile mit den Spalten-Zusammenfassungen |
| `.tv-sum-box` | Umbrechender Container innerhalb einer Summen-Zelle |
| `.tv-sum-item` | Ein Aggregat (`data-agg="sum\|mean\|min\|max"`) |
| `.tv-sum-label` / `.tv-sum-value` | Beschriftung / Wert |
| `caption.tv-viewbar` / `.tv-view-btn` | Knopfzeile über der Tabelle / einzelner Icon-Knopf |

---

## CSS-Variablen für Gruppen

| Variable | Default | Wirkung |
|---|---|---|
| `--tv-group-indent` | `1.25rem` | Einrückung je Verschachtelungsebene |
| `--tv-group-gap` | `0.25rem` | Abstand über jedem Gruppenbalken |
| `--tv-group-h` | `2.25rem` | Höhe einer Gruppenzeile, Basis fürs Sticky-Stapeln |
| `--tv-sticky-offset` | `0px` | Zusätzlicher Abstand von oben, z.B. unter einem fixierten Seitenheader |

---

## Browser-Support

Nutzt `WeakMap`, `MutationObserver`, ES-Module-Imports und template literals — modernes Standard-JS ohne Polyfill-Bedarf. Funktioniert in allen aktuellen Browsern (Chrome, Firefox, Safari, Edge).