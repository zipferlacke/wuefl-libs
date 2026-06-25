# Banner

> Vanilla JS · Kein Framework · ES-Modul

Einfache Pop-up-Benachrichtigungen, die oben auf der Seite eingeblendet werden. Unterstützt die Typen `info`, `success`, `warning` und `error`. Mehrere Benachrichtigungen stapeln sich automatisch, jede verschwindet nach einer eigenen konfigurierbaren Dauer.

## Installation

```html
<script type="module">
  import { showBanner } from './banner.js';
</script>
```

Kein Build-Schritt, keine Abhängigkeiten. Beim ersten Aufruf wird `banner.css` automatisch nachgeladen.

## Verwendung

```js
import { showBanner } from './banner.js';

showBanner("Gespeichert!", "success", 4000);
showBanner("Etwas ist schiefgelaufen.", "error");
```

## showBanner(content, type, duration)

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `content` | `string` | — | **Pflicht.** Text oder HTML der Benachrichtigung. |
| `type` | `'info'\|'success'\|'warning'\|'error'` | — | **Pflicht.** Bestimmt Icon und Farbe. |
| `duration` | `number` | `5000` | Anzeigedauer in Millisekunden, bevor automatisch geschlossen wird. |

## Verhalten

- Mehrere Aufrufe stapeln sich übereinander (neueste oben).
- Jede Benachrichtigung trägt ihre eigene Ablaufzeit (`data-expiry`) — ein interner Timer prüft alle 500ms und entfernt abgelaufene Einträge.
- Sind alle Benachrichtigungen abgelaufen, stoppt der Timer automatisch.
- Ein Klick auf den Schließen-Button entfernt die Benachrichtigung sofort, unabhängig von `duration`.

## CSS-Variablen

Banner nutzt die globalen Farb-Tokens aus dem Designsystem (`css/import.css`), keine eigenständigen Variablen:

| Variable | Verwendung |
|---|---|
| `--bg-banner` | Hintergrund der Benachrichtigung |
| `--clr-info-500` | Akzentfarbe bei `type="info"` |
| `--clr-success-500` | Akzentfarbe bei `type="success"` |
| `--clr-warning-500` | Akzentfarbe bei `type="warning"` |
| `--clr-danger-500` | Akzentfarbe bei `type="error"` |
| `--clr-neutral-900` / `--text-color` | Textfarbe |

> Ohne eingebundenes `css/import.css` fehlen diesen Variablen sinnvolle Werte — Banner ist für den Einsatz innerhalb des wuefl-libs-Designsystems gedacht.

## Browser-Support

Nutzt die native Popover-API (`popover="manual"`, `showPopover()`/`hidePopover()`) — Chrome/Edge 114+, Firefox 125+, Safari 17+.
