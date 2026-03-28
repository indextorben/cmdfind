import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createRequire } from "node:module";
import { loadCommands, mergeLocalAvailability } from "../core/database.js";
import { discoverAndIndexLocalCommands, discoverCommandByName, getIndexLocation } from "../core/local-index.js";
import { loadConfig, saveConfig } from "../core/config.js";
import { searchCommands } from "../core/search.js";
import type { Language, Platform, SearchOptions, SearchResult, Shell } from "../core/types.js";
import { detectPlatform, detectShell, inferLanguage, parseTriggerQuery } from "../core/utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

type TerminalSession =
  | {
      kind: "pty";
      write: (input: string) => void;
      kill: () => void;
      resize: (cols: number, rows: number) => void;
    }
  | {
      kind: "process";
      process: ChildProcessWithoutNullStreams;
      write: (input: string) => void;
      kill: () => void;
    };

const terminalSessions = new Map<number, TerminalSession>();

function getCmdfindBanner(): string {
  return [
    "",
    "   ________  ___  ______  _________  _____  _   ________ ",
    "  / ____/  |/  / / __  / / ____/   |/ ___/ / | / / __  / ",
    " / /   / /|_/ / / / / / / /_  / /| |\\__ \\ /  |/ / / / /  ",
    "/ /___/ /  / / / /_/ / / __/ / ___ |___/ // /|  / /_/ /   ",
    "\\____/_/  /_/ /_____/ /_/   /_/  |_/____//_/ |_/_____/    ",
    "",
    "                cmdfind integrated terminal                ",
    ""
  ].join("\n");
}

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

  window.on("closed", () => {
    const pid = window.webContents.id;
    const session = terminalSessions.get(pid);
    if (session) {
      try {
        session.kill();
      } catch {
        // ignore
      }
    }
    terminalSessions.delete(pid);
  });
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

ipcMain.handle("cmdfind:terminal-start", (event) => {
  const senderId = event.sender.id;
  const existing = terminalSessions.get(senderId);
  if (existing) {
    return true;
  }

  const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "/bin/zsh";
  const normalizedShell = path.basename(shell).toLowerCase();
  const args =
    process.platform === "win32"
      ? ["-NoLogo"]
      : normalizedShell.includes("zsh")
      ? ["-f", "-i"]
      : normalizedShell.includes("bash")
      ? ["--noprofile", "--norc", "-i"]
      : ["-i"];

  let startedWithPty = false;

  try {
    const pty = require("node-pty") as {
      spawn: (
        file: string,
        argv: string[],
        options: { name: string; cols: number; rows: number; cwd: string; env: NodeJS.ProcessEnv }
      ) => {
        write: (input: string) => void;
        kill: () => void;
        resize: (cols: number, rows: number) => void;
        onData: (cb: (chunk: string) => void) => void;
        onExit: (cb: (event: { exitCode: number }) => void) => void;
      };
    };

    const ptyChild = pty.spawn(shell, args, {
      name: "xterm-256color",
      cols: 110,
      rows: 26,
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: "xterm-256color"
      }
    });

    terminalSessions.set(senderId, {
      kind: "pty",
      write: (input: string) => ptyChild.write(input),
      kill: () => ptyChild.kill(),
      resize: (cols: number, rows: number) => ptyChild.resize(cols, rows)
    });
    ptyChild.onData((chunk: string) => {
      event.sender.send("cmdfind:terminal-output", chunk);
    });

    ptyChild.onExit(({ exitCode }) => {
      terminalSessions.delete(senderId);
      event.sender.send("cmdfind:terminal-output", `\n[terminal exited with code ${exitCode}]\n`);
    });

    startedWithPty = true;
  } catch {
    // Fallback keeps app functional even if native PTY isn't available.
    const proc = spawn(shell, args, {
      stdio: "pipe",
      cwd: process.cwd(),
      env: process.env
    });

    terminalSessions.set(senderId, {
      kind: "process",
      process: proc,
      write: (input: string) => proc.stdin.write(input),
      kill: () => proc.kill()
    });
    proc.stdout.on("data", (chunk: Buffer) => {
      event.sender.send("cmdfind:terminal-output", chunk.toString());
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      event.sender.send("cmdfind:terminal-output", chunk.toString());
    });
    proc.on("exit", (code) => {
      terminalSessions.delete(senderId);
      event.sender.send("cmdfind:terminal-output", `\n[terminal exited with code ${code ?? 0}]\n`);
    });
  }

  event.sender.send("cmdfind:terminal-output", `${getCmdfindBanner()}\n`);
  if (!startedWithPty) {
    event.sender.send("cmdfind:terminal-output", `[terminal started in compatibility mode: ${shell}]\n`);
  }
  return true;
});

ipcMain.handle("cmdfind:terminal-input", (event, input: string) => {
  const senderId = event.sender.id;
  const session = terminalSessions.get(senderId);
  if (!session) {
    return false;
  }

  session.write(input);
  return true;
});

ipcMain.handle("cmdfind:terminal-stop", (event) => {
  const senderId = event.sender.id;
  const session = terminalSessions.get(senderId);
  if (!session) {
    return true;
  }

  try {
    session.kill();
  } catch {
    // ignore
  }
  terminalSessions.delete(senderId);
  return true;
});

ipcMain.handle("cmdfind:terminal-resize", (event, cols: number, rows: number) => {
  const senderId = event.sender.id;
  const session = terminalSessions.get(senderId);
  if (!session || session.kind !== "pty") {
    return false;
  }
  const safeCols = Math.max(40, Math.min(400, Math.floor(cols || 80)));
  const safeRows = Math.max(8, Math.min(200, Math.floor(rows || 24)));
  session.resize(safeCols, safeRows);
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
