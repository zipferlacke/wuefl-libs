# wuefl-libs

Eine Sammlung von wiederverwendbaren Web-Komponenten und Utilities. Jede Komponente ist so konzipiert, dass sie unabhängig voneinander eingesetzt werden kann.

---

## Komponenten

### Banner

Ein einfacher Banner für Pop-up-Benachrichtigungen, der am oberen Rand der Seite eingeblendet wird. Unterstützt die Typen `info`, `success`, `warning` und `error`. Benachrichtigungen verschwinden automatisch nach einer konfigurierbaren Zeit.

<details>
<summary>Nutzung & Beispiel</summary>

**Datei:** `banner/banner.js`
> `banner/banner.css` muss im selben Verzeichnis liegen — wird automatisch vom Skript geladen.

**Beispiel:**
```js
import { showBanner } from './banner/banner.js';

showBanner("Gespeichert!", "success", 4000);
showBanner("Etwas ist schiefgelaufen.", "error");
```

</details>

---

### CSS Styles

Eine Sammlung von CSS-Dateien, die grundlegende Styles, Resets, Layout-Komponenten und UI-Utilities bereitstellen. Alle Dateien sind in CSS-Layer organisiert (`reset`, `layout`, `components`, `defaults`, `custom`).

<details>
<summary>Nutzung & Beispiel</summary>

**Alle Styles auf einmal einbinden:**
```html
<link rel="stylesheet" href="css/import.css">
```

**Enthaltene Bereiche:**

| Bereich | Pfad | Dateien |
| :--- | :--- | :--- |
| Reset | `css/reset/` | `_reset.css` |
| Layout | `css/layout/` | `_header.css`, `_footer.css`, `_bottom_navigation.css`, `_sidemenu.css`, `_nav.css` |
| Components | `css/components/` | `_form.css`, `_inputs.css`, `_card.css`, `_dialog.css`, `_container.css`, `_img.css`, `_audio_video.css`, `_details.css`, `_progress.css`, `_swipe.css`, `_loadingscreen.css` |
| UI / Defaults | `css/ui/` |`font.css`, `box_shadow.css`, `sizes.css`, `verticle.css` `colors.css`|
| Fonts | `css/fonts/` | `google-icons-rounded.css` (Material Symbols Rounded) |

Die Farbgebung und alles weiter kann über über folgende Beispiel Datei individalisiert werden. Die Farben liegen mit 50, 100, 200 , ...900 vor und passen sich automatisch ans light und dark Theme an ...

#### `controll.css`
```css
@import "../libs/wuefl-libs/css/import.css";


@layer custom {
  :root {

    --width-small: 800px;
    --width-normal: 1000px;
    --width-large: 1200px;
    --width-full: 100%;

    /* Farbtöne konvigurieren*/
    --clr-primary: hsl(38.64deg 100% 49.2%);
    --clr-secondary: hsl(199.99 24.27% 56.47%);
    --clr-info: #04A3F2;
    --clr-success: hsl(93, 95%, 44%);
    --clr-warning: #FF990A;
    --clr-danger: hsl(1, 90%, 59%);
    --clr-neutral: hsl(0, 0%, 59%);

    /*Allegemeine Dinge*/
    --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    --text-size: var(--fs-300);
    --text-color: var(--clr-neutral-900);
    --text-hover: var(--clr-neutral-700);
    --text-height: 1.6;

    --bg-default: var(--clr-neutral-50);
    --br-default: 1rem;

    --clr-headings: var(--clr-primary-900);

    --header-height: 4rem;
    --header-nav-height: 0rem;
    --bg-header: var(--clr-primary-600);
    --bg-header-nav: var(--clr-primary-500);
    --clr-header: var(--clr-primary-100);
    --clr-header-nav: var(--clr-primary-900);

    --nav-bottom-height: 3.5rem;

    --clr-nav: var(--text-color);
    --clr-nav-accent: var(--clr-secondary-900);

    --footer-nav-items: 3;

    /* Button/Input Design */
    --fs-input: var(--text-size);
    --bg-input: var(--clr-primary-300);
    --bg-input-hover: var(--clr-primary-400);
    --bg-input-selected: var(--clr-primary-600);
    --clr-input: var(--clr-neutral-800);
    --clr-input-selected: var(--clr-neutral-400);
    --br-input: var(--br-default);
    --input-height: 2.25rem;

    --img-aspect-ratio: 16/9;

    --bg-sidemenue-blur: var(--clr-neutral-200);
    --bg-sidemenu: var(--bg-header);

    /*Dialoge*/
    --bg-dialog-close: var(--clr-danger-500);
    --bg-dialog-close-hover: var(--clr-danger-600);
    --clr-dialog-submit: var(--clr-neutral-100);
    --bg-dialog-submit: var(--clr-primary-900);
    --bg-dialog-submit-hover: var(--clr-primary-800);

    /* SelectPicker v1_0_0 – neue Variablen */
    --clr-picker:          var(--bg-default);
    --clr-picker-trigger:  var(--bg-input);
    --clr-picker-input:    var(--clr-primary-600);
    --fs-picker-header:    1rem;
    --fs-input-picker:     0.9rem;
    --br-picker:           var(--br-default);
    --height-input-picker: var(--input-height);

    --slideshow-ratio: none;
  }

  html, body {
    font-size: var(--text-size);
    line-height: var(--text-height);
    color: var(--text-color);
    fill: var(--text-color);
    font-family: var(--font-family);
  }
}
```

</details>

---

### Datepicker

Ein Vanilla-JS-Datum- und Zeitpicker ohne externe Abhängigkeiten. Unterstützt Single- und Range-Modus, Zeitauswahl und flexible CSS-Variablen.

**→ [Vollständige Dokumentation](./datepicker/readme.md)**

---

### INP (Interactive Pages)

Macht klassisches Server-Side Rendering dynamisch: HTML-Links und Buttons laden Inhalte per Fetch im Hintergrund und öffnen sie als Modal oder aktualisieren Teile der aktuellen Seite — ohne Seiten-Reload.

**→ [Vollständige Dokumentation](./inp/readme.md)**

---

### JavaScript Utilities

Eine Sammlung allgemeiner JavaScript-Hilfsdateien.

<details>
<summary>Nutzung & Beispiel</summary>

| Datei | Beschreibung |
| :--- | :--- |
| `js/gestures.js` | Touch-Gesten-Erkennung (z.B. Swipe links/rechts) |
| `js/menu.js` | Funktionalität für Navigationsmenüs |
| `js/networkconnection.js` | Überprüft den Netzwerkstatus (online/offline) |
| `js/search.js` | Clientseitige Suchfunktion |
| `js/service-worker.js` | Basis-Service-Worker für Offline-Nutzung |
| `js/wnews-elements/` | Custom Elements für das `wnews`-Nachrichten-System |

**Beispiel:**
```js
import Gestures from './js/gestures.js';

const gestures = new Gestures(document.querySelector('.slideshow'));
gestures.onLeft(() => console.log('Swipe links'));
gestures.onRight(() => console.log('Swipe rechts'));
```

</details>

---

### QR Code Generator

Generiert QR-Codes clientseitig ohne externe Abhängigkeiten. Basiert auf einer minimierten Bibliothek.

<details>
<summary>Nutzung & Beispiel</summary>

**Datei:** `qrcode/qrcode-min.js`

```html
<script src="qrcode/qrcode-min.js"></script>

<div id="qrcode"></div>

<script>
  new QRCode(document.getElementById("qrcode"), {
    text: "https://example.com",
    width: 200,
    height: 200
  });
</script>
```

</details>

---

### Selectpicker

Eine moderne, barrierefreie Alternative zum nativen `<select>`-Element. Unterstützt Single- und Multiselect, Suchfunktion, Icons und flexible CSS-Variablen.

**→ [Vollständige Dokumentation](./selectpicker/readme.md)**

---

### Slideshow

Eine einfache Bilder-Slideshow-Komponente mit Punkt-Navigation, Pfeil-Navigation und Touch-Gesten-Unterstützung. Kann manuell oder automatisch betrieben werden.

<details>
<summary>Nutzung & Beispiel</summary>

**Datei:** `slideshow/slideshow.js`
> `slideshow/slideshow.css` muss im selben Verzeichnis liegen — wird automatisch vom Skript geladen.

```html
<div class="slideshow">
  <div class="slide">Slide 1</div>
  <div class="slide">Slide 2</div>
  <div class="slide">Slide 3</div>
</div>

<script type="module">
  import Slideshows from './slideshow/slideshow.js';

  const slideshows = new Slideshows(document, 4000);
  slideshows.runManuell();

  // Für automatisches Weiterschalten zusätzlich:
  // setInterval(() => slideshows.runAutomatic(), 500);
</script>
```

</details>

---

### User Dialog

Erstellt flexible modale Dialoge für Informationen, Bestätigungen oder Datei-Uploads. Interagiert mit dem Benutzer ohne Seiten-Reload.

<details>
<summary>Nutzung & Beispiel</summary>

**Datei:** `userDialog/userDialog.js`
> `userDialog/userDialog.css` muss im selben Verzeichnis liegen — wird automatisch vom Skript geladen.

**Für Uploads zusätzlich:** `userDialog/userDialogUpload.js`
> `userDialog/userDialogUpload_addon.css` muss im selben Verzeichnis liegen — wird automatisch geladen.

```js
import('./userDialog/userDialog.js').then(async (module) => {
  const userDialog = module.default;

  const result = await userDialog({
    title: "Löschen bestätigen",
    content: "Möchten Sie diesen Eintrag wirklich löschen?",
    confirmText: "Ja, löschen",
    cancelText: "Abbrechen",
    type: "warning"
  });

  if (result.submit) {
    console.log("Bestätigt.");
  } else {
    console.log("Abgebrochen.");
  }
});
```

**API Referenz:**

| Parameter | Typ | Standard | Beschreibung |
| :--- | :--- | :--- | :--- |
| `o.title` | `String` | — | **Pflicht.** Titel des Dialogs. |
| `o.content` | `String` | `""` | Inhaltstext (HTML erlaubt). |
| `o.confirmText` | `String` | — | **Pflicht.** Text des Bestätigungs-Buttons. |
| `o.cancelText` | `String` | — | Text des Abbrechen-Buttons. Ohne Angabe kein Abbrechen-Button. |
| `o.onlyConfirm` | `Boolean` | `false` | Nur ein OK-Button anzeigen. |
| `o.type` | `String` | `"normal"` | Farbschema: `normal`, `info`, `warning`, `error`. |
| `o.detailReturn` | `Boolean` | `true` | Steuert den Rückgabewert des Promises. |
| `o.onInsert` | `Function` | `null` | Callback nach dem Einfügen ins DOM. |
| `o.onSubmit` | `Function` | `null` | Callback vor dem Schließen. |

**Rückgabewert:** `Promise<{ submit: boolean, data: FormData }>`
- `submit`: `true` bei Bestätigung, sonst `false`.
- `data`: `FormData` mit allen Formular-Daten aus dem Dialog.

</details>