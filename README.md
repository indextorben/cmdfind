# cmdfind

`cmdfind` ist ein plattformuebergreifendes CLI-Tool, das passende Terminal-Befehle aus natuerlicher Sprache findet.

Unterstuetzt:
- Plattformen: Windows, Linux, macOS
- Shells: PowerShell, Bash, Zsh
- Sprachen: Deutsch, Englisch

## Neu im erweiterten MVP

- Automatische Erkennung von aktuellem OS und Shell beim Start
- Lokale Command-Erkennung und Indexierung:
  - ausfuehrbare Programme aus `PATH`
  - Shell-Builtins (Bash/Zsh, best effort)
  - PowerShell-Commands (best effort)
  - Aliase/Funktionen (best effort fuer Bash/Zsh)
- Lokaler Cache/Index in `.cmdfind/local-command-index.json`
- Ranking-Boost fuer:
  - lokal verfuegbare Commands
  - Commands des aktuellen OS/Shell-Kontexts
  - IT-/Admin-Kategorien (Netzwerk, Prozesse, Services, System)

## Architektur

- `src/core/search.ts`: Such- und Ranking-Engine
- `src/core/local-index.ts`: lokale Command-Erkennung + Index-Cache
- `src/core/database.ts`: Seed-Daten laden + Local-Index in Suchkatalog mergen
- `src/data/commands.json`: bestehende Seed-Daten
- `src/data/it-commands.json`: erweiterte IT/Admin-Seed-Daten
- `src/cli/index.ts`: CLI, Kontexterkennung, Ausgabe

## Datenmodell (pro Command)

Lokale Indexeintraege werden mit mindestens diesen Feldern gespeichert:
- `name`
- `source_type` (`external`, `builtin`, `powershell`, `alias`, `function`)
- `platform`
- `shell`
- `locally_available`
- `description_de`, `description_en`
- `category`
- `example`
- `danger_level` (`safe`, `careful`, `dangerous`)

## Installation

Voraussetzung: Node.js >= 18

```bash
npm install
npm run build
```

Optional global im Projekt verlinken:

```bash
npm link
```

## GitHub-Repo verknuepfen

Falls du das Projekt lokal mit deinem Remote-Repo verbinden willst:

```bash
git init
git branch -M main
git remote add origin https://github.com/indextorben/cmdfind.git
git remote -v
```

Erster Commit und Push:

```bash
git add .
git commit -m "Initial commit: cmdfind MVP"
git push -u origin main
```

Falls `origin` schon existiert und du die URL aendern willst:

```bash
git remote set-url origin https://github.com/indextorben/cmdfind.git
```

## Starten

Development:

```bash
npm run dev -- grosse dateien finden
npm run dev -- ping --lang de
```

Produktion:

```bash
npm run start -- find large files
```

Desktop-App (native GUI, Windows/Linux/macOS):

```bash
npm run desktop
```

Desktop-Pakete bauen (lokal):

```bash
npm run desktop:package
```

Hinweis:
- Die Desktop-App nutzt dieselbe Such-Engine wie die CLI.
- In der GUI kannst du Sprache, Plattform, Shell, Limit und Index-Optionen setzen.

## Automatische Paket-Updates

Bei jedem Push auf `main` baut GitHub Actions automatisch neue Desktop-Pakete fuer:
- Windows
- macOS
- Linux

Workflow-Datei:
- `.github/workflows/continuous-packages.yml`

Die Artefakte werden als laufend aktualisiertes Pre-Release mit dem Tag `continuous` veroeffentlicht.

## Beispiele

```bash
cmdfind ping
cmdfind all --all
cmdfind ping --lang de
cmdfind kill process on port 3000
cmdfind Prozess auf Port 3000 beenden
cmdfind find network ports
cmdfind dns lookup --platform windows --shell powershell
cmdfind list services --lang en
cmdfind show local commands --json
cmdfind ping host --refresh-index
cmdfind find text --no-local-index
cmdfind kill process --all
cmdfind --set-default-lang de
cmdfind --set-default-lang en
```

## CLI-Optionen

```text
--platform <windows|linux|macos>   Expliziter Filter
--shell <powershell|bash|zsh>      Expliziter Filter
--lang <de|en>
--set-default-lang <de|en>         Standardsprache dauerhaft speichern
--limit <number>
--json
--no-banner                        Startup-Banner deaktivieren
--refresh-index                    Lokalen Command-Index neu erstellen
--no-local-index                   Lokale Discovery/Index deaktivieren
--all                              Kontext-Priorisierung deaktivieren
-h, --help
```

Hinweise:
- Ohne `--all` wird der aktuelle Laufzeitkontext erkannt und im Ranking bevorzugt.
- `--platform` und `--shell` bleiben echte Filter.
- Mit `--json` wird auch der genutzte Index-Pfad ausgegeben.
- Anfrage einfach direkt ohne Prefix eingeben, z. B. `cmdfind ping` oder `cmdfind find network ports`.
- Optionaler Trigger-Prefix ist weiter moeglich, aber nicht noetig.
- Optional kannst du das Trigger-Zeichen ueber `CMDFIND_TRIGGER_CHARS` aendern, z. B. `CMDFIND_TRIGGER_CHARS=\"@\"`.
- Beim Start wird ein farbiges `cmdfind`-Banner angezeigt. Deaktivieren mit `--no-banner` oder `CMDFIND_NO_BANNER=1`.
- Sprachumschaltung:
  - einmalig pro Anfrage mit `--lang de|en`
  - dauerhaft fuer spaetere Aufrufe mit `--set-default-lang de|en`
- Lokaler Command-Index:
  - wird automatisch mit Cache-TTL aktualisiert (Standard: 3600 Sekunden)
  - manuell neu aufbauen mit `--refresh-index`
  - TTL ueber `CMDFIND_INDEX_TTL_SECONDS` konfigurierbar
- Alle lokal vorhandenen Befehle listen:
  - `cmdfind all --all`
  - optional mit Limit: `cmdfind all --all --limit 200`

## Abgedeckte IT/Admin-Seed-Commands (Auszug)

- `ping`
- `traceroute` / `tracert`
- `nslookup`
- `ipconfig` / `ifconfig` / `ip`
- `netstat` / `ss`
- `arp`
- `route`
- `ssh`, `scp`
- `curl`, `wget`
- `ps`, `top`, `tasklist`, `taskkill`, `kill`
- `Get-Process`, `Get-Service`, `systemctl`
- `ls` / `dir` / `Get-ChildItem`
- `cp` / `copy`, `mv` / `move`, `rm` / `del`
- `chmod`, `chown`
- `whoami`, `hostname`, `uname`, `systeminfo`, `Get-ComputerInfo`

## Tests

```bash
npm test
```
