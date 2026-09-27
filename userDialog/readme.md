# userDialog

> Vanilla JS · Kein Framework · ES-Modul

Erstellt flexible modale Dialoge für Informationen, Bestätigungen oder Datei-Uploads — barrierefrei über das native `<dialog>`-Element, ohne Seiten-Reload.

## Installation

```js
import { userDialog } from './userDialog.js';
```

Kein Build-Schritt. `userDialog.css` wird beim ersten Aufruf automatisch nachgeladen.

## Verwendung

```js
import { userDialog } from './userDialog.js';

const result = await userDialog({
  title: "Löschen bestätigen",
  content: "Möchten Sie diesen Eintrag wirklich löschen?",
  confirmText: "Ja, löschen",
  cancelText: "Abbrechen",
  type: "warning"
});

if (result.submit) {
  console.log("Bestätigt.", result.data);
} else {
  console.log("Abgebrochen.");
}
```

## userDialog(optionen)

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `o.id` | `string\|number` | `Date.now()` | ID des erzeugten `<dialog>`-Elements. |
| `o.title` | `string` | — | **Pflicht.** Titel des Dialogs (HTML erlaubt). |
| `o.content` | `string` | `""` | Inhaltstext (HTML erlaubt) — Formularfelder gehören hierhin. |
| `o.confirmText` | `string` | — | **Pflicht.** Text des Bestätigungs-Buttons. |
| `o.cancelText` | `string` | `"Abbrechen"` | Text des Abbrechen-Buttons. |
| `o.onlyConfirm` | `boolean` | `false` | Nur ein Bestätigungs-Button, kein Abbrechen. |
| `o.type` | `'normal'\|'info'\|'warning'\|'error'` | `'normal'` | Farbschema und Icon. |
| `o.detailReturn` | `boolean` | `true` | `true` → Objekt `{submit, data}`. `false` → einfacher `boolean`. |
| `o.onInsert` | `(id) => void` | — | Callback direkt nach dem Einfügen ins DOM, bevor der Dialog sichtbar wird. |
| `o.onSubmit` | `(id, data) => void` | — | Callback beim erfolgreichen Abschicken, bevor der Dialog schließt. |

| `o.position` | `{desktop, mobile}` \| `string` | Rechner `center`, Handy `bottom` | Wo der Dialog erscheint: `center`, `top`, `bottom`, `left`, `right`. Ein String gilt für beide. |
| `o.modal` | `boolean` | `true` | `false` → die Seite dahinter bleibt bedienbar (z. B. Seitenleiste links, Karte rechts). |
| `o.onBack` | `(dialog) => void` | — | Zeigt oben links „Zurück“; der Dialog bleibt offen (z. B. von der Detail- zur Listenansicht). |
| `o.barLeft` | `BarButton \| null` | Zurück, wenn `onBack` | Knopf oben links. |
| `o.barRight` | `BarButton \| null` | Schließen (`cancel`), außer bei `onlyConfirm` | Knopf oben rechts. |

`BarButton`: `{ icon, title, action }` schließt den Dialog mit `result.action = action`; `{ icon, title, onClick }` ruft `onClick(dialog)` auf und lässt ihn offen.
Ohne `confirmText` entfällt die Fußleiste – z. B. für Listen oder Detailansichten.

**Rückgabewert:** `Promise<{submit: boolean, data: Object, action: string}>` (oder `Promise<boolean>` bei `detailReturn: false`). `action` ist `submit`, `cancel` oder die Aktion eines Leisten-Knopfs.

- `submit`: `true` bei Bestätigung, `false` bei Abbruch.
- `data`: alle Formularfelder aus `content`, automatisch in ein verschachteltes Objekt umgewandelt — Feldnamen wie `user[name]` werden zu `{user: {name: ...}}`.

## Position, Leiste, nicht-modal

```js
// Rechner: Seitenleiste links, volle Höhe · Handy: von unten · Karte bleibt bedienbar
const result = await userDialog({
  title: "Meine Touren",
  content: listHtml,
  position: { desktop: "left", mobile: "bottom" },
  modal: false,
  onBack: (dlg) => showList(dlg),                                  // oben links, bleibt offen
  barRight: { icon: "close", title: "Schließen", action: "close" }, // oben rechts
});
```

Die Position geht auch ohne JS als Attribut an jedem `.userDialog`:
`<dialog class="userDialog" data-pos="right" data-pos-mobile="bottom">`.
Standard ohne Attribute: am Rechner mittig, am Handy (≤ 700 px) von unten.

## Formulare im Dialog

Liegt im `content` ein `<input>`/`<select>`/`<textarea>` mit `required`, wird die native HTML5-Validierung respektiert — ein ungültiges Feld verhindert das Schließen. Werte werden automatisch typisiert: `"true"`/`"false"` → `boolean`, numerische Strings → `number`, alles andere bleibt `string`. Mehrfachwerte (Multiselect, mehrere Checkboxen mit gleichem `name`) werden immer als Array zurückgegeben.

```js
const result = await userDialog({
  title: "Neuen Nutzer anlegen",
  content: `
    <input type="text" name="user[name]" required>
    <input type="email" name="user[email]" required>
  `,
  confirmText: "Anlegen"
});
// result.data → { user: { name: "...", email: "..." } }
```

## Seitenleiste zum Ziehen (`sheet`)

Ein Dialog am Rand, hinter dem die Seite bedienbar bleibt – etwa eine Liste
neben einer Karte. Am Rechner links oder rechts in voller Höhe (`data-pos`),
am Handy von unten (`data-pos-mobile`). Ein Griff läuft über die ganze Kante:

- **ziehen** ändert Breite bzw. Höhe zwischen `min` und `max`
- **weiter als `min`** gezogen → eingeklappt, nur der Griff bleibt stehen
- **antippen** (oder Enter/Leertaste auf dem Griff) → ein- bzw. ausklappen
- **Pfeiltasten** auf dem Griff → größer/kleiner

```js
// als Dialog …
userDialog({ title: 'Liste', content, position: { desktop: 'left', mobile: 'bottom' },
  sheet: { min: 300, key: 'liste', onChange: ({ collapsed, size, side }) => { /* Karte anpassen */ } } });

// … oder für einen eigenen <dialog class="userDialog" data-pos="left" data-pos-mobile="bottom">
import { sheet } from './userDialog.js';
const s = sheet(document.querySelector('dialog'), { min: 300, key: 'liste' });
dialog.show();                 // nicht showModal – kein Hintergrund
s.collapse(true);              // von außen ein-/ausklappen; s.collapsed, s.size
dialog.addEventListener('uD-sheet', (e) => console.log(e.detail));   // { collapsed, size, side }
```

| Option | Standard | |
|---|---|---|
| `min` | 300 px (Handy: 160 px) | kleinste Breite/Höhe |
| `max` | 70 % der Breite (Handy: 92 % der Höhe) | größte Breite/Höhe |
| `key` | – | Größe und Zustand im Browser merken |
| `onChange` | – | `({ collapsed, size, side }) => …` nach jeder Änderung |

Eigene Größe per CSS: `--uD-sheet-size` (setzt das JS), `--uD-grip` (Breite des Griffs).

## Datei-Upload-Erweiterung

`userDialogUpload.js` baut auf `userDialog()` auf und liefert einen fertigen Upload-Dialog mit Datei-Vorschau (Bild/Video/Audio/Sonstiges) und Lösch-Möglichkeit pro Datei.

```js
import { userDialogUpload } from './userDialogUpload.js';

const formData = await userDialogUpload(
  ['jpg', 'png', 'pdf'],                          // erlaubte Endungen
  ['image/jpeg', 'image/png', 'application/pdf'], // erlaubte MIME-Types
  true                                              // Mehrfachauswahl erlaubt
);
```

`userDialogUpload(typesExtensions, typesMime, multiple)` gibt ein `Promise<FormData>` zurück — alle ausgewählten Dateien liegen unter `files[]`, bei Bild/Video/Audio-Dateien zusätzlich ein Copyright-Textfeld unter `upload_copyright[]`. `userDialogUpload_addon.css` wird automatisch nachgeladen.

## CSS-Variablen

| Variable | Beschreibung |
|---|---|
| `--bg-dialog-submit` / `--bg-dialog-submit-hover` | Hintergrund des Bestätigungs-Buttons |
| `--clr-dialog-submit` | Textfarbe des Bestätigungs-Buttons |
| `--bg-dialog-close` / `--bg-dialog-close-hover` | Hintergrund des Abbrechen-Buttons |
| `--dialog-gap` | Innenabstand im Dialog |
| `--clr-info-300` / `--clr-warning-300` / `--clr-danger-300` | Akzentfarben je `type` |
| `--fs-300` / `--fs-800` | Schriftgrößen (Inhalt / Titel) |
| `--uD-margin`, `--uD-radius`, `--uD-width`, `--uD-height`, `--uD-max-height` | Lage und Größe – setzen die Positionen; eigene Werte überschreiben sie |
| `--uD-sheet-size`, `--uD-grip` | Seitenleiste: aktuelle Größe, Breite des Griffs |

Diese Variablen sind Teil des globalen Designsystems (`css/import.css`).

## Barrierefreiheit

Basiert auf dem nativen `<dialog>`-Element (`showModal()`) — Fokus-Trapping, `Esc`-zum-Schließen und Screenreader-Semantik kommen automatisch vom Browser.

## Browser-Support

Nutzt `<dialog>`, `FormData` und `DataTransfer` — alle modernen Browser ohne Polyfill-Bedarf.
