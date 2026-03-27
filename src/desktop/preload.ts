import { contextBridge, ipcRenderer } from "electron";
import type { Language, Platform, SearchResult, Shell } from "../core/types.js";

type DesktopSearchRequest = {
  query: string;
  language?: Language | "auto";
  platform?: Platform | "auto";
  shell?: Shell | "auto";
  limit?: number;
  useCurrentContext?: boolean;
  refreshIndex?: boolean;
  disableLocalIndex?: boolean;
};

type DesktopSearchResponse = {
  indexFile: string | null;
  context: {
    platform: Platform;
    shell: Shell;
    language: Language;
  };
  results: SearchResult[];
};

contextBridge.exposeInMainWorld("cmdfindDesktop", {
  search: (request: DesktopSearchRequest): Promise<DesktopSearchResponse> =>
    ipcRenderer.invoke("cmdfind:search", request),
  getDefaultLanguage: (): Promise<Language | null> => ipcRenderer.invoke("cmdfind:get-default-language"),
  setDefaultLanguage: (language: Language): Promise<boolean> =>
    ipcRenderer.invoke("cmdfind:set-default-language", language)
});
