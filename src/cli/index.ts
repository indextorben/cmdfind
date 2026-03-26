#!/usr/bin/env node

import { loadCommands, mergeLocalAvailability } from "../core/database.js";
import { formatResults } from "../core/formatter.js";
import { discoverAndIndexLocalCommands, getIndexLocation } from "../core/local-index.js";
import { searchCommands } from "../core/search.js";
import type { Language, Platform, SearchOptions, Shell } from "../core/types.js";
import { detectPlatform, detectShell, inferLanguage, parseTriggerQuery } from "../core/utils.js";

const VALID_PLATFORMS: Platform[] = ["windows", "linux", "macos"];
const VALID_SHELLS: Shell[] = ["powershell", "bash", "zsh"];
const VALID_LANGUAGES: Language[] = ["de", "en"];

interface CliArgs {
  query: string;
  options: SearchOptions;
  json: boolean;
  useCurrentContext: boolean;
  refreshIndex: boolean;
  disableLocalIndex: boolean;
}

function printHelp(): void {
  console.log(`cmdfind - Find terminal commands from natural language

Usage:
  cmdfind <query> [options]

Options:
  --platform <windows|linux|macos>   Filter by platform
  --shell <powershell|bash|zsh>      Filter by shell
  --lang <de|en>                     Force language
  --limit <number>                   Limit number of results (default: 5)
  --json                             Output as JSON
  --refresh-index                    Force rebuild of local command index
  --no-local-index                   Disable local command discovery/index integration
  --all                              Disable auto context preference (os/shell/local/admin)
  -h, --help                         Show this help

Examples:
  cmdfind ping
  cmdfind grosse dateien finden
  cmdfind find large files --platform linux --shell bash
  cmdfind Prozess auf Port 3000 beenden --platform windows --shell powershell
`);
}

function requireValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) {
    console.error(`Missing value for ${flag}.`);
    process.exit(1);
    throw new Error("unreachable");
  }
  return value;
}

function parseArgs(argv: string[]): CliArgs {
  if (argv.includes("-h") || argv.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  if (argv.length === 0) {
    console.error("Keine Anfrage erkannt. Beispiel: cmdfind ping");
    printHelp();
    process.exit(1);
  }

  let platform: Platform | undefined;
  let shell: Shell | undefined;
  let language: Language | undefined;
  let limit: number | undefined;
  let json = false;
  let useCurrentContext = true;
  let refreshIndex = false;
  let disableLocalIndex = false;

  const queryParts: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--platform") {
      const value = requireValue("--platform", argv[i + 1]);
      if (!VALID_PLATFORMS.includes(value as Platform)) {
        console.error(`Invalid platform: ${value}. Use windows|linux|macos.`);
        process.exit(1);
      }
      platform = value as Platform;
      i += 1;
      continue;
    }

    if (arg === "--shell") {
      const value = requireValue("--shell", argv[i + 1]);
      if (!VALID_SHELLS.includes(value as Shell)) {
        console.error(`Invalid shell: ${value}. Use powershell|bash|zsh.`);
        process.exit(1);
      }
      shell = value as Shell;
      i += 1;
      continue;
    }

    if (arg === "--lang") {
      const value = requireValue("--lang", argv[i + 1]);
      if (!VALID_LANGUAGES.includes(value as Language)) {
        console.error(`Invalid language: ${value}. Use de|en.`);
        process.exit(1);
      }
      language = value as Language;
      i += 1;
      continue;
    }

    if (arg === "--limit") {
      const value = requireValue("--limit", argv[i + 1]);
      limit = Number(value);
      if (!Number.isFinite(limit) || limit <= 0) {
        console.error(`Invalid limit: ${value}. Use a positive number.`);
        process.exit(1);
      }
      i += 1;
      continue;
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg === "--refresh-index") {
      refreshIndex = true;
      continue;
    }

    if (arg === "--no-local-index") {
      disableLocalIndex = true;
      continue;
    }

    if (arg === "--all") {
      useCurrentContext = false;
      continue;
    }

    queryParts.push(arg);
  }

  const query = queryParts.join(" ").trim();
  const parsedTrigger = parseTriggerQuery(query);
  if (!parsedTrigger.query) {
    printHelp();
    process.exit(1);
  }

  const options: SearchOptions = {
    platform,
    shell,
    language,
    limit,
    triggered: parsedTrigger.triggered
  };

  return {
    query: parsedTrigger.query,
    options,
    json,
    useCurrentContext,
    refreshIndex,
    disableLocalIndex
  };
}

function normalizeOptionsFromContext(parsed: CliArgs): CliArgs {
  if (!parsed.useCurrentContext) {
    return parsed;
  }

  return {
    ...parsed,
    options: {
      ...parsed.options,
      platform: parsed.options.platform ?? detectPlatform(),
      currentPlatform: detectPlatform(),
      currentShell: detectShell(),
      language: parsed.options.language ?? inferLanguage(parsed.query),
      preferLocal: true,
      preferAdmin: true
    }
  };
}

function main(): void {
  const parsed = normalizeOptionsFromContext(parseArgs(process.argv.slice(2)));
  let entries = loadCommands();
  const runtimePlatform = parsed.options.currentPlatform ?? detectPlatform();
  const runtimeShell = parsed.options.currentShell ?? detectShell();

  if (!parsed.disableLocalIndex) {
    const localRecords = discoverAndIndexLocalCommands({
      platform: runtimePlatform,
      shell: runtimeShell,
      forceRefresh: parsed.refreshIndex
    });
    entries = mergeLocalAvailability(entries, localRecords, runtimePlatform, runtimeShell);
  }

  const results = searchCommands(entries, parsed.query, parsed.options);
  const language = parsed.options.language ?? inferLanguage(parsed.query);

  if (parsed.json) {
    console.log(
      JSON.stringify(
        {
          indexFile: parsed.disableLocalIndex ? null : getIndexLocation(),
          context: {
            platform: runtimePlatform,
            shell: runtimeShell
          },
          results
        },
        null,
        2
      )
    );
    return;
  }

  console.log(formatResults(results, language));
}

main();
