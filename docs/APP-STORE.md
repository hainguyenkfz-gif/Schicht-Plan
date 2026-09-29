# 📱 HAI Schichtplan im App Store & Google Play

Diese Anleitung erklärt die Veröffentlichung Schritt für Schritt. Die App-Projekte für iPhone (`ios/`) und Android (`android/`)
sind schon fertig eingerichtet (mit Capacitor). Beide Apps entstehen aus derselben Web-App.

| | |
|---|---|
| App-Name | **HAI Schichtplan** |
| App-ID (Bundle ID / Paketname) | `io.github.hainguyenkfzgif.schichtplan` |
| Version | 1.0 (Build 1) |
| Datenschutz-URL | https://hainguyenkfz-gif.github.io/Schicht-Plan/datenschutz.html |
| Support-URL / Website | https://hainguyenkfz-gif.github.io/Schicht-Plan/ |

> ⚠️ Die App-ID kann nach der ersten Veröffentlichung **nie mehr geändert** werden.

---

## Schritt 1 – Entwicklerkonten anlegen (dauert ein paar Tage, also zuerst!)

### Apple Developer Program (99 €/Jahr)
1. Auf dem Mac/iPhone: Apple-ID mit **Zwei-Faktor-Authentifizierung** (ist meist schon an).
2. https://developer.apple.com/programs/enroll/ → **„Start Your Enrollment“**
   (einfacher: App **„Apple Developer“** auf dem iPhone laden → „Jetzt registrieren“).
3. Typ **„Einzelperson / Individual“** wählen → im App Store steht dann dein Name als Anbieter.
4. Ausweis/Daten bestätigen, 99 € bezahlen. Freischaltung: meist 1–2 Tage.

### Google Play Console (einmalig 25 $)
1. https://play.google.com/console/signup → Konto **„Für mich selbst“ (privat)**.
2. Name, Adresse, Telefonnummer, Ausweis bestätigen, 25 $ bezahlen. Prüfung: einige Tage.
3. **Wichtig bei neuen privaten Konten:** Vor der Veröffentlichung verlangt Google einen **geschlossenen Test mit
   mindestens 12 Testern über 14 Tage**. → Perfekt für die Kollegen! Wir brauchen ihre **Gmail-Adressen**.

---

## Schritt 2 – Projekt auf den Mac holen (einmalig)

Programme: **Xcode** und **Android Studio** (schon installiert ✅), außerdem **Node.js** (https://nodejs.org → „LTS“) und **Git**
(kommt mit Xcode). Dann im **Terminal**:

```bash
cd ~/Documents
git clone https://github.com/hainguyenkfz-gif/Schicht-Plan.git
cd Schicht-Plan
npm install
```

## Schritt 3 – iPhone-App testen und hochladen

```bash
npm run ios
```
Xcode öffnet sich.
1. Links **App** anklicken → Reiter **Signing & Capabilities** → **Team**: deine Apple-ID wählen
   (vorher in Xcode → Einstellungen → Accounts anmelden).
2. Oben ein iPhone-Modell (Simulator) oder dein angeschlossenes iPhone wählen → ▶️ **Run**. App testen.
3. Im Browser https://appstoreconnect.apple.com → **Apps → ＋ → Neue App**:
   Plattform iOS, Name „HAI Schichtplan“, Sprache Deutsch, Bundle-ID `io.github.hainguyenkfzgif.schichtplan`, SKU `hai-schichtplan`.
4. Zurück in Xcode: oben **Any iOS Device (arm64)** wählen → Menü **Product → Archive** →
   **Distribute App → App Store Connect → Upload**.
5. In App Store Connect: Texte (unten), Screenshots, Datenschutz-Angaben ausfüllen → **Zur Prüfung einreichen**.

## Schritt 4 – Android-App testen und hochladen

```bash
npm run android
```
Android Studio öffnet sich (beim ersten Mal lädt es einige Minuten).
1. Oben ein Gerät wählen (Emulator oder Android-Handy per USB) → ▶️ **Run**. App testen.
2. Menü **Build → Generate Signed App Bundle or APK → Android App Bundle** →
   **Create new…** Schlüssel anlegen (`hai-schichtplan.jks`).
   > 🔐 **Schlüsseldatei + Passwort sicher aufbewahren** (z. B. USB-Stick + Passwort-Notiz)!
   > Ohne sie kann man später keine Updates mehr hochladen. **Nie** auf GitHub hochladen.
3. Variante **release** → fertig: `android/app/release/app-release.aab`.
4. Play Console → **App erstellen** → Name „HAI Schichtplan“, Deutsch, App, kostenlos →
   **Test → Geschlossener Test** → .aab hochladen → Tester (Gmail-Adressen) eintragen → 14 Tage testen →
   danach **Produktion** beantragen.

## Nach Änderungen an der App (Updates)

```bash
git pull
npm run ios        # bzw. npm run android
```
Vorher die Versionsnummer erhöhen: iOS in Xcode (Version / Build), Android in `android/app/build.gradle`
(`versionCode` +1 und `versionName`).

---

## Store-Texte (zum Kopieren)

**Name:** HAI Schichtplan

**Untertitel (Apple, max. 30 Zeichen):** Schichten, Urlaub & Feiertage

**Kurzbeschreibung (Google, max. 80 Zeichen):**
Früh-, Spät- & Nachtschicht, Urlaub, Vorholzeit, Feiertage & Ferien – einfach.

**Werbetext (Apple, max. 170 Zeichen):**
Dein Schichtplan in bunten Farben: einmal antippen – alle Wochen bis Jahresende eingetragen. Mit Urlaub, Vorholzeit, Feiertagen & Schulferien.

**Beschreibung:**
```
HAI Schichtplan – dein Schichtplan, einfach und schön.

Früh-, Spät- und Nachtschicht in eigenen Farben. Tippe einmal auf deine Woche –
die App trägt alle weiteren Wochen automatisch bis zum Jahresende ein.

SCHICHTPLAN
• 2 Schichten (Früh/Spät) oder 3 Schichten (Früh/Spät/Nacht)
• Wechsel jede Woche oder alle 2 Wochen, Mo–Fr, Mo–Sa oder Mo–So
• Einzelne Tage ändern: Frei, Urlaub, Krank oder andere Schicht
• Monats- und Jahresübersicht mit Kalenderwochen
• „Heute / Morgen“ auf einen Blick

URLAUB
• Urlaub von–bis eintragen – die App zählt die Urlaubstage
  (nur Arbeitstage, ohne Feiertage)
• Genommen, geplant und Resturlaub
• Export in den Kalender

VORHOLZEIT / ZEITKONTO
• Stand aus der Firma übernehmen und Plus-/Minusstunden eintragen
• Industriestunden: 0.25 = 15 Minuten
• Große Digitalanzeige: grün bei Plus, rot bei Minus

FEIERTAGE & SCHULFERIEN
• Gesetzliche Feiertage aller 16 Bundesländer
• Schulferien mit Anfang, Ende und Anzahl der Tage
• Bundesland mit einem Tipp wechseln

DATENSCHUTZ
• Kein Konto, keine Werbung, kein Tracking
• Alle Daten bleiben nur auf deinem Handy

Hell- und Dunkelmodus. Funktioniert auch offline.
```

**Schlüsselwörter (Apple, max. 100 Zeichen):**
`Schicht,Dienstplan,Frühschicht,Spätschicht,Nachtschicht,Urlaub,Feiertage,Ferien,Vorholzeit,Kalender`

**Kategorie:** Produktivität (2. Kategorie: Business) · **Preis:** kostenlos · **Altersfreigabe:** 4+ / USK 0 (alle Fragen „Nein“)

**Datenschutz-Angaben:**
- Apple „App-Datenschutz“: **„Keine Daten erfasst“**
- Google „Datensicherheit“: **Keine Daten erhoben, keine Daten geteilt**; Verschlüsselung bei Übertragung: Ja (HTTPS);
  Konto-Löschung: nicht zutreffend (kein Konto)

**Screenshots:** iPhone 6,9″ (z. B. iPhone 16 Pro Max im Simulator, `Cmd + S`) und Android-Handy.
Vorschlag: 1) Monat mit Schichten 2) Tagesblatt 3) Urlaub 4) Vorholzeit 5) Feiertage & Ferien.
