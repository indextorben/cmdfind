const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cmdfindDesktop", {
  search: (request: {
    query: string;
    language?: "de" | "en" | "auto";
    platform?: "windows" | "linux" | "macos" | "auto";
    shell?: "powershell" | "bash" | "zsh" | "auto";
    limit?: number;
    useCurrentContext?: boolean;
    refreshIndex?: boolean;
    disableLocalIndex?: boolean;
  }) => ipcRenderer.invoke("cmdfind:search", request),
  getDefaultLanguage: () => ipcRenderer.invoke("cmdfind:get-default-language"),
  setDefaultLanguage: (language: "de" | "en") => ipcRenderer.invoke("cmdfind:set-default-language", language),
  getGlobalSearchShortcut: () => ipcRenderer.invoke("cmdfind:get-global-search-shortcut"),
  setGlobalSearchShortcut: (shortcut: string) => ipcRenderer.invoke("cmdfind:set-global-search-shortcut", shortcut),
  getMenuBarEnabled: () => ipcRenderer.invoke("cmdfind:get-menubar-enabled"),
  setMenuBarEnabled: (enabled: boolean) => ipcRenderer.invoke("cmdfind:set-menubar-enabled", enabled),
  getBackgroundModeEnabled: () => ipcRenderer.invoke("cmdfind:get-background-mode-enabled"),
  setBackgroundModeEnabled: (enabled: boolean) => ipcRenderer.invoke("cmdfind:set-background-mode-enabled", enabled),
  updateGetState: () => ipcRenderer.invoke("cmdfind:update-get-state"),
  updateCheck: () => ipcRenderer.invoke("cmdfind:update-check"),
  updateDownload: () => ipcRenderer.invoke("cmdfind:update-download"),
  updateInstall: () => ipcRenderer.invoke("cmdfind:update-install"),
  terminalStart: (sessionId?: number) => ipcRenderer.invoke("cmdfind:terminal-start", sessionId),
  terminalInput: (input: string, sessionId?: number) => ipcRenderer.invoke("cmdfind:terminal-input", input, sessionId),
  terminalResize: (cols: number, rows: number, sessionId?: number) => ipcRenderer.invoke("cmdfind:terminal-resize", cols, rows, sessionId),
  terminalStop: (sessionId?: number) => ipcRenderer.invoke("cmdfind:terminal-stop", sessionId),
  listDirectories: (request: { cwdHint?: string; inputPath?: string; limit?: number; onlyDirectories?: boolean }) =>
    ipcRenderer.invoke("cmdfind:list-directories", request),
  onTerminalOutput: (callback: (sessionId: number, chunk: string) => void) => {
    const listener = (_event: unknown, payload: { sessionId?: number; chunk?: string } | string) => {
      if (typeof payload === "string") {
        callback(1, payload);
        return;
      }
      callback(Number(payload?.sessionId || 1), String(payload?.chunk ?? ""));
    };
    ipcRenderer.on("cmdfind:terminal-output", listener);
    return () => ipcRenderer.removeListener("cmdfind:terminal-output", listener);
  },
  onUpdateState: (
    callback: (state: {
      status: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
      message: string;
      currentVersion: string;
      version?: string;
      percent?: number;
    }) => void
  ) => {
    const listener = (_event: unknown, state: unknown) => callback(state as never);
    ipcRenderer.on("cmdfind:update-state", listener);
    return () => ipcRenderer.removeListener("cmdfind:update-state", listener);
  },
  onQuickFocus: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("cmdfind:quick-focus", listener);
    return () => ipcRenderer.removeListener("cmdfind:quick-focus", listener);
  },
  onQuickPrefill: (callback: (value: string) => void) => {
    const listener = (_event: unknown, value: string) => callback(value);
    ipcRenderer.on("cmdfind:quick-prefill", listener);
    return () => ipcRenderer.removeListener("cmdfind:quick-prefill", listener);
  }
});
