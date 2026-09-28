# 📅 HAI Schichtplan – iPhone-App

Einfacher Schichtplan für **Früh-, Spät- und Nachtschicht** mit **Feiertagen** und **Schulferien** aller 16 Bundesländer.
Die App läuft als Web-App direkt auf dem iPhone (über Safari „Zum Home-Bildschirm“). Du brauchst keinen App Store, keinen Mac und kein Entwicklerkonto.

## Funktionen

- **2 oder 3 Schichten**: Früh + Spät oder Früh + Spät + Nacht, jede Schicht hat ihre eigene Farbe
- **Automatisch bis Jahresende**: Tippe auf einen Tag, z. B. in der nächsten Woche, wähle **Früh** und dann
  **„Ab dieser Woche automatisch“**. Danach werden alle Wochen bis 31.12. eingetragen:
  - 2 Schichten: Früh → Spät → Früh … (z. B. gerade KW Früh, ungerade KW Spät)
  - 3 Schichten: Früh → Spät → Nacht → Früh …
  - Wechsel jede Woche oder alle 2 Wochen, Arbeitstage Mo–Fr / Mo–Sa / Mo–So
- **Urlaub**: Zeitraum von–bis eintragen. Die App zählt die Urlaubstage (nur Arbeitstage, ohne Feiertage) und zeigt
  „genommen / geplant / Rest“ vom Jahresanspruch. Der Urlaub lässt sich als Termin in den iPhone-Kalender exportieren.
- **Vorholzeit (Zeitkonto)**: Stand aus dem Firmen-System übernehmen und Plus- bzw. Minus-Stunden in Industriestunden
  (0.25 = 15 Min) eintragen. Die App rechnet Aktuell / Geplant / Verfügbar wie im Firmen-System. Die Anzeige erfolgt
  als Digitalzahl, grün bei Plus und rot bei Minus. Auf der Startseite steht der Stand unten rechts.
- **Einzelne Tage ändern**: Frei, Urlaub, Krank oder eine andere Schicht, für einen Tag oder die ganze Woche
- **Feiertage** für jedes Bundesland werden automatisch berechnet und im Kalender rot umrandet
- **Schulferien** für jedes Bundesland (Anfang, Ende, Anzahl Tage) erscheinen im Kalender als grüner Balken
- **Bundesland mit einem Klick** wechseln (Tab „Feiertage“)
- **Monats- und Jahresübersicht**, Anzeige „Heute / Morgen“, Zählung der Schichten pro Monat
- Oben auf **HAI Schichtplan** oder unten auf **Home** tippen, dann geht es zurück zur Startseite
- **App-Link mit Kollegen teilen**: Jeder hat seine eigenen Daten
- Farben und Schichtzeiten sind frei einstellbar, Hell- und Dunkelmodus werden unterstützt
- **Export in den iPhone-Kalender** (.ics) und Sicherung/Wiederherstellung
- Funktioniert **offline**, alle Daten bleiben auf dem iPhone

## Auf dem iPhone installieren

1. App veröffentlichen (einmalig, siehe unten), dann erhältst du eine Adresse wie
   `https://hainguyenkfz-gif.github.io/Schicht-Plan/`
2. Diese Adresse auf dem iPhone in **Safari** öffnen
3. Unten auf **Teilen** (Quadrat mit Pfeil) tippen und **„Zum Home-Bildschirm“** wählen
4. Fertig! Das HAI-Schichtplan-Symbol liegt jetzt auf dem Home-Bildschirm wie eine normale App.

### Veröffentlichen mit GitHub Pages (kostenlos)

1. Auf GitHub im Repository: **Settings → Pages → Source: „GitHub Actions“** einstellen
2. Den Code in den Branch `main` bringen (Pull Request mergen)
3. Unter **Actions** startet „App veröffentlichen“, danach ist die App unter der Pages-Adresse erreichbar

> Hinweis: GitHub Pages ist bei **öffentlichen** Repositories kostenlos. Für private Repositories braucht man GitHub Pro.

## Datenquellen

- **Feiertage** werden in der App berechnet (Osterformel und Landesregeln). Teilweise geltende Feiertage wie
  Fronleichnam in Teilen Sachsens/Thüringens, Mariä Himmelfahrt in Bayern und das Augsburger Friedensfest
  sind gestrichelt markiert.
- **Schulferien** werden online von [openholidaysapi.org](https://www.openholidaysapi.org) geladen
  (Ausweichquelle: [ferien-api.de](https://ferien-api.de)) und 30 Tage lang auf dem Gerät gespeichert,
  damit sie auch offline angezeigt werden. Alle Angaben ohne Gewähr.

## Schriften

Digitalanzeige: DSEG7 Classic von keshikan, SIL Open Font License 1.1 (`fonts/DSEG-LICENSE.txt`).

## Entwicklung

```bash
npm test     # Tests für Feiertage, Kalenderwochen, Schicht-Rotation und Ferien-Laden
npm start    # lokaler Server auf http://localhost:8080
```

Aufbau: `index.html`, `css/style.css`, `js/app.js` (Oberfläche), `js/shifts.js` (Schicht-Rotation),
`js/holidays.js` (Feiertage & Ferien), `js/dates.js` (Datumsfunktionen), `sw.js` (Offline-Cache).
