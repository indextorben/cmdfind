import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, Tray, nativeImage } from "electron";
import electronUpdater from "electron-updater";
import fs from "node:fs";
import os from "node:os";
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
const { autoUpdater } = electronUpdater;

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
let mainWindow: BrowserWindow | null = null;
let quickSearchWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let updaterInitialized = false;
let registeredGlobalShortcut: string | null = null;
let appIsQuitting = false;
const DEFAULT_GLOBAL_SEARCH_SHORTCUT = "CommandOrControl+B";
const DEFAULT_MENU_BAR_ENABLED = true;

type UpdateState =
  | { status: "idle"; message: string; currentVersion: string }
  | { status: "checking"; message: string; currentVersion: string }
  | { status: "available"; message: string; currentVersion: string; version: string }
  | { status: "not-available"; message: string; currentVersion: string }
  | { status: "downloading"; message: string; currentVersion: string; percent: number }
  | { status: "downloaded"; message: string; currentVersion: string; version: string }
  | { status: "error"; message: string; currentVersion: string };

function sendUpdateState(state: UpdateState): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send("cmdfind:update-state", state);
}

function setupAutoUpdater(): void {
  if (updaterInitialized) {
    return;
  }
  updaterInitialized = true;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = true;

  autoUpdater.on("checking-for-update", () => {
    sendUpdateState({
      status: "checking",
      message: "Prüfe auf Updates...",
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on("update-available", (info) => {
    sendUpdateState({
      status: "available",
      message: `Update verfügbar: ${info.version}`,
      currentVersion: app.getVersion(),
      version: info.version
    });
  });

  autoUpdater.on("update-not-available", () => {
    sendUpdateState({
      status: "not-available",
      message: "Du hast bereits die neueste Version.",
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateState({
      status: "downloading",
      message: `Update wird geladen (${Math.round(progress.percent)}%).`,
      currentVersion: app.getVersion(),
      percent: progress.percent
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendUpdateState({
      status: "downloaded",
      message: `Update ${info.version} bereit. Neu starten zum Installieren.`,
      currentVersion: app.getVersion(),
      version: info.version
    });
  });

  autoUpdater.on("error", (error) => {
    sendUpdateState({
      status: "error",
      message: `Update-Fehler: ${error?.message ?? String(error)}`,
      currentVersion: app.getVersion()
    });
  });
}

function resolveShellPath(): string {
  if (process.platform === "win32") {
    return "powershell.exe";
  }

  const envShell = process.env.SHELL;
  if (envShell && fs.existsSync(envShell)) {
    return envShell;
  }
  if (fs.existsSync("/bin/zsh")) {
    return "/bin/zsh";
  }
  if (fs.existsSync("/bin/bash")) {
    return "/bin/bash";
  }
  return "/bin/sh";
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
  mainWindow = window;
  const webContentsId = window.webContents.id;

  window.loadFile(path.join(__dirname, "index.html"));

  window.on("close", (event) => {
    if (appIsQuitting) return;
    if (process.platform === "darwin" && isMenuBarEnabled()) {
      event.preventDefault();
      window.hide();
    }
  });

  window.on("closed", () => {
    const session = terminalSessions.get(webContentsId);
    if (session) {
      try {
        session.kill();
      } catch {
        // ignore
      }
    }
    terminalSessions.delete(webContentsId);
    if (mainWindow === window) {
      mainWindow = null;
    }
  });
}

function normalizeShortcutToAccelerator(shortcut: string | undefined): string | null {
  const raw = (shortcut || "").trim();
  if (!raw) return null;
  const parts = raw
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const keyRaw = parts[parts.length - 1];
  const keyMap: Record<string, string> = {
    SPACE: "Space",
    ENTER: "Enter",
    ESC: "Escape",
    ESCAPE: "Escape",
    TAB: "Tab",
    BACKSPACE: "Backspace",
    DELETE: "Delete",
    ARROWUP: "Up",
    ARROWDOWN: "Down",
    ARROWLEFT: "Left",
    ARROWRIGHT: "Right"
  };
  const normalizedKey = keyMap[keyRaw.toUpperCase()] ?? keyRaw;

  const modifierSet = new Set<string>();
  for (const part of parts.slice(0, -1)) {
    const upper = part.toUpperCase();
    if (upper === "CONTROL" || upper === "CTRL" || upper === "META" || upper === "CMD" || upper === "COMMAND") {
      modifierSet.add("CommandOrControl");
      continue;
    }
    if (upper === "ALT" || upper === "OPTION") {
      modifierSet.add("Alt");
      continue;
    }
    if (upper === "SHIFT") {
      modifierSet.add("Shift");
      continue;
    }
  }

  if (!modifierSet.size) return null;

  const key =
    normalizedKey.length === 1
      ? normalizedKey.toUpperCase()
      : normalizedKey.charAt(0).toUpperCase() + normalizedKey.slice(1);

  return [...modifierSet, key].join("+");
}

function registerGlobalSearchShortcut(shortcutValue?: string): string {
  const accelerator = normalizeShortcutToAccelerator(shortcutValue) ?? DEFAULT_GLOBAL_SEARCH_SHORTCUT;

  if (registeredGlobalShortcut) {
    globalShortcut.unregister(registeredGlobalShortcut);
    registeredGlobalShortcut = null;
  }

  const ok = globalShortcut.register(accelerator, () => {
    showQuickSearchWindow();
  });

  if (!ok) {
    if (accelerator !== DEFAULT_GLOBAL_SEARCH_SHORTCUT) {
      const fallbackOk = globalShortcut.register(DEFAULT_GLOBAL_SEARCH_SHORTCUT, () => {
        showQuickSearchWindow();
      });
      if (fallbackOk) {
        registeredGlobalShortcut = DEFAULT_GLOBAL_SEARCH_SHORTCUT;
        return DEFAULT_GLOBAL_SEARCH_SHORTCUT;
      }
    }
    return accelerator;
  }

  registeredGlobalShortcut = accelerator;
  return accelerator;
}

function ensureQuickSearchWindow(): BrowserWindow {
  if (quickSearchWindow && !quickSearchWindow.isDestroyed()) {
    return quickSearchWindow;
  }

  const window = new BrowserWindow({
    width: 760,
    height: 520,
    minWidth: 640,
    minHeight: 420,
    maxWidth: 980,
    maxHeight: 760,
    show: false,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#0a0f1a",
    title: "cmdfind quick search",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  window.loadFile(path.join(__dirname, "quick-search.html"));

  window.on("blur", () => {
    if (!window.isDestroyed()) {
      window.hide();
    }
  });

  window.on("closed", () => {
    if (quickSearchWindow === window) {
      quickSearchWindow = null;
    }
  });

  quickSearchWindow = window;
  return window;
}

function showQuickSearchWindow(): void {
  showQuickSearchWindowWithPrefill();
}

function showQuickSearchWindowWithPrefill(prefill?: string): void {
  const window = ensureQuickSearchWindow();
  if (!window.isVisible()) {
    window.show();
  }
  window.focus();
  window.webContents.send("cmdfind:quick-focus");
  if (typeof prefill === "string" && prefill.trim()) {
    window.webContents.send("cmdfind:quick-prefill", prefill.trim());
  }
}

function createMacTrayImage(): Electron.NativeImage {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <rect x="1.5" y="3" width="17" height="13.5" rx="2.5" fill="#0c162d" stroke="#79a8ff" stroke-width="1.3"/>
      <path d="M5.6 7.1L7.8 8.75L5.6 10.4" stroke="#d7e7ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <rect x="9.2" y="10" width="4.4" height="1.25" rx="0.6" fill="#d7e7ff"/>
    </svg>
  `;
  const image = nativeImage
    .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`)
    .resize({ width: 18, height: 18, quality: "best" });
  image.setTemplateImage(false);
  return image;
}

function isMenuBarEnabled(): boolean {
  const cfg = loadConfig();
  return cfg.menuBarEnabled !== false;
}

function setupMacMenuBar(): void {
  if (process.platform !== "darwin") return;
  if (!isMenuBarEnabled()) {
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
      tray = null;
    }
    return;
  }
  if (tray && !tray.isDestroyed()) return;

  const trayImage = createMacTrayImage();
  tray = new Tray(trayImage);
  tray.setToolTip("cmdfind");
  // Icon-only tray item (no text label in menu bar).
  tray.setTitle("");
  tray.setImage(trayImage);
  tray.setPressedImage(trayImage);

  const buildTrayMenu = (): Electron.Menu => {
    return Menu.buildFromTemplate([
      {
        label: "cmdfind öffnen",
        click: () => {
          if (!mainWindow || mainWindow.isDestroyed()) {
            createWindow();
            return;
          }
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: "Quick Search öffnen",
        click: () => {
          showQuickSearchWindowWithPrefill();
        }
      },
      {
        label: "Zwischenablage suchen",
        click: () => {
          const clip = clipboard.readText().trim();
          showQuickSearchWindowWithPrefill(clip);
        }
      },
      { type: "separator" },
      {
        label: "Update prüfen",
        click: () => {
          if (app.isPackaged) {
            void autoUpdater.checkForUpdates().catch(() => {
              // Update events are surfaced in renderer if open.
            });
          }
          if (!mainWindow || mainWindow.isDestroyed()) {
            createWindow();
            return;
          }
          mainWindow.show();
          mainWindow.focus();
        }
      },
      { type: "separator" },
      {
        label: "cmdfind beenden",
        click: () => {
          app.quit();
        }
      }
    ]);
  };

  tray.setContextMenu(buildTrayMenu());
  tray.on("click", () => {
    showQuickSearchWindowWithPrefill();
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

ipcMain.handle("cmdfind:get-global-search-shortcut", () => {
  return loadConfig().desktopSearchShortcut ?? DEFAULT_GLOBAL_SEARCH_SHORTCUT;
});

ipcMain.handle("cmdfind:set-global-search-shortcut", (_event, shortcut: string) => {
  const normalized = registerGlobalSearchShortcut(shortcut);
  saveConfig({
    ...loadConfig(),
    desktopSearchShortcut: normalized
  });
  return normalized;
});

ipcMain.handle("cmdfind:get-menubar-enabled", () => {
  return process.platform === "darwin" ? isMenuBarEnabled() : false;
});

ipcMain.handle("cmdfind:set-menubar-enabled", (_event, enabled: boolean) => {
  const next = Boolean(enabled);
  saveConfig({
    ...loadConfig(),
    menuBarEnabled: next
  });
  setupMacMenuBar();
  return process.platform === "darwin" ? next : false;
});

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1);
  }
  return value;
}

function resolveShellPathInput(inputPath: string, cwdHint: string): string {
  const homeDir = os.homedir();
  const normalizedCwd = cwdHint.startsWith("~") ? path.join(homeDir, cwdHint.slice(1)) : cwdHint;
  const clean = stripWrappingQuotes(inputPath);
  if (!clean) {
    return path.resolve(normalizedCwd);
  }
  if (clean.startsWith("~")) {
    return path.resolve(path.join(homeDir, clean.slice(1)));
  }
  if (path.isAbsolute(clean)) {
    return path.resolve(clean);
  }
  return path.resolve(normalizedCwd, clean);
}

ipcMain.handle(
  "cmdfind:list-directories",
  (
    _event,
    request: { cwdHint?: string; inputPath?: string; limit?: number; onlyDirectories?: boolean }
  ): Array<{ value: string; label: string }> => {
    const cwdHint = request.cwdHint?.trim() || "~";
    const inputPath = request.inputPath ?? "";
    const limit = Math.max(1, Math.min(50, Number(request.limit) || 12));
    const onlyDirectories = request.onlyDirectories === true;
    const clean = stripWrappingQuotes(inputPath);

    const hasSlash = /[\\/]/.test(clean);
    const slashIndex = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
    const dirPart = slashIndex >= 0 ? clean.slice(0, slashIndex + 1) : "";
    const prefix = slashIndex >= 0 ? clean.slice(slashIndex + 1) : clean;

    const baseForListing = resolveShellPathInput(dirPart || ".", cwdHint);
    const homeDir = os.homedir();
    const startsFromHome = clean.startsWith("~");
    const startsAbsolute = clean.startsWith("/") || path.isAbsolute(clean);

    const formatEntryValue = (abs: string, leftPrefix: string): string => {
      let value: string;
      if (startsFromHome) {
        value = `~${abs.slice(homeDir.length)}`.replaceAll(path.sep, "/");
      } else if (startsAbsolute) {
        value = abs.replaceAll(path.sep, "/");
      } else {
        const left = leftPrefix.replaceAll("\\", "/");
        value = `${left}${path.basename(abs)}/`;
      }

      if (!value.endsWith("/")) {
        value += "/";
      }
      return value;
    };

    const listFromBase = (base: string, namePrefix: string, leftPrefix: string): Array<{ value: string; label: string }> => {
      try {
        return fs
          .readdirSync(base, { withFileTypes: true })
          .filter((entry) => (onlyDirectories ? entry.isDirectory() : entry.isDirectory() || entry.isFile()))
          .filter((entry) => entry.name.toLowerCase().startsWith(namePrefix.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, limit)
          .map((entry) => {
            const abs = path.join(base, entry.name);
            let value = formatEntryValue(abs, leftPrefix);
            if (!entry.isDirectory()) {
              value = value.replace(/\/+$/g, "");
            }
            return { value, label: value };
          });
      } catch {
        return [];
      }
    };

    try {
      // Strict mode: suggest only real entries from the actually resolved base path.
      let entries = listFromBase(baseForListing, prefix, dirPart);

      // If user typed "cd Folder" (without trailing slash) and Folder exists,
      // prioritize showing Folder's subdirectories (Warp-like path expansion feel).
      if (clean && !hasSlash) {
        const candidateAbs = resolveShellPathInput(clean, cwdHint);
        if (fs.existsSync(candidateAbs) && fs.statSync(candidateAbs).isDirectory()) {
          const leftPrefix = `${clean.replaceAll("\\", "/").replace(/\/+$/g, "")}/`;
          const childEntries = listFromBase(candidateAbs, "", leftPrefix);
          if (childEntries.length) {
            entries = childEntries;
          }
        }
      }

      return entries;
    } catch {
      return [];
    }
  }
);

ipcMain.handle("cmdfind:terminal-start", (event) => {
  const senderId = event.sender.id;
  const sendTerminalOutput = (message: string): void => {
    try {
      if (event.sender.isDestroyed()) {
        return;
      }
      event.sender.send("cmdfind:terminal-output", message);
    } catch {
      // Renderer already gone; ignore late PTY/process events during shutdown.
    }
  };
  const existing = terminalSessions.get(senderId);
  if (existing) {
    return true;
  }

  const shell = resolveShellPath();
  const normalizedShell = path.basename(shell).toLowerCase();
  const args =
    process.platform === "win32"
      ? ["-NoLogo"]
      : normalizedShell.includes("zsh")
      ? ["-f", "-i"]
      : normalizedShell.includes("bash")
      ? ["--noprofile", "--norc", "-i"]
      : ["-i"];
  const terminalEnv: NodeJS.ProcessEnv = {
    ...process.env,
    TERM: "xterm-256color",
    CMDFIND_PLAIN_BANNER: "1"
  };
  if (process.platform === "darwin") {
    const currentPath = terminalEnv.PATH || process.env.PATH || "";
    const pathParts = currentPath.split(path.delimiter).filter(Boolean);
    const brewCandidates = ["/opt/homebrew/bin", "/opt/homebrew/sbin", "/usr/local/bin", "/usr/local/sbin"];
    for (const candidate of brewCandidates) {
      if (!pathParts.includes(candidate) && fs.existsSync(candidate)) {
        pathParts.unshift(candidate);
      }
    }
    terminalEnv.PATH = pathParts.join(path.delimiter);
  }
  if (normalizedShell.includes("zsh")) {
    terminalEnv.PROMPT = "%n %~ %# ";
  }
  if (normalizedShell.includes("bash")) {
    terminalEnv.PS1 = "\\u \\w \\$ ";
  }

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
      env: terminalEnv
    });

    terminalSessions.set(senderId, {
      kind: "pty",
      write: (input: string) => ptyChild.write(input),
      kill: () => ptyChild.kill(),
      resize: (cols: number, rows: number) => ptyChild.resize(cols, rows)
    });
    ptyChild.onData((chunk: string) => {
      sendTerminalOutput(chunk);
    });

    ptyChild.onExit(({ exitCode }) => {
      terminalSessions.delete(senderId);
      sendTerminalOutput(`\n[terminal exited with code ${exitCode}]\n`);
    });

    startedWithPty = true;
  } catch {
    // Fallback keeps app functional even if native PTY isn't available.
    try {
      const proc = spawn(shell, args, {
        stdio: "pipe",
        cwd: process.cwd(),
        env: terminalEnv
      });

      terminalSessions.set(senderId, {
        kind: "process",
        process: proc,
        write: (input: string) => proc.stdin.write(input),
        kill: () => proc.kill()
      });
      proc.stdout.on("data", (chunk: Buffer) => {
        sendTerminalOutput(chunk.toString());
      });
      proc.stderr.on("data", (chunk: Buffer) => {
        sendTerminalOutput(chunk.toString());
      });
      proc.on("exit", (code) => {
        terminalSessions.delete(senderId);
        sendTerminalOutput(`\n[terminal exited with code ${code ?? 0}]\n`);
      });
      proc.on("error", (error) => {
        sendTerminalOutput(`\n[terminal process error: ${String(error)}]\n`);
      });
    } catch (error) {
      sendTerminalOutput(`\n[terminal could not start: ${String(error)}]\n`);
      return false;
    }
  }

  if (!startedWithPty) {
    sendTerminalOutput(`[terminal started in compatibility mode: ${shell}]\n`);
  }
  sendTerminalOutput("[CMDFIND] integrated terminal ready\n");
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

ipcMain.handle("cmdfind:update-get-state", () => {
  return {
    status: "idle",
    message: `Version ${app.getVersion()}`,
    currentVersion: app.getVersion()
  } as UpdateState;
});

ipcMain.handle("cmdfind:update-check", async () => {
  if (!app.isPackaged) {
    sendUpdateState({
      status: "error",
      message: "Updates nur in der installierten App verfügbar (nicht im Dev-Modus).",
      currentVersion: app.getVersion()
    });
    return false;
  }

  try {
    await autoUpdater.checkForUpdates();
    return true;
  } catch (error) {
    sendUpdateState({
      status: "error",
      message: `Update-Check fehlgeschlagen: ${String(error)}`,
      currentVersion: app.getVersion()
    });
    return false;
  }
});

ipcMain.handle("cmdfind:update-download", async () => {
  if (!app.isPackaged) {
    return false;
  }
  try {
    await autoUpdater.downloadUpdate();
    return true;
  } catch (error) {
    sendUpdateState({
      status: "error",
      message: `Update-Download fehlgeschlagen: ${String(error)}`,
      currentVersion: app.getVersion()
    });
    return false;
  }
});

ipcMain.handle("cmdfind:update-install", () => {
  if (!app.isPackaged) {
    return false;
  }
  appIsQuitting = true;
  globalShortcut.unregisterAll();

  try {
    if (quickSearchWindow && !quickSearchWindow.isDestroyed()) {
      quickSearchWindow.destroy();
      quickSearchWindow = null;
    }
  } catch {
    // ignore
  }

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
      mainWindow = null;
    }
  } catch {
    // ignore
  }

  try {
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
      tray = null;
    }
  } catch {
    // ignore
  }

  setTimeout(() => {
    try {
      autoUpdater.quitAndInstall(false, false);
    } catch {
      app.quit();
    }
  }, 120);
  return true;
});

app.whenReady().then(() => {
  setupAutoUpdater();
  createWindow();
  setupMacMenuBar();
  registerGlobalSearchShortcut(loadConfig().desktopSearchShortcut);
  if (app.isPackaged) {
    setTimeout(() => {
      void autoUpdater.checkForUpdates().catch(() => {
        // handled via event/error channel
      });
    }, 3000);
  }

  app.on("activate", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    mainWindow.show();
    mainWindow.focus();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  appIsQuitting = true;
});

app.on("will-quit", () => {
  appIsQuitting = true;
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
