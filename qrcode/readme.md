# QR-Code

> Vanilla JS · ES-Modul

Generiert anpassbare QR-Codes clientseitig für mehrere Elemente auf einmal. `qrcode-min.js` ist ein schlanker Wrapper um eine gebündelte Drittanbieter-Bibliothek ([qr-code-styling](https://github.com/kozakdenys/qr-code-styling)) und exportiert eine einzige Funktion: `QRCodes`.

## Installation

```html
<script type="module">
  import QRCodes from './qrcode-min.js';
</script>
```

Kein Build-Schritt, keine separate CSS-Datei.

## Markup

Jedes Ziel-Element braucht ein `data-content`-Attribut mit dem zu codierenden Text/Link. Der vorhandene Inhalt des Elements wird beim Rendern ersetzt.

```html
<div class="qrcode-target" data-content="https://example.com"></div>
```

## QRCodes(qrcodeObjs, imagePath, className, colorOptions)

```js
import QRCodes from './qrcode-min.js';

QRCodes(document.querySelectorAll('.qrcode-target'));
```

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `qrcodeObjs` | `HTMLElement[]` / `NodeList` | — | **Pflicht.** Elemente mit `data-content`-Attribut. Für jedes wird ein QR-Code gerendert. |
| `imagePath` | `string` | `undefined` | Optionales Logo-Bild, das mittig in den QR-Code eingebettet wird. |
| `className` | `string` | `"qrcode"` | CSS-Klasse des intern erzeugten `<div>`, das den Canvas enthält. |
| `colorOptions` | `Object` | `{dots:"black", cornersSquare:"black", cornersDot:"black", background:"white"}` | Farben der QR-Code-Module, Eckmarkierungen und des Hintergrunds. |

Die Funktion gibt nichts zurück — sie rendert direkt in die übergebenen Elemente. Um einen QR-Code neu zu zeichnen (z.B. nach Änderung des Inhalts), `data-content` aktualisieren und `QRCodes(...)` erneut mit demselben Element aufrufen.

## Beispiel: Mehrere QR-Codes mit Logo und Farben

```html
<div class="card" data-content="https://wuefl.de"></div>
<div class="card" data-content="https://example.com"></div>

<script type="module">
  import QRCodes from './qrcode-min.js';

  QRCodes(
    document.querySelectorAll('.card'),
    'logo.png',
    'qrcode',
    { dots: '#18181b', cornersSquare: '#1d4ed8', cornersDot: '#1d4ed8', background: '#ffffff' }
  );
</script>
```

## Verhalten

- Rendertyp ist immer `canvas`, intern fest auf `700×700` gesetzt und per CSS auf `width:100%; height:100%` skaliert — das Ziel-Element bestimmt über seine eigene Größe die tatsächliche Darstellungsgröße.
- Fehlerkorrektur ist fest auf Level `Q` eingestellt.
- Eckmarkierungen und Module nutzen immer den Stil `extra-rounded`.

## Browser-Support

Nutzt Canvas-Rendering und ES-Module — alle aktuellen Browser ohne Polyfill-Bedarf.
