import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Platform, Shell, SourceType, WarningLevel } from "./types.js";

export interface LocalCommandRecord {
  name: string;
  source_type: SourceType;
  os: Platform;
  shell: Shell;
  locally_available: boolean;
  description_de: string;
  description_en: string;
  category: string;
  example: string;
  danger_level: WarningLevel;
}

interface DiscoverOptions {
  platform: Platform;
  shell: Shell;
  forceRefresh?: boolean;
}

interface LocalIndexFile {
  generatedAt: string;
  platform: Platform;
  shell: Shell;
  commands: LocalCommandRecord[];
}

const ZSH_BUILTIN_FALLBACK = [
  "alias",
  "autoload",
  "bg",
  "bindkey",
  "cd",
  "echo",
  "eval",
  "exec",
  "exit",
  "fg",
  "jobs",
  "kill",
  "pwd",
  "read",
  "set",
  "shift",
  "source",
  "test",
  "typeset",
  "ulimit",
  "unalias",
  "wait",
  "whence"
];

const ADMIN_CATEGORIES: Record<string, string> = {
  ping: "network",
  traceroute: "network",
  tracert: "network",
  nslookup: "dns",
  ipconfig: "network",
  ifconfig: "network",
  ip: "network",
  netstat: "network",
  ss: "network",
  arp: "network",
  route: "network",
  ssh: "remote",
  scp: "remote",
  curl: "http",
  wget: "http",
  ps: "process",
  top: "process",
  tasklist: "process",
  taskkill: "process",
  kill: "process",
  "get-process": "process",
  "get-service": "service",
  systemctl: "service",
  ls: "filesystem",
  dir: "filesystem",
  "get-childitem": "filesystem",
  cp: "filesystem",
  copy: "filesystem",
  mv: "filesystem",
  move: "filesystem",
  rm: "filesystem",
  del: "filesystem",
  chmod: "permissions",
  chown: "permissions",
  whoami: "identity",
  hostname: "identity",
  uname: "system",
  systeminfo: "system",
  "get-computerinfo": "system"
};

const DANGEROUS = new Set(["rm", "del", "format", "remove-item", "rmdir"]);
const CAREFUL = new Set(["kill", "taskkill", "stop-process", "shutdown", "reboot"]);

function runLines(command: string): string[] {
  try {
    const out = execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getCacheTtlMs(): number {
  const raw = process.env.CMDFIND_INDEX_TTL_SECONDS;
  const ttlSeconds = raw ? Number(raw) : 3600;
  if (!Number.isFinite(ttlSeconds) || ttlSeconds < 0) {
    return 3600 * 1000;
  }
  return ttlSeconds * 1000;
}

function getDefaultBaseDir(): string {
  const homeDir = os.homedir();
  if (homeDir && homeDir !== path.parse(homeDir).root) {
    return path.join(homeDir, ".cmdfind");
  }

  const appDataDir = process.env.APPDATA || process.env.XDG_CONFIG_HOME;
  if (appDataDir) {
    return path.join(appDataDir, "cmdfind");
  }

  return path.join(os.tmpdir(), ".cmdfind");
}

function getIndexFilePath(): string {
  const customDir = process.env.CMDFIND_INDEX_DIR;
  const baseDir = customDir || getDefaultBaseDir();
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }
  return path.join(baseDir, "local-command-index.json");
}

function readCachedIndex(): LocalIndexFile | null {
  const filePath = getIndexFilePath();
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as LocalIndexFile;
  } catch {
    return null;
  }
}

function isCacheFresh(cache: LocalIndexFile, options: DiscoverOptions): boolean {
  if (cache.platform !== options.platform || cache.shell !== options.shell) {
    return false;
  }

  const generatedAt = new Date(cache.generatedAt).getTime();
  if (!Number.isFinite(generatedAt)) {
    return false;
  }

  return Date.now() - generatedAt <= getCacheTtlMs();
}

function writeCachedIndex(index: LocalIndexFile): void {
  try {
    writeFileSync(getIndexFilePath(), JSON.stringify(index, null, 2), "utf8");
  } catch {
    // Best effort cache only.
  }
}

function isExecutable(fullPath: string, platform: Platform): boolean {
  try {
    const st = statSync(fullPath);
    if (!st.isFile()) {
      return false;
    }

    if (platform === "windows") {
      const ext = path.extname(fullPath).toLowerCase();
      const pathext = (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM")
        .toLowerCase()
        .split(";");
      return pathext.includes(ext);
    }

    return (st.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function classifyCategory(name: string): string {
  const key = name.toLowerCase();
  return ADMIN_CATEGORIES[key] || "general";
}

function classifyDanger(name: string): WarningLevel {
  const key = name.toLowerCase();
  if (DANGEROUS.has(key)) {
    return "dangerous";
  }
  if (CAREFUL.has(key)) {
    return "careful";
  }
  return "safe";
}

function createRecord(
  name: string,
  sourceType: SourceType,
  platform: Platform,
  shell: Shell
): LocalCommandRecord {
  const category = classifyCategory(name);
  return {
    name,
    source_type: sourceType,
    os: platform,
    shell,
    locally_available: true,
    description_de: `Lokal erkanntes Kommando (${sourceType}): ${name}.`,
    description_en: `Locally detected command (${sourceType}): ${name}.`,
    category,
    example: `${name} --help`,
    danger_level: classifyDanger(name)
  };
}

function createTemplateRecord(
  commandTemplate: string,
  platform: Platform,
  shell: Shell,
  category: string,
  dangerLevel: WarningLevel,
  descriptionDe: string,
  descriptionEn: string,
  example?: string
): LocalCommandRecord {
  return {
    name: commandTemplate,
    source_type: "external",
    os: platform,
    shell,
    locally_available: true,
    description_de: descriptionDe,
    description_en: descriptionEn,
    category,
    example: example ?? commandTemplate,
    danger_level: dangerLevel
  };
}

function scanPathExecutables(platform: Platform, shell: Shell): LocalCommandRecord[] {
  const pathVar = process.env.PATH || "";
  const dirs = pathVar.split(path.delimiter).filter(Boolean);
  const names = new Set<string>();

  for (const dir of dirs) {
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (!isExecutable(fullPath, platform)) {
          continue;
        }

        if (platform === "windows") {
          names.add(path.basename(file, path.extname(file)).toLowerCase());
        } else {
          names.add(file.toLowerCase());
        }
      }
    } catch {
      // Ignore unreadable PATH directories.
    }
  }

  return [...names].map((name) => createRecord(name, "external", platform, shell));
}

function scanInstalledToolTemplates(
  executableRecords: LocalCommandRecord[],
  platform: Platform,
  shell: Shell
): LocalCommandRecord[] {
  const available = new Set(executableRecords.map((record) => record.name.toLowerCase()));
  const has = (...commands: string[]): boolean => commands.some((command) => available.has(command.toLowerCase()));
  const templates: LocalCommandRecord[] = [];

  if (has("python", "python3")) {
    const pythonCmd = has("python3") ? "python3" : "python";
    templates.push(
      createTemplateRecord(
        `${pythonCmd} -m venv .venv`,
        platform,
        shell,
        "runtime",
        "safe",
        "Erstellt eine lokale Python-Umgebung (.venv).",
        "Creates a local Python virtual environment (.venv)."
      ),
      createTemplateRecord(
        `${pythonCmd} -m pip install <paket>`,
        platform,
        shell,
        "runtime",
        "safe",
        "Installiert ein Python-Paket über pip.",
        "Installs a Python package via pip."
      )
    );
  }

  if (has("pip", "pip3")) {
    const pipCmd = has("pip3") ? "pip3" : "pip";
    templates.push(
      createTemplateRecord(
        `${pipCmd} install <paket>`,
        platform,
        shell,
        "runtime",
        "safe",
        "Installiert ein Python-Paket.",
        "Installs a Python package."
      ),
      createTemplateRecord(
        `${pipCmd} install -r requirements.txt`,
        platform,
        shell,
        "runtime",
        "safe",
        "Installiert alle Abhängigkeiten aus requirements.txt.",
        "Installs all dependencies from requirements.txt."
      )
    );
  }

  if (has("npm")) {
    templates.push(
      createTemplateRecord(
        "npm install <paket>",
        platform,
        shell,
        "runtime",
        "safe",
        "Installiert ein npm-Paket im aktuellen Projekt.",
        "Installs an npm package in the current project."
      ),
      createTemplateRecord(
        "npm install -g <paket>",
        platform,
        shell,
        "runtime",
        "careful",
        "Installiert ein npm-Paket global auf dem System.",
        "Installs an npm package globally on the system."
      )
    );
  }

  if (platform !== "windows" && has("apt", "apt-get")) {
    templates.push(
      createTemplateRecord(
        "apt install <paket>",
        platform,
        shell,
        "package",
        "safe",
        "Installiert ein Paket mit apt.",
        "Installs a package with apt."
      ),
      createTemplateRecord(
        "apt remove <paket>",
        platform,
        shell,
        "package",
        "careful",
        "Entfernt ein Paket mit apt.",
        "Removes a package with apt."
      ),
      createTemplateRecord(
        "apt update && apt upgrade -y",
        platform,
        shell,
        "package",
        "careful",
        "Aktualisiert Paketlisten und installiert Updates.",
        "Updates package lists and installs upgrades."
      )
    );
  }

  if (platform !== "windows" && has("brew")) {
    templates.push(
      createTemplateRecord(
        "brew install <paket>",
        platform,
        shell,
        "package",
        "safe",
        "Installiert ein Paket mit Homebrew.",
        "Installs a package with Homebrew."
      ),
      createTemplateRecord(
        "brew update && brew upgrade",
        platform,
        shell,
        "package",
        "careful",
        "Aktualisiert Homebrew und installierte Pakete.",
        "Updates Homebrew and installed packages."
      )
    );
  }

  if (platform === "windows" && has("winget")) {
    templates.push(
      createTemplateRecord(
        "winget install <paket>",
        platform,
        shell,
        "package",
        "safe",
        "Installiert ein Paket über winget.",
        "Installs a package via winget."
      ),
      createTemplateRecord(
        "winget upgrade --all",
        platform,
        shell,
        "package",
        "careful",
        "Aktualisiert alle winget-Pakete.",
        "Upgrades all winget packages."
      )
    );
  }

  if (platform === "windows" && has("choco", "chocolatey")) {
    templates.push(
      createTemplateRecord(
        "choco install <paket> -y",
        platform,
        shell,
        "package",
        "safe",
        "Installiert ein Paket mit Chocolatey.",
        "Installs a package with Chocolatey."
      )
    );
  }

  if (has("docker")) {
    templates.push(
      createTemplateRecord(
        "docker ps",
        platform,
        shell,
        "devops",
        "safe",
        "Zeigt laufende Docker-Container an.",
        "Lists running Docker containers."
      ),
      createTemplateRecord(
        "docker run --rm -it <image>",
        platform,
        shell,
        "devops",
        "careful",
        "Startet testweise einen Container und entfernt ihn danach.",
        "Runs a temporary container interactively."
      )
    );
  }

  if (has("git")) {
    templates.push(
      createTemplateRecord(
        "git clone <repo-url>",
        platform,
        shell,
        "dev",
        "safe",
        "Klonen eines Repositories.",
        "Clones a repository."
      ),
      createTemplateRecord(
        "git pull --rebase",
        platform,
        shell,
        "dev",
        "careful",
        "Aktualisiert dein Repository mit Rebase.",
        "Updates your repository using rebase."
      )
    );
  }

  return templates;
}

function scanBashBuiltins(platform: Platform): LocalCommandRecord[] {
  return runLines("bash -lc 'compgen -b'").map((name) => createRecord(name, "builtin", platform, "bash"));
}

function scanZshBuiltins(platform: Platform): LocalCommandRecord[] {
  const detected = runLines("zsh -ic 'builtin'"), names = new Set<string>();
  for (const line of detected) {
    const token = line.split(/\s+/)[0];
    if (token) {
      names.add(token);
    }
  }

  for (const fallback of ZSH_BUILTIN_FALLBACK) {
    names.add(fallback);
  }

  return [...names].map((name) => createRecord(name, "builtin", platform, "zsh"));
}

function scanShellAliases(platform: Platform, shell: Shell): LocalCommandRecord[] {
  if (shell === "bash") {
    return runLines("bash -ic 'alias -p'")
      .map((line) => line.match(/^alias\s+([^=\s]+)=/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => createRecord(match[1], "alias", platform, "bash"));
  }

  if (shell === "zsh") {
    return runLines("zsh -ic 'alias -L'")
      .map((line) => line.match(/^([^=\s]+)=/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => createRecord(match[1], "alias", platform, "zsh"));
  }

  return [];
}

function scanShellFunctions(platform: Platform, shell: Shell): LocalCommandRecord[] {
  if (shell === "bash") {
    return runLines("bash -ic 'declare -F'")
      .map((line) => line.split(/\s+/).pop() || "")
      .filter(Boolean)
      .map((name) => createRecord(name, "function", platform, "bash"));
  }

  if (shell === "zsh") {
    return runLines("zsh -ic 'typeset -f | sed -n \"s/^\\([^[:space:]]\\+\\) ().*/\\1/p\"'")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => createRecord(name, "function", platform, "zsh"));
  }

  return [];
}

function scanPowerShellCommands(platform: Platform): LocalCommandRecord[] {
  const scripts = [
    "pwsh -NoProfile -Command \"Get-Command | Select-Object Name,CommandType | ConvertTo-Json -Depth 3\"",
    "powershell -NoProfile -Command \"Get-Command | Select-Object Name,CommandType | ConvertTo-Json -Depth 3\""
  ];

  let payload = "";
  for (const script of scripts) {
    try {
      payload = execSync(script, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      });
      if (payload.trim()) {
        break;
      }
    } catch {
      // try next shell
    }
  }

  if (!payload.trim()) {
    return [];
  }

  try {
    const raw = JSON.parse(payload) as Array<{ Name: string; CommandType: string }> | { Name: string; CommandType: string };
    const records = Array.isArray(raw) ? raw : [raw];
    return records.map((item) => {
      const type = item.CommandType.toLowerCase();
      let sourceType: SourceType = "powershell";
      if (type === "alias") {
        sourceType = "alias";
      } else if (type === "function" || type === "filter") {
        sourceType = "function";
      }
      return createRecord(item.Name.toLowerCase(), sourceType, platform, "powershell");
    });
  } catch {
    return runLines(
      "pwsh -NoProfile -Command \"Get-Command | Select-Object -ExpandProperty Name\" || powershell -NoProfile -Command \"Get-Command | Select-Object -ExpandProperty Name\""
    ).map((name) => createRecord(name.toLowerCase(), "powershell", platform, "powershell"));
  }
}

function dedupe(records: LocalCommandRecord[]): LocalCommandRecord[] {
  const seen = new Set<string>();
  const result: LocalCommandRecord[] = [];

  for (const record of records) {
    const key = `${record.name.toLowerCase()}|${record.source_type}|${record.os}|${record.shell}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(record);
  }

  return result;
}

export function discoverAndIndexLocalCommands(options: DiscoverOptions): LocalCommandRecord[] {
  const cache = readCachedIndex();
  if (!options.forceRefresh && cache && isCacheFresh(cache, options)) {
    return cache.commands;
  }

  const records: LocalCommandRecord[] = [];
  const executableRecords = scanPathExecutables(options.platform, options.shell);
  records.push(...executableRecords);
  records.push(...scanInstalledToolTemplates(executableRecords, options.platform, options.shell));

  if (options.shell === "bash") {
    records.push(...scanBashBuiltins(options.platform));
  }
  if (options.shell === "zsh") {
    records.push(...scanZshBuiltins(options.platform));
  }
  if (options.shell === "powershell" || options.platform === "windows") {
    records.push(...scanPowerShellCommands(options.platform));
  }

  records.push(...scanShellAliases(options.platform, options.shell));
  records.push(...scanShellFunctions(options.platform, options.shell));

  const deduped = dedupe(records);
  writeCachedIndex({
    generatedAt: new Date().toISOString(),
    platform: options.platform,
    shell: options.shell,
    commands: deduped
  });

  return deduped;
}

export function discoverCommandByName(
  name: string,
  platform: Platform,
  shell: Shell
): LocalCommandRecord | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized || /\s/.test(normalized) || !/^[a-z0-9._+-]+$/.test(normalized)) {
    return null;
  }

  const lookupCmd =
    platform === "windows"
      ? `powershell -NoProfile -Command \"Get-Command ${normalized} -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Name\"`
      : `command -v ${normalized} >/dev/null 2>&1 && echo ${normalized}`;

  const lines = runLines(lookupCmd);
  if (lines.length === 0) {
    return null;
  }

  return createRecord(normalized, platform === "windows" ? "powershell" : "external", platform, shell);
}

export function getRuntimeContextDefaults(): { platform: Platform; shell: Shell } {
  const platform = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux";
  const shellVar = (process.env.SHELL || process.env.ComSpec || "").toLowerCase();

  let shell: Shell = "bash";
  if (shellVar.includes("powershell") || shellVar.includes("pwsh")) {
    shell = "powershell";
  } else if (shellVar.includes("zsh")) {
    shell = "zsh";
  }

  return { platform, shell };
}

export function getIndexLocation(): string {
  return getIndexFilePath();
}
