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
  setDefaultLanguage: (language: "de" | "en") => ipcRenderer.invoke("cmdfind:set-default-language", language)
});
