import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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

function getIndexFilePath(): string {
  const customDir = process.env.CMDFIND_INDEX_DIR;
  const baseDir = customDir || path.join(process.cwd(), ".cmdfind");
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
  if (
    !options.forceRefresh &&
    cache &&
    cache.platform === options.platform &&
    cache.shell === options.shell
  ) {
    return cache.commands;
  }

  const records: LocalCommandRecord[] = [];
  records.push(...scanPathExecutables(options.platform, options.shell));

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
