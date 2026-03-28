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
  terminalStart: () => ipcRenderer.invoke("cmdfind:terminal-start"),
  terminalInput: (input: string) => ipcRenderer.invoke("cmdfind:terminal-input", input),
  terminalResize: (cols: number, rows: number) => ipcRenderer.invoke("cmdfind:terminal-resize", cols, rows),
  terminalStop: () => ipcRenderer.invoke("cmdfind:terminal-stop"),
  onTerminalOutput: (callback: (chunk: string) => void) => {
    const listener = (_event: unknown, chunk: string) => callback(chunk);
    ipcRenderer.on("cmdfind:terminal-output", listener);
    return () => ipcRenderer.removeListener("cmdfind:terminal-output", listener);
  }
});
