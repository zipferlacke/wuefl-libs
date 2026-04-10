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

**Rückgabewert:** `Promise<{submit: boolean, data: Object}>` (oder `Promise<boolean>` bei `detailReturn: false`).

- `submit`: `true` bei Bestätigung, `false` bei Abbruch.
- `data`: alle Formularfelder aus `content`, automatisch in ein verschachteltes Objekt umgewandelt — Feldnamen wie `user[name]` werden zu `{user: {name: ...}}`.

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

Diese Variablen sind Teil des globalen Designsystems (`css/import.css`).

## Barrierefreiheit

Basiert auf dem nativen `<dialog>`-Element (`showModal()`) — Fokus-Trapping, `Esc`-zum-Schließen und Screenreader-Semantik kommen automatisch vom Browser.

## Browser-Support

Nutzt `<dialog>`, `FormData` und `DataTransfer` — alle modernen Browser ohne Polyfill-Bedarf.
