import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CommandEntry, Platform, Shell, SourceType, WarningLevel } from "./types.js";
import type { LocalCommandRecord } from "./local-index.js";

function resolveDatabasePath(): string {
  const filePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(filePath);
  return path.resolve(currentDir, "../data");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function extractNameFromCommand(command: string): string {
  const [firstToken] = command.trim().split(/\s+/);
  return firstToken || "unknown";
}

type LegacyCommandEntry = Omit<
  CommandEntry,
  "name" | "sourceType" | "locallyAvailable" | "category" | "dangerLevel"
> & {
  name?: string;
  sourceType?: SourceType;
  locallyAvailable?: boolean;
  category?: string;
  dangerLevel?: WarningLevel;
};

function normalizeEntry(entry: LegacyCommandEntry): CommandEntry {
  const dangerLevel = entry.dangerLevel ?? entry.warning ?? "safe";
  return {
    ...entry,
    name: entry.name ?? extractNameFromCommand(entry.command),
    sourceType: entry.sourceType ?? "external",
    locallyAvailable: entry.locallyAvailable ?? false,
    category: entry.category ?? "general",
    dangerLevel
  };
}

function indexByName(records: LocalCommandRecord[]): Map<string, LocalCommandRecord> {
  const index = new Map<string, LocalCommandRecord>();
  for (const record of records) {
    index.set(record.name.toLowerCase(), record);
  }
  return index;
}

export function loadCommands(): CommandEntry[] {
  const dataDir = resolveDatabasePath();
  const base = readJson<LegacyCommandEntry[]>(path.join(dataDir, "commands.json")).map(normalizeEntry);
  const it = readJson<LegacyCommandEntry[]>(path.join(dataDir, "it-commands.json")).map(normalizeEntry);
  return [...base, ...it];
}

export function mergeLocalAvailability(
  entries: CommandEntry[],
  localRecords: LocalCommandRecord[],
  currentPlatform: Platform,
  currentShell: Shell
): CommandEntry[] {
  const localByName = indexByName(localRecords);

  const seedEntries = entries.map((entry) => {
    const local = localByName.get(entry.name.toLowerCase());
    return {
      ...entry,
      locallyAvailable: local ? true : entry.locallyAvailable
    };
  });

  const localEntries: CommandEntry[] = localRecords.map((record) => {
    const key = `${record.name}_${record.source_type}_${record.shell}_${record.os}`;
    return {
      id: `local_${key.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()}`,
      task: `local_${record.name.toLowerCase()}`,
      name: record.name,
      platform: record.os,
      shell: record.shell,
      sourceType: record.source_type,
      locallyAvailable: record.locally_available,
      category: record.category || "general",
      dangerLevel: record.danger_level,
      warning: record.danger_level,
      command: record.name,
      example: record.example || `${record.name} --help`,
      description: {
        de: record.description_de || `Lokal verfuegbarer Befehl: ${record.name}.`,
        en: record.description_en || `Locally available command: ${record.name}.`
      },
      keywords: {
        de: [record.name, record.category, "lokal", "command"].filter(Boolean),
        en: [record.name, record.category, "local", "command"].filter(Boolean)
      }
    };
  });

  // Keep local command entries biased to current runtime context by default.
  const prioritizedLocalEntries = localEntries.map((entry) => ({
    ...entry,
    platform: entry.platform ?? currentPlatform,
    shell: entry.shell ?? currentShell
  }));

  return [...seedEntries, ...prioritizedLocalEntries];
}
