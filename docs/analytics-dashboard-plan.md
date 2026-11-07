# 📊 Plan: Analytics-Dashboard für Hai Schichtplan

> Status: **geplant, noch nicht begonnen** – Start, wenn Hai wieder zu Hause ist.
> Erstellt: 07.11.2026

## Entscheidungen (von Hai bestätigt)

| Frage | Antwort |
|---|---|
| Wo läuft das Dashboard? | Private Webseite auf `haischichtplan.de` (z. B. Subdomain `stats.haischichtplan.de`). Lokal am PC als Alternative/Testphase. |
| Wichtigste Kennzahl | **Downloads** (iOS + Android) |
| Stores live? | Ja, App Store **und** Google Play |
| Monetarisierung | App kostenlos. Später evtl. Werbung |
| Wer sieht es? | Nur Hai |
| Kosten | **Kostenlos** |
| Aktualisierung | 1× täglich, ab ca. **18:30 Uhr** (deutsche Zeit) |

## Webseite vs. lokaler PC

| | Private Webseite | Lokal am PC |
|---|---|---|
| Unterwegs abrufbar (Handy, Urlaub) | ✅ ja | ❌ nein |
| Aktualisiert sich automatisch | ✅ ja, auch wenn der PC aus ist | ❌ nur wenn der PC läuft |
| Schutz | Login nötig (z. B. Cloudflare Access) | ✅ Daten verlassen den PC nicht |
| Einrichtung | etwas mehr | einfacher |

**Empfehlung: beides, nacheinander.** Datensammler und Dashboard werden so gebaut,
dass derselbe Code lokal **und** online läuft:

1. **Zuerst lokal** testen (`npm run analytics` am PC) → schnell sehen, ob die Zahlen stimmen.
2. **Dann online** stellen → automatisch täglich, überall abrufbar.

## Architektur

```
[App Store Connect API] ──┐
                          ├─► Datensammler (GitHub Actions, täglich ~18:30) ─► data/*.json ─► Dashboard (privat, mit Login)
[Google Play / GCS-Bucket]┘
```

**Sicherheitsregeln (wichtig!):**
- Dieses Repo (`Schicht-Plan`) ist **öffentlich** → hier kommen **keine** Schlüssel und **keine** Statistikdaten rein.
- Dafür ein **neues privates Repo**, z. B. `hai-analytics`.
- API-Schlüssel nur als **GitHub Secrets**, nie im Code, nie im Chat.
- Die Hai-Schichtplan-App selbst wird **nicht** verändert.

## Datenquellen (Fokus Downloads)

| Daten | Apple (App Store Connect) | Google (Play Console) |
|---|---|---|
| Downloads | Sales and Trends – täglicher Sales-Report. Nur Erst-Downloads zählen, keine Updates. | Installations-CSV im Google-Cloud-Storage-Bucket der Play Console (`pubsite_prod_…/stats/installs/`) |
| Bewertungen (später) | Customer Reviews API | Android Publisher API (nur letzte ~7 Tage → täglich sichern) |
| Abstürze (später) | Analytics Reports API | Play Developer Reporting API |

⚠️ Verzögerung: Apple ca. 1 Tag, Google oft 1–2 Tage. Das ist normal.

## Kostenlose Bausteine

- **GitHub Actions** (privates Repo: 2.000 Gratis-Minuten/Monat – braucht ~1–2 Min./Tag)
- **Cloudflare Pages** (Hosting, kostenlos, auch für private Repos)
- **Cloudflare Access** (Login-Schutz, kostenlos bis 50 Nutzer) – beim Start prüfen, wo die Domain `haischichtplan.de` liegt (DNS)

## Zeitplan 18:30 Uhr

GitHub-Cron läuft in **UTC**. Deutsche Zeit wechselt zwischen MEZ/MESZ, deshalb:
- Zwei Läufe: `30 16 * * *` und `30 17 * * *` (UTC) → einer davon ist immer 18:30 deutsche Zeit.
- Das Skript prüft selbst: „Schon aktualisiert?“ → dann überspringen.
- GitHub-Cron kann sich um einige Minuten verzögern.

## Phasen

### Phase 1 – Vorbereitung (zu Hause, am PC, ca. 30–60 Min.)
- [ ] **Apple:** App Store Connect → Benutzer und Zugriff → Integrationen → App Store Connect API → Team-Schlüssel erstellen (Rolle mit Zugriff auf Verkaufsberichte, z. B. „Sales“). Notieren: **Issuer ID**, **Key ID**, `.p8`-Datei (nur einmal downloadbar!), **Vendor-Nummer** (Zahlungen und Finanzberichte).
- [ ] **Google:** Google-Cloud-Projekt + Service-Account anlegen → in der Play Console unter Nutzer und Berechtigungen einladen (Recht: App-Infos ansehen & Bulk-Berichte herunterladen) → Bucket-ID aus Play Console (Berichte herunterladen → Statistiken) notieren.
- [ ] Privates Repo `hai-analytics` anlegen, Secrets eintragen.

### Phase 2 – Datensammler
- [ ] Node-Skript holt Apple-Sales-Report + Google-Installs-CSV
- [ ] Einheitliches Format: `{ datum, plattform, downloads }`
- [ ] Verlauf in `data/downloads.json` speichern
- [ ] Zuerst lokal testen, dann GitHub Action (täglich ~18:30)

### Phase 3 – Dashboard
- [ ] Kacheln: Downloads heute / 7 Tage / 30 Tage / gesamt, iOS vs. Android
- [ ] Liniendiagramm über 7 / 30 / 90 Tage
- [ ] Hell/Dunkel-Modus, handyfreundlich
- [ ] „Zuletzt aktualisiert: …“ anzeigen

### Phase 4 – Online stellen
- [ ] Cloudflare Pages mit privatem Repo verbinden
- [ ] Subdomain `stats.haischichtplan.de`
- [ ] Cloudflare Access: Login nur für Hais E-Mail

### Phase 5 – Später (optional)
- [ ] Bewertungen beider Stores anzeigen
- [ ] Absturzrate
- [ ] Wenn Werbung kommt: AdMob-Einnahmen ins Dashboard (AdMob API).
  ⚠️ Werbung in der App braucht Einwilligung (DSGVO-Consent, auf iOS zusätzlich ATT) und eine Anpassung von `datenschutz.html`.

## Datenschutz
Store-Statistiken sind zusammengefasste Zahlen ohne persönliche Nutzerdaten →
`datenschutz.html` muss für das Dashboard **nicht** geändert werden.

## Offene Punkte beim Start
- Wo ist `haischichtplan.de` gehostet / wer verwaltet die DNS?
- Gibt es schon einen Google-Cloud-Account?
