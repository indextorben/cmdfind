import type { Language, Platform, Shell } from "./types.js";

const ADMIN_HINTS = new Set([
  "admin",
  "administrator",
  "sysadmin",
  "netzwerk",
  "network",
  "dns",
  "port",
  "prozess",
  "process",
  "service",
  "services",
  "dienst",
  "dienste",
  "routing",
  "route",
  "ip",
  "ssh",
  "firewall"
]);

const GERMAN_HINTS = new Set([
  "finden",
  "datei",
  "dateien",
  "grosse",
  "gross",
  "prozess",
  "beenden",
  "ordner",
  "verzeichnis",
  "loeschen",
  "suche",
  "rekursiv"
]);

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  if (!normalized) {
    return [];
  }
  return normalized.split(" ").filter(Boolean);
}

export function inferLanguage(query: string): Language {
  const tokens = tokenize(query);
  if (tokens.some((token) => GERMAN_HINTS.has(token))) {
    return "de";
  }
  return "en";
}

export function isAdminQuery(query: string): boolean {
  const tokens = tokenize(query);
  return tokens.some((token) => ADMIN_HINTS.has(token));
}

export function detectPlatform(): Platform {
  if (process.platform === "win32") {
    return "windows";
  }
  if (process.platform === "darwin") {
    return "macos";
  }
  return "linux";
}

export function detectShell(): Shell {
  const shellVar = (process.env.SHELL || process.env.ComSpec || "").toLowerCase();
  if (shellVar.includes("powershell") || shellVar.includes("pwsh")) {
    return "powershell";
  }
  if (shellVar.includes("zsh")) {
    return "zsh";
  }
  return "bash";
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const matrix: number[][] = Array.from({ length: b.length + 1 }, () => []);

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}

export function similarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) {
    return 1;
  }
  return 1 - levenshteinDistance(a, b) / maxLength;
}
