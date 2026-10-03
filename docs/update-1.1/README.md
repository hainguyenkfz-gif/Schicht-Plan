# Update 1.1 – Design-Vorschau (noch nicht umgesetzt)

Diese Ordner enthält nur Entwürfe. Die App selbst bleibt bis zum Update 1.1 unverändert
(erst nach Freigabe bei Apple und Google Play).

## Vom Nutzer bestätigt
- Schrift wie haischichtplan.de: Überschriften **Bricolage Grotesque**, Text **Nunito**
  (beide SIL Open Font License, lokal als .woff2 einbinden, damit die App offline funktioniert).
- Bunter Hintergrund (Pfirsich → Rosa → Hellblau), bunter Streifen oben auf Karten,
  Knöpfe/Monatsname mit Farbverlauf, aktiver Tab als bunte Kachel.
- **Urlaub:** Zahlen „genommen / geplant / Rest“ als Digitalanzeige (DSEG7) auf schwarzem Feld
  – gelb / blau / grün mit Leuchten. *So lassen, nicht mehr ändern.*
- **Feiertage:** Datumszahl groß, kräftig und rot; auch „Nächster Feiertag“.
- **Home:** Feiertagsdatum in der Liste rot (in der echten Umsetzung eine eigene Klasse statt
  `[style*=E53935]` verwenden).
- **Willkommen-Karte** (erster Start): bunter Farbverlauf wie die Webseite, weiße Schrift,
  weißer Knopf.

## Später vielleicht
- Schulferien-Bereich ebenfalls bunter gestalten.

`design-vorschau.css` ist das CSS, mit dem die Vergleichsbilder erstellt wurden
(wird zusätzlich zu `css/style.css` geladen).
