# InP — Interactive Pages

Macht klassisches Server-Side Rendering dynamisch: Normale HTML-Links und Buttons laden Inhalte per Fetch im Hintergrund und öffnen sie als Modal oder aktualisieren Teile der aktuellen Seite — ohne Seiten-Reload.

---

## Installation

```html
<script src="inp.js" type="module"></script>
```

Kein Build-Schritt, keine Abhängigkeiten. InP setzt sich nach dem Laden automatisch als globaler Klick- und Submit-Handler.

---

## Attribute

### `data-inp-typ`

Pflichtattribut auf jedem InP-Element. Steuert das Verhalten beim Klick.

| Wert | Beschreibung | Voraussetzung |
|---|---|---|
| `modal` | Lädt die Zielseite und öffnet sie als nativen `<dialog>`. CSS und JS der Zieldatei werden isoliert ausgeführt. | `href` oder `data-href` |
| `update` | Lädt die Zielseite und ersetzt das Element, das in `data-target` angegeben ist. | `data-target` |
| `submit-btn` | Sendet das umgebende `<form>` per Fetch ab, aktualisiert optional `data-target` und schließt den Dialog. | muss in einem `<form>` liegen |
| `close-btn` | Schließt den umgebenden Dialog ohne weitere Aktion (Abbruch). | muss in einem `<dialog>` liegen |

### `data-href`

Alternative zu `href` für Nicht-Link-Elemente (z.B. `<button>`). InP prüft zuerst `data-href`, dann `href`.

```html
<button data-inp-typ="modal" data-href="detail.html">Öffnen</button>
```

### `data-extract`

CSS-Selektor, der festlegt welcher Teil der **Zielseite** in den Modal geladen wird. Ohne dieses Attribut wird der gesamte `<body>` der Zielseite verwendet.

```html
<!-- Nur #form-area der Zieldatei wird im Modal gezeigt -->
<a href="login.html" data-inp-typ="modal" data-extract="#form-area">Login</a>
```

### `data-target`

CSS-Selektor (oder komma-getrennte Liste von Selektoren), der festlegt welche Elemente auf der **aktuellen Seite** nach einem Submit oder Update ersetzt werden. InP sucht die Elemente auch in der Server-Antwort und tauscht sie aus. Ist kein passendes Element in der Antwort vorhanden, wird der gesamte `<body>` verwendet.

Mehrere Selektoren werden per Komma getrennt:

```html
<a href="..." data-inp-typ="modal" data-target="#liste, #counter">Hinzufügen</a>
```

Sonderfall `"null"`: Kein Update nach dem Submit — der Dialog wird nur geschlossen.

```html
<button data-inp-typ="submit-btn" data-target="null">Speichern</button>
```

### `data-target-type`

Steuert wie der neue Inhalt in das Ziel eingefügt wird. Standard ist `replace`.

| Wert | Wirkung |
|---|---|
| `replace` | `innerHTML` des Ziel-Elements wird ersetzt (Standard) |
| `outer` | Das Ziel-Element selbst wird komplett ersetzt (`replaceWith`) |
| `beforebegin` | Neuer Inhalt wird **vor** das Ziel-Element eingefügt |
| `afterbegin` | Neuer Inhalt wird als **erstes Kind** eingefügt |
| `beforeend` | Neuer Inhalt wird als **letztes Kind** angehängt |
| `afterend` | Neuer Inhalt wird **nach** dem Ziel-Element eingefügt |

Bei mehreren `data-target`-Selektoren kann `data-target-type` ebenfalls komma-getrennt angegeben werden. Sind weniger Types als Selektoren vorhanden, wird der **letzte Type** für alle übrigen Selektoren wiederverwendet.

```html
<!-- #a bekommt beforeend, #b und #c bekommen replace -->
<a href="..."
   data-inp-typ="modal"
   data-target="#a, #b, #c"
   data-target-type="beforeend, replace">Hinzufügen</a>
```

---

## Submit-Verhalten

InP fängt das `submit`-Event in der **Bubble-Phase** ab — also nach allen anderen Event-Listenern auf dem Formular. Wenn ein Validator oder ein anderes Script vorher `e.preventDefault()` aufruft, respektiert InP das und sendet **nicht** ab. Dies ermöglicht native HTML5-Validierung und eigene Validator-Bibliotheken.

Das `data-target` beim Submit wird in dieser Reihenfolge bestimmt:
1. `data-target` auf dem `submit-btn` im Dialog
2. `data-target` auf dem `<dialog>` selbst
3. Kein Target → ganze Seite wird ersetzt (oder Redirect wird gefolgt)

---

## Beispiele

### Einfacher Modal

```html
<a href="information.html" data-inp-typ="modal">Informationen</a>

<!-- Oder mit Button -->
<button data-inp-typ="modal" data-href="information.html">Informationen</button>
```

### Gezielte Extraktion

Wenn die Zieldatei Header, Footer und Navigation hat, die im Modal nicht gebraucht werden:

```html
<!-- Hauptseite -->
<button data-inp-typ="modal"
        data-href="login.html"
        data-extract="#form-area">Login</button>

<!-- login.html — nur #form-area wird in den Modal geladen -->
<header>Wird ignoriert</header>
<main>
  <section id="form-area">
    <form>
      <input type="text" placeholder="Nutzername">
      <input type="password" placeholder="Passwort">
      <a data-inp-typ="close-btn">Abbrechen</a>
      <button data-inp-typ="submit-btn">Einloggen</button>
    </form>
  </section>
</main>
<footer>Wird ignoriert</footer>
```

### Partielle Updates nach Submit

Nach dem Submit wird nur der angegebene Bereich der Seite aktualisiert:

```html
<!-- Hauptseite -->
<ul id="user-list">
  <li>Max Mustermann</li>
</ul>

<a href="add-user.php"
   data-inp-typ="modal"
   data-target="#user-list">Nutzer hinzufügen</a>

<!-- add-user.php — Formular im Modal -->
<form action="save-user.php" method="post">
  <input type="text" name="name" placeholder="Name">
  <button data-inp-typ="submit-btn">Speichern</button>
</form>

<!-- save-user.php gibt die aktualisierte Liste zurück -->
<!-- InP sucht #user-list in der Antwort und tauscht sie aus -->
<ul id="user-list">
  <li>Max Mustermann</li>
  <li>Erika Musterfrau</li>
</ul>
```

### Neue Einträge anhängen statt ersetzen

```html
<a href="add-item.php"
   data-inp-typ="modal"
   data-target="#liste"
   data-target-type="beforeend">Hinzufügen</a>
```

### Mehrere Bereiche gleichzeitig aktualisieren

```html
<!-- #liste bekommt einen neuen Eintrag angehängt, #counter wird ersetzt -->
<a href="add-item.php"
   data-inp-typ="modal"
   data-target="#liste, #counter"
   data-target-type="beforeend, replace">Hinzufügen</a>
```

### Submit ohne sichtbares Update

Wenn nur gespeichert werden soll, ohne dass sich etwas auf der Seite ändert:

```html
<form action="save.php" method="post">
  <input type="text" name="wert">
  <button data-inp-typ="submit-btn" data-target="null">Speichern</button>
</form>
```

### Redirect-Handling

InP erkennt Server-Redirects automatisch — via PHP `header()`, Meta-Refresh oder JavaScript `location.href`. Wenn kein `data-target` gesetzt ist und ein Redirect erkannt wird, navigiert die Hauptseite dorthin.

```php
/* PHP */
header("Location: dashboard.php");
exit();
```

---

## Modal-Styling

Der von InP erzeugte `<dialog>` hat die Klasse `inp-modal` und bringt ein eingebettetes Standard-Styling mit. Dieses kann über CSS-Variablen überschrieben werden:

```css
:root {
  --inp-bg:       #ffffff;           /* Modal-Hintergrund */
  --inp-text:     #1a1a1a;           /* Textfarbe */
  --inp-border:   #e0e0e0;           /* Rahmenfarbe */
  --inp-shadow:   0 10px 25px …;     /* Box-Shadow */
  --inp-backdrop: rgba(0,0,0,.3);    /* Backdrop-Farbe */
}
```

Dark Mode wird automatisch via `@media (prefers-color-scheme: dark)` unterstützt.

---

## JS-Isolation im Modal

Inline-Skripte der Zieldatei werden isoliert ausgeführt: `document`-Aufrufe (`querySelector`, `getElementById` usw.) werden auf den Modal-Scope umgeleitet, sodass sie nur Elemente innerhalb des Dialogs statt der Hauptseite manipulieren.

ES-Module (`type="module"`) werden dabei über einen Proxy korrekt behandelt und relative Import-Pfade werden automatisch auf den Ursprungspfad der Zieldatei aufgelöst.

---

## Browser-Support

InP nutzt die native `<dialog>`-API (Chrome 98+, Firefox 98+, Safari 15.4+) sowie `fetch`, `DOMParser` und `FormData` — alles modern unterstützte APIs ohne Polyfill-Bedarf.