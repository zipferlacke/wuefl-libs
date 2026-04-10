# wuefl-libs

Eine Sammlung von wiederverwendbaren Web-Komponenten und Utilities. Jede Komponente ist so konzipiert, dass sie unabhängig voneinander eingesetzt werden kann.

---

## Komponenten

### Server-Side Rendering

| Modul | Beschreibung |
| :--- | :--- |
| [InP](./inp/readme.md) | Macht SSR dynamisch — Links/Buttons laden Inhalte per Fetch als Modal oder Partial-Update. |

### UI & Utilities

| Modul | Beschreibung |
| :--- | :--- |
| [DatePicker](./datepicker/readme.md) | Datum- und Zeitpicker, Single- und Range-Modus |
| [SelectPicker](./selectpicker/readme.md) | Macht ein Select mordern und durchsuchbar, Single- und Multiselect. |
| [Tableview](./tableview/readme.md) | Macht statische Tabellen sortier-, gruppier- und durchsuchbar. |
| [Banner](./banner/readme.md) | Pop-up-Benachrichtigungen (`info`/`success`/`warning`/`error`). |
| [Slideshow](./slideshow/readme.md) | Bilder-/Inhalts-Slideshow mit Touch-Gesten. |
| [userDialog](./userDialog/readme.md) | Modale Dialoge für Bestätigungen, Infos und Datei-Uploads. |
| [QR-Code](./qrcode/readme.md) | QR-Code-Generator für mehrere Codes pro Seite, mit Logo & Farben. |

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
