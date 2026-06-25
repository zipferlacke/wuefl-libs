# Slideshow

> Vanilla JS · Touch-Gesten · ES-Modul

Leichtgewichtige Bilder- und Inhalts-Slideshow mit Punkt-Navigation, Pfeil-Navigation und Touch-Gesten-Unterstützung. Komplett über `data-*`-Attribute steuerbar, kein Build-Schritt.

## Installation

```html
<script type="module" src="./slideshow.js"></script>
```

Beim Import werden automatisch alle zu diesem Zeitpunkt vorhandenen `.slideshow`-Elemente initialisiert und `slideshow.css` nachgeladen.

> Die Initialisierung läuft einmalig beim Laden des Scripts. Dynamisch später eingefügte `.slideshow`-Elemente (z.B. per Fetch nachgeladen) werden nicht automatisch erkannt.

## Markup

```html
<div class="slideshow">
  <div class="slide">Slide 1</div>
  <div class="slide">Slide 2</div>
  <div class="slide">Slide 3</div>
</div>
```

## Attribute auf `.slideshow`

| Attribut | Standard | Beschreibung |
|---|---|---|
| `data-dots` | `true` | `"false"` blendet die Punkt-Navigation aus. |
| `data-arrows` | `true` | `"false"` blendet die Pfeil-Navigation aus. |
| `data-autoplay` | aus | Intervall in Millisekunden für automatisches Weiterschalten, z.B. `data-autoplay="3000"`. |
| `data-images` | aus | Bild-Modus (siehe unten). |

Ohne `data-dots`, `data-arrows` oder `data-autoplay` funktioniert die Slideshow weiterhin per Touch-Wischgeste.

## Bild-Modus

Mit `data-images` werden Slides als Bild mit Beschriftung gerendert:

```html
<div class="slideshow" data-images data-autoplay="4000">
  <div class="slide">
    <img class="slide_img" src="bild1.jpg" alt="Bild 1">
    <div class="slide_content">
      <strong>Titel</strong>
      <p class="slide_copyright">© Fotograf</p>
    </div>
  </div>
</div>
```

## Verhalten

- Endlos-Durchlauf: nach dem letzten Slide geht es wieder zum ersten (und umgekehrt).
- Klick auf einen Punkt oder Pfeil setzt einen laufenden Autoplay-Timer zurück.
- Touch-Wischgesten (links/rechts) funktionieren immer — basiert auf `js/gestures.js`.
- Mehrere Slideshows auf derselben Seite laufen unabhängig voneinander.

## CSS-Variablen

| Variable | Beschreibung |
|---|---|
| `--slideshow-ratio` | Seitenverhältnis im Bild-Modus (Standard: `none`, z.B. `16/9` setzen). |
| `--br-default` | Border-Radius der Slideshow (aus dem globalen Designsystem). |
| `--clr-primary-200` | Akzentfarbe der aktiven Punkt-Navigation. |

## Browser-Support

Nutzt Touch-Events über `js/gestures.js` und ES-Module — modernes Standard-JS ohne Polyfill-Bedarf.
