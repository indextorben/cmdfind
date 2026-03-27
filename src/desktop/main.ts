import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCommands, mergeLocalAvailability } from "../core/database.js";
import { discoverAndIndexLocalCommands, discoverCommandByName, getIndexLocation } from "../core/local-index.js";
import { loadConfig, saveConfig } from "../core/config.js";
import { searchCommands } from "../core/search.js";
import type { Language, Platform, SearchOptions, SearchResult, Shell } from "../core/types.js";
import { detectPlatform, detectShell, inferLanguage, parseTriggerQuery } from "../core/utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DesktopSearchRequest {
  query: string;
  language?: Language | "auto";
  platform?: Platform | "auto";
  shell?: Shell | "auto";
  limit?: number;
  useCurrentContext?: boolean;
  refreshIndex?: boolean;
  disableLocalIndex?: boolean;
}

interface DesktopSearchResponse {
  indexFile: string | null;
  context: {
    platform: Platform;
    shell: Shell;
    language: Language;
  };
  results: SearchResult[];
}

function normalizePlatform(value?: Platform | "auto"): Platform | undefined {
  if (!value || value === "auto") {
    return undefined;
  }
  return value;
}

function normalizeShell(value?: Shell | "auto"): Shell | undefined {
  if (!value || value === "auto") {
    return undefined;
  }
  return value;
}

function normalizeLanguage(value?: Language | "auto"): Language | undefined {
  if (!value || value === "auto") {
    return undefined;
  }
  return value;
}

function performSearch(request: DesktopSearchRequest): DesktopSearchResponse {
  const config = loadConfig();
  const parsedTrigger = parseTriggerQuery(request.query || "");
  const query = parsedTrigger.query.trim();
  if (!query) {
    return {
      indexFile: null,
      context: {
        platform: detectPlatform(),
        shell: detectShell(),
        language: config.defaultLanguage ?? "en"
      },
      results: []
    };
  }

  const runtimePlatform = normalizePlatform(request.platform) ?? detectPlatform();
  const runtimeShell = normalizeShell(request.shell) ?? detectShell();
  const language = normalizeLanguage(request.language) ?? config.defaultLanguage ?? inferLanguage(query);

  let entries = loadCommands();
  if (!request.disableLocalIndex) {
    const localRecords = discoverAndIndexLocalCommands({
      platform: runtimePlatform,
      shell: runtimeShell,
      forceRefresh: request.refreshIndex
    });

    const parts = query.split(/\s+/);
    if (parts.length === 1) {
      const onDemand = discoverCommandByName(parts[0], runtimePlatform, runtimeShell);
      if (onDemand && !localRecords.some((record) => record.name.toLowerCase() === onDemand.name.toLowerCase())) {
        localRecords.push(onDemand);
      }
    }

    entries = mergeLocalAvailability(entries, localRecords, runtimePlatform, runtimeShell);
  }

  const useCurrentContext = request.useCurrentContext !== false;
  const options: SearchOptions = {
    platform: useCurrentContext ? runtimePlatform : normalizePlatform(request.platform),
    shell: normalizeShell(request.shell),
    currentPlatform: useCurrentContext ? runtimePlatform : undefined,
    currentShell: useCurrentContext ? runtimeShell : undefined,
    language,
    limit: request.limit,
    preferLocal: useCurrentContext,
    preferAdmin: useCurrentContext,
    triggered: parsedTrigger.triggered
  };

  const normalizedQuery = query.toLowerCase();
  const isAllListing = !useCurrentContext && (normalizedQuery === "all" || normalizedQuery === "*");

  const results: SearchResult[] = isAllListing
    ? entries
        .filter((entry) => entry.locallyAvailable)
        .filter((entry) => (options.platform ? entry.platform === options.platform : true))
        .filter((entry) => (options.shell ? entry.shell === options.shell : true))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, options.limit ?? Number.MAX_SAFE_INTEGER)
        .map((entry) => ({ entry, score: 0, matchedTerms: [] }))
    : searchCommands(entries, query, options);

  return {
    indexFile: request.disableLocalIndex ? null : getIndexLocation(),
    context: {
      platform: runtimePlatform,
      shell: runtimeShell,
      language
    },
    results
  };
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#0a0f1a",
    title: "cmdfind",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  window.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("cmdfind:search", (_event, request: DesktopSearchRequest) => {
  return performSearch(request);
});

ipcMain.handle("cmdfind:get-default-language", () => {
  return loadConfig().defaultLanguage ?? null;
});

ipcMain.handle("cmdfind:set-default-language", (_event, language: Language) => {
  saveConfig({
    ...loadConfig(),
    defaultLanguage: language
  });
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
