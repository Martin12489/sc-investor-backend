# sc-investor-backend

Passwortgeschütztes Investoren-Portal für Smart Care. Node/Express-Backend mit serverseitiger
Passwortprüfung (keine Passwörter im Client-Code) + statische Investor-Präsentation als Single-Page-App.

Live: **https://smartcarehealth.cloud**

---

## Architektur

```
sc-investor-backend/
├── server.js              # Express-Server, Login, Session, Static-Serving
├── package.json
├── public/
│   ├── login.html          # Öffentliche Login-Seite (Passwort-Gate)
│   └── assets/              # Logo, Hero-Video, Team-Fotos (öffentlich, kein Geheimnis)
├── protected/
│   └── investor.html        # Die eigentliche Investor-Präsentation (nur mit Session erreichbar)
└── assets/                  # Duplikat der Team-Fotos (Altlast, siehe "Bekannte Baustellen")
```

**Warum getrennt von der übrigen Smart-Care-Website?** Das Investoren-Deck ist bewusst kein
statisches HTML wie smartcarehealth.de/smartcare-praxen.de, sondern serverseitig geschützt:

- `public/login.html` ist die einzige öffentlich erreichbare Seite. Sie schickt das eingegebene
  Passwort an `/api/login`.
- `server.js` prüft das Passwort gegen eine serverseitige Liste (`PASSWORDS`-Array, ca. 60 individuelle
  Codes, einer pro eingeladenem Investor) und setzt bei Erfolg ein `httpOnly`-Session-Cookie
  (`express-session`, 12h Gültigkeit, `secure: true` — funktioniert daher nur über HTTPS).
- `protected/investor.html` wird nur ausgeliefert, wenn `req.session.authed` gesetzt ist
  (Route `GET /investor.html`, ebenso `GET /` liefert bei aktiver Session direkt die Präsentation).
- Jeder Login wird per Webhook an ein Google Sheet gemeldet (`TRACKING_WEBHOOK`) — Zeitpunkt,
  welches der individuellen Passwörter benutzt wurde, Gerätetyp, Sprache. So lässt sich nachvollziehen,
  welcher Investor wann zugegriffen hat.

## Design-System

Identisch mit smartcarehealth.de / smartcare-praxen.de (Stand 28.07.2026 angeglichen):

| Token | Wert | Verwendung |
|-------|------|-----------|
| `--teal` (Pine-Light) | `#2F5B52` | Primärakzent, Buttons, Marquee, Hover-Rahmen |
| `--teal-dark` (Pine) | `#1C3B36` | Dunklere Hover-Zustände, Zahlen-Werte |
| `--teal-light` (Amber-Light) | `#D9B98A` | Heller Akzent auf dunklem Hintergrund (Zahlen, Icons, Partikel) |
| `--teal-pale` (Paper-2) | `#EFEBE2` | Helle Kartenhintergründe |
| `--teal-deep` (Ink) | `#14201C` | Dunkle Sektionen (Hero, Gate, CTA) |
| `--amber` | `#B8763E` | Sekundärakzent (z. B. "in Planung"-Marker auf der Karte) |

**Fonts:** Fraunces (Überschriften) · Inter (Fließtext) · Space Grotesk (Labels/Eyebrows) —
via Google Fonts, siehe `<link>` in `public/login.html` und `protected/investor.html`.

Die Variablennamen im CSS (`--teal`, `--teal-light` etc.) sind historisch von der ursprünglichen
Teal/Mint-Farbwelt übrig geblieben, zeigen aber inzwischen auf die Pine/Amber-Werte. Nicht durch
den Namen verwirren lassen — der Wert zählt.

## Deployment

**Kein CI/CD**, kein GitHub-Actions-Workflow. Deployment ist manuell auf dem Hostinger-VPS
(`187.124.180.66`, gemeinsamer Server mit smartcarehealth.de/smartcare-praxen.de):

```bash
cd /var/www/sc-backend && git pull
pm2 restart sc-investor
```

- Der Node-Prozess läuft dauerhaft unter **PM2** (nicht systemd), Prozessname **`sc-investor`**
  (`pm2 list` zeigt alle Prozesse auf dem Server, inkl. `orvo-voice`, ein anderes Projekt).
- Server lauscht intern auf Port `3001` (`127.0.0.1`), nach außen über Nginx-Reverse-Proxy auf
  `https://smartcarehealth.cloud` erreichbar (SSL/HTTPS zwingend, da Session-Cookie `secure: true`).
- **Wichtig beim Pull auf dem Server:** Falls `git pull` wegen "untracked files would be overwritten"
  abbricht, liegt das meist an lokal (auf dem Server) manuell hochgeladenen Dateien, die noch nicht
  im Repo committed sind (z. B. Fotos). Vor dem Pull kurz `git status`/`git diff` prüfen, nicht
  blind überschreiben — im Zweifel die Datei umbenennen (`mv datei datei.bak`), pullen, dann
  vergleichen ob identisch, erst danach `.bak` löschen.

## Bekannte Baustellen

- `assets/team/` und `public/assets/team/` enthalten **doppelt** dieselben Teamfotos.
  `server.js` bindet beide Ordner unter `/assets` ein (Zeile 98–99), `assets/` ist dabei
  **zuerst registriert** und gewinnt bei gleichnamigen Dateien (Express nutzt bei Static-Middleware
  die erste passende Datei). `public/assets/` greift nur als Fallback für Dateien, die es nur
  dort gibt (z. B. `logo.png`, `hero-bg.mp4`). Das Duplikat in `assets/` ist vermutlich ein
  Überbleibsel und könnte bereinigt werden — beim Aufräumen aber beachten, dass dann alle
  Team-Fotos aus `public/assets/team/` bedient würden, beide Ordner also vorher auf Gleichstand
  gebracht werden müssen.
- `smartcare-investor` (separates Repo) ist eine **Design-Staging-Kopie** von `protected/investor.html`
  ohne Backend/Login — dient nur zum lokalen Testen von Layout-/Style-Änderungen, bevor sie hier
  übernommen werden. Änderungen an der Optik sollten in beiden Repos synchron gehalten werden
  (siehe README dort).
- Kein `.env`, Passwörter und Tracking-Webhook-URL liegen direkt in `server.js`. Für dieses
  Projekt (Investoren-Portal, keine Nutzerdaten, überschaubare Zahl an Zugängen) als bewusst
  einfach gehalten akzeptiert, aber bei Bedarf (z. B. Passwort-Rotation) daran denken, dass
  ein Passwortwechsel einen Commit + Deploy erfordert, keine Config-Änderung zur Laufzeit.

## Änderungen nachvollziehen

- **28.07.2026:** Design von Teal/DM-Sans auf die Pine/Amber-Markenpalette + Fraunces/Inter/
  Space-Grotesk-Typografie umgestellt (Commits `dafe188`, `41691c4`). Dabei auch Team-Fotos aus
  Initialen-Kreisen zu echten `<img>`-Avataren umgebaut und einen Dateiendungs-Bug behoben
  (`Janina` → `Janina.png`, vorher fehlende Endung führte zu 404).
