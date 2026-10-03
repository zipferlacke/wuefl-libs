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
| `o.position` | `string` \| `{small, wide}` | Handy `bottom`, Rechner `center` | Wo der Dialog erscheint: `center`, `full` (ganzer Bildschirm), `top`, `bottom`, `left`, `right`. Ein String gilt für beide, `small` ist das Handy (≤ 700 px), `wide` der Rechner. |
| `o.backgroundUsage` | `boolean` | `false` | `true` → die Seite dahinter bleibt bedienbar (z. B. Seitenleiste neben einer Karte); der Dialog lässt sich dann bis auf den Griff wegschieben. |
| `o.barLeft` | `BarSide` | Zurück, wenn `onBack` | Links vom Titel: ein Knopf, eine Liste von Knöpfen oder rohes HTML. |
| `o.barRight` | `BarSide` | nichts | Rechts vom Titel, genauso. |
| `o.onBack` | `(dialog) => void` | — | Zeigt oben links den Pfeil zurück; der Dialog bleibt offen. |

**Die Leiste oben.** Je Seite eine Liste runder Knöpfe — `{ icon, class, title, action }` schließt den Dialog mit `result.action = action`, `{ icon, class, title, onClick }` ruft `onClick(dialog)` auf und lässt ihn offen. `icon` ist HTML: ein Material-Symbol, ein eigenes Icon oder einfach Text. Oder statt der Liste direkt rohes HTML; darin schließt ein Element mit `data-action="…"` den Dialog mit dieser Aktion, alles andere verdrahtet man selbst (`onInsert`). Eine leere Seite gibt ihren Platz dem Titel — ohne Knöpfe reicht er über die ganze Breite.

```js
barLeft: '<button type="button" class="button" data-action="eigen">Eigenes HTML</button>',
barRight: [
  { icon: '<span class="msr">download</span>', title: "Herunterladen", onClick: speichern },
  { icon: '<span class="mein-icon"></span>', class: "wichtig", title: "Bearbeiten", onClick: bearbeiten },
  { icon: '<span class="msr">close</span>', title: "Schließen", action: "cancel" },
]
```

**Die Fußzeile unten** kommt mit `confirmText`, daneben Abbrechen. Die Knöpfe haben links, dazwischen und rechts gleich viel Raum; ein einzelner steht in der Mitte. Ohne `confirmText` gibt es keine Fußzeile — ein „×“ zum Abbrechen gehört dann in die Leiste oben.

**Breite:** fest `min(34rem, 92vw)` — breitere Dialoge setzen `--uD-width` (etwa über ihre `id`). `max-content` rechnete WebKit falsch aus. **Gestenleiste:** `--uD-safe-bottom` hält unten Abstand; liefert `env()` im Webview 0, setzt die App den Wert selbst.

**Der alte Aufruf bleibt:** `title`, `content`, `confirmText`, `cancelText`, `onlyConfirm`, `type`, `onInsert`, `onSubmit`, `detailReturn` wirken wie immer. Alles Neue hat eine Voreinstellung.

**Selbst schließen:** Am Dialog-Element hängt `uDFinish(action)`. Ein Knopf oben mit eigenem `onClick` bleibt offen — wer erst fragen und dann schließen will, ruft es selbst auf:

```js
barRight: {
  icon: '<span class="msr">close</span>', title: "Schließen",
  onClick: async (dlg) => { if (await wirklich()) dlg.uDFinish("cancel"); },
}
```

**Rückgabewert:** `Promise<{submit: boolean, data: Object, action: string}>` (oder `Promise<boolean>` bei `detailReturn: false`). `action` ist `submit`, `cancel` oder die Aktion eines Leisten-Knopfs.

- `submit`: `true` bei Bestätigung, `false` bei Abbruch.
- `data`: alle Formularfelder aus `content`, automatisch in ein verschachteltes Objekt umgewandelt — Feldnamen wie `user[name]` werden zu `{user: {name: ...}}`.

## Position und Hintergrund

```js
// Rechner: Seitenleiste links, volle Höhe · Handy: von unten · Karte bleibt bedienbar
// (eine Vorschau etwa: position: { small: "full", wide: "right" })
const result = await userDialog({
  title: "Meine Touren",
  content: listHtml,
  position: { wide: "left", small: "bottom" },
  backgroundUsage: true,
  onBack: (dlg) => showList(dlg),
  barRight: { icon: '<span class="msr">close</span>', title: "Schließen", action: "close" },
});
```

Am Dialog stehen die Angaben als Attribute, das CSS setzt sie um:
`<dialog class="userDialog" data-pos-small="bottom" data-pos-wide="left" data-background-usage>`.

## Der Griff

Jeder Dialog an einer Kante hat einen Griff, ein mittiger oder bildschirmfüllender (`full`) nicht. Er braucht keine Angabe:

- **oben/unten:** kleiner ziehen geht; größer nur, bis der ganze Inhalt dasteht (höchstens bis zur Höhe beim Öffnen)
- **links/rechts:** Breite zwischen 300 px und drei Vierteln des Fensters
- **mit `backgroundUsage`:** weiter als das Minimum gezogen oder angetippt → bis auf den Griff weggeschoben; antippen oder herausziehen holt ihn zurück, seitlich mit der kleinsten Breite. Ohne `backgroundUsage` gibt es das nicht — die Seite stünde still hinter einem Griff.
- **Pfeiltasten** auf dem Griff → größer/kleiner, Enter/Leertaste → ein- bzw. ausklappen

Der Zustand steht am Dialog: `data-resizable`, `data-collapsed`, `data-dragging`, die gezogene Größe in `--uD-size`.

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
| `--uD-margin`, `--uD-radius`, `--uD-width`, `--uD-height`, `--uD-max-height` | Lage und Größe – setzen die Positionen; eigene Werte überschreiben sie |
| `--uD-size`, `--uD-grip`, `--uD-safe-bottom` | gezogene Größe (setzt das JS), Breite des Griffs, Abstand zur Gestenleiste |

Diese Variablen sind Teil des globalen Designsystems (`css/import.css`).

## Barrierefreiheit

Basiert auf dem nativen `<dialog>`-Element (`showModal()`) — Fokus-Trapping, `Esc`-zum-Schließen und Screenreader-Semantik kommen automatisch vom Browser.

## Browser-Support

Nutzt `<dialog>`, `FormData` und `DataTransfer` — alle modernen Browser ohne Polyfill-Bedarf.
