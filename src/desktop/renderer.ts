type DesktopSearchResponse = {
  indexFile: string | null;
  context: {
    platform: "windows" | "linux" | "macos";
    shell: "powershell" | "bash" | "zsh";
    language: "de" | "en";
  };
  results: Array<{
    entry: {
      task: string;
      command: string;
      example: string;
      platform: string;
      shell: string;
      sourceType: string;
      category: string;
      locallyAvailable: boolean;
      dangerLevel: string;
      description: {
        de: string;
        en: string;
      };
    };
  }>;
};

type UpdateState = {
  status: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  message: string;
  currentVersion: string;
  version?: string;
  percent?: number;
};

declare global {
  interface Window {
    cmdfindDesktop: {
      search: (request: {
        query: string;
        language?: "de" | "en" | "auto";
        platform?: "windows" | "linux" | "macos" | "auto";
        shell?: "powershell" | "bash" | "zsh" | "auto";
        limit?: number;
        useCurrentContext?: boolean;
        refreshIndex?: boolean;
        disableLocalIndex?: boolean;
      }) => Promise<DesktopSearchResponse>;
      getDefaultLanguage: () => Promise<"de" | "en" | null>;
      setDefaultLanguage: (language: "de" | "en") => Promise<boolean>;
      getGlobalSearchShortcut: () => Promise<string>;
      setGlobalSearchShortcut: (shortcut: string) => Promise<string>;
      updateGetState: () => Promise<UpdateState>;
      updateCheck: () => Promise<boolean>;
      updateDownload: () => Promise<boolean>;
      updateInstall: () => Promise<boolean>;
      terminalStart: () => Promise<boolean>;
      terminalInput: (input: string) => Promise<boolean>;
      terminalResize: (cols: number, rows: number) => Promise<boolean>;
      terminalStop: () => Promise<boolean>;
      listDirectories: (request: {
        cwdHint?: string;
        inputPath?: string;
        limit?: number;
        onlyDirectories?: boolean;
      }) => Promise<
        Array<{ value: string; label: string }>
      >;
      onTerminalOutput: (callback: (chunk: string) => void) => () => void;
      onUpdateState: (callback: (state: UpdateState) => void) => () => void;
      onQuickFocus: (callback: () => void) => () => void;
    };
  }
}

const queryInput = document.querySelector<HTMLInputElement>("#query")!;
const langSelect = document.querySelector<HTMLSelectElement>("#lang")!;
const platformSelect = document.querySelector<HTMLSelectElement>("#platform")!;
const shellSelect = document.querySelector<HTMLSelectElement>("#shell")!;
const limitInput = document.querySelector<HTMLInputElement>("#limit")!;
const currentContextCheckbox = document.querySelector<HTMLInputElement>("#context")!;
const refreshCheckbox = document.querySelector<HTMLInputElement>("#refresh")!;
const disableLocalCheckbox = document.querySelector<HTMLInputElement>("#disableLocal")!;
const resultsEl = document.querySelector<HTMLDivElement>("#results")!;
const statusEl = document.querySelector<HTMLDivElement>("#status")!;
const searchBtn = document.querySelector<HTMLButtonElement>("#searchBtn")!;
const allBtn = document.querySelector<HTMLButtonElement>("#allBtn")!;
const favoritesBtn = document.querySelector<HTMLButtonElement>("#favoritesBtn")!;
const exportFavoritesBtn = document.querySelector<HTMLButtonElement>("#exportFavoritesBtn")!;
const saveLangBtn = document.querySelector<HTMLButtonElement>("#saveLangBtn")!;
const searchHistoryWrap = document.querySelector<HTMLDivElement>("#searchHistoryWrap")!;
const searchHistoryList = document.querySelector<HTMLDivElement>("#searchHistoryList")!;
const historyTitle = document.querySelector<HTMLSpanElement>("#historyTitle")!;
const historyClearBtn = document.querySelector<HTMLButtonElement>("#historyClearBtn")!;
const settingsToggle = document.querySelector<HTMLButtonElement>("#settingsToggle")!;
const searchShortcutInput = document.querySelector<HTMLInputElement>("#searchShortcut")!;
const searchShortcutReset = document.querySelector<HTMLButtonElement>("#searchShortcutReset")!;
const searchShortcutLabel = document.querySelector<HTMLElement>("#searchShortcutLabel")!;
const searchShortcutHint = document.querySelector<HTMLElement>("#searchShortcutHint")!;
const searchShortcutConflict = document.querySelector<HTMLElement>("#searchShortcutConflict")!;
const updateCheckBtn = document.querySelector<HTMLButtonElement>("#updateCheckBtn")!;
const updateDownloadBtn = document.querySelector<HTMLButtonElement>("#updateDownloadBtn")!;
const updateInstallBtn = document.querySelector<HTMLButtonElement>("#updateInstallBtn")!;
const updateStatusEl = document.querySelector<HTMLDivElement>("#updateStatus")!;
const settingsPanel = document.querySelector<HTMLElement>("#settingsPanel")!;
const settingsClose = document.querySelector<HTMLButtonElement>("#settingsClose")!;
const uiLanguageSelect = document.querySelector<HTMLSelectElement>("#uiLanguage")!;
const readmeTitle = document.querySelector<HTMLElement>("#readmeTitle")!;
const readmeContent = document.querySelector<HTMLElement>("#readmeContent")!;
const themeSelect = document.querySelector<HTMLSelectElement>("#themeSelect")!;
const accentColor = document.querySelector<HTMLInputElement>("#accentColor")!;
const uiScale = document.querySelector<HTMLInputElement>("#uiScale")!;
const radiusScale = document.querySelector<HTMLInputElement>("#radiusScale")!;
const terminalHeightRange = document.querySelector<HTMLInputElement>("#terminalHeight")!;
const terminalFontSizeRange = document.querySelector<HTMLInputElement>("#terminalFontSize")!;
const terminalToggle = document.querySelector<HTMLButtonElement>("#terminalToggle")!;
const terminalPanel = document.querySelector<HTMLElement>("#terminalPanel")!;
const terminalOutput = document.querySelector<HTMLPreElement>("#terminalOutput")!;
const terminalForm = document.querySelector<HTMLFormElement>("#terminalForm")!;
const terminalInput = document.querySelector<HTMLInputElement>("#terminalInput")!;
const terminalRun = document.querySelector<HTMLButtonElement>("#terminalRun")!;
const terminalClear = document.querySelector<HTMLButtonElement>("#terminalClear")!;
const terminalStop = document.querySelector<HTMLButtonElement>("#terminalStop")!;
const terminalSuggest = document.querySelector<HTMLDivElement>("#terminalSuggest")!;
const terminalInlineHint = document.querySelector<HTMLDivElement>("#terminalInlineHint")!;
const wrapEl = document.querySelector<HTMLElement>(".wrap")!;

type UiSettings = {
  uiLanguage: "de" | "en";
  searchShortcut: string;
  theme: "midnight" | "slate" | "graphite" | "sunset" | "emerald" | "amber" | "cyber" | "rose";
  accent: string;
  scale: number;
  radius: number;
  terminalHeight: number;
  terminalFontSize: number;
};

type FavoriteItem = {
  entry: DesktopSearchResponse["results"][number]["entry"];
  savedAt: number;
};

const uiSettingsKey = "cmdfind:desktop:ui-settings";
const favoritesKey = "cmdfind:desktop:favorites";
const searchHistoryKey = "cmdfind:desktop:search-history";
const supportedThemes: UiSettings["theme"][] = ["midnight", "slate", "graphite", "sunset", "emerald", "amber", "cyber", "rose"];
let currentUiLanguage: "de" | "en" = "de";
let currentSearchShortcut = "";
let lastSyncedGlobalShortcut = "";
const renderedEntriesByKey = new Map<string, DesktopSearchResponse["results"][number]["entry"]>();
const i18n = {
  de: {
    subtitle: "Finde passende Befehle schneller und mit klarerer Oberfläche.",
    updateCheck: "Update prüfen",
    updateDownload: "Update laden",
    updateInstall: "Jetzt installieren",
    search: "Suchen",
    allLocal: "Alle lokal",
    favorites: "Favoriten",
    exportFavorites: "Export",
    historyTitle: "Suchverlauf",
    historyClear: "Leeren",
    runInTerminal: "Ausführen",
    searchShortcutLabel: "Such-Shortcut",
    searchShortcutReset: "Standard",
    searchShortcutHint: "Klicken und Tastenkombination drücken, z. B. Strg+B oder Cmd+B. Hinweis: Fn ist nicht immer als Shortcut erkennbar.",
    shortcutFocused: "Suchfeld über Shortcut fokussiert",
    shortcutConflictPrefix: "Konflikt mit reservierter Tastenkombination:",
    shortcutConflictTerminalInterrupt: "Terminal: laufenden Befehl abbrechen",
    shortcutConflictLineClear: "Terminal: Eingabezeile löschen",
    context: "aktuellen Kontext bevorzugen",
    refresh: "lokalen Index neu laden",
    disableLocal: "lokalen Index deaktivieren",
    saveLanguage: "Standardsprache speichern",
    statusLoadingVersion: "Version wird geladen...",
    terminalHeadLeft: "ESC für Terminal",
    terminalHeadCenter: "Neue Befehlssitzung",
    terminalClear: "Leeren",
    terminalStop: "Stop",
    terminalRun: "Ausführen",
    terminalPlaceholder: "Befehl eingeben und Enter drücken...",
    queryPlaceholder: "Befehl suchen... z. B. Prozess auf Port 3000",
    settingsTitle: "Einstellungen",
    uiLanguageLabel: "App-Sprache",
    themeLabel: "Theme",
    chipDark: "Dunkel",
    chipContrast: "Hoher Kontrast",
    accentLabel: "Akzentfarbe",
    uiScaleLabel: "UI-Größe",
    radiusLabel: "Rundungen",
    terminalHeightLabel: "Terminal-Höhe",
    terminalFontLabel: "Terminal-Schriftgröße",
    systemTitle: "System",
    updatesLabel: "Updates",
    readmeTitle: "Tutorial: So nutzt du cmdfind",
    suggestionPrefix: "Vorschlag:",
    suggestionApply: "Tab zum Übernehmen",
    saveLanguageNeedPick: "Bitte de oder en auswählen, um die Standardsprache zu speichern.",
    saveLanguageSaved: "Standardsprache gespeichert:",
    favoritesTitle: "Favoriten geladen",
    favoritesEmpty: "Noch keine Favoriten gespeichert.",
    favoriteAdd: "Zu Favoriten hinzugefügt",
    favoriteRemove: "Aus Favoriten entfernt",
    favoritesExported: "Favoriten exportiert:",
    favoritesExportEmpty: "Keine Favoriten zum Exportieren vorhanden.",
    ranInTerminal: "Im Terminal ausgeführt",
    terminalStartFailed: "Terminal konnte nicht gestartet werden.",
    enterQuery: "Bitte Suchbegriff eingeben.",
    searching: "Suche läuft...",
    noResults: "Keine Ergebnisse.",
    copyFailed: "Kopieren fehlgeschlagen."
  },
  en: {
    subtitle: "Find matching commands faster with a cleaner interface.",
    updateCheck: "Check update",
    updateDownload: "Download update",
    updateInstall: "Install now",
    search: "Search",
    allLocal: "All Local",
    favorites: "Favorites",
    exportFavorites: "Export",
    historyTitle: "Search history",
    historyClear: "Clear",
    runInTerminal: "Run",
    searchShortcutLabel: "Search shortcut",
    searchShortcutReset: "Default",
    searchShortcutHint: "Click and press a key combo, e.g. Ctrl+B or Cmd+B. Note: Fn is not always detectable as a shortcut.",
    shortcutFocused: "Search focused via shortcut",
    shortcutConflictPrefix: "Conflict with reserved shortcut:",
    shortcutConflictTerminalInterrupt: "Terminal: interrupt running command",
    shortcutConflictLineClear: "Terminal: clear input line",
    context: "prefer current context",
    refresh: "refresh local index",
    disableLocal: "disable local index",
    saveLanguage: "Save default language",
    statusLoadingVersion: "Loading version...",
    terminalHeadLeft: "ESC for terminal",
    terminalHeadCenter: "New command session",
    terminalClear: "Clear",
    terminalStop: "Stop",
    terminalRun: "Run",
    terminalPlaceholder: "Type command and press Enter...",
    queryPlaceholder: "Search command... e.g. process on port 3000",
    settingsTitle: "Settings",
    uiLanguageLabel: "App language",
    themeLabel: "Theme",
    chipDark: "Dark",
    chipContrast: "High Contrast",
    accentLabel: "Accent color",
    uiScaleLabel: "UI size",
    radiusLabel: "Radius",
    terminalHeightLabel: "Terminal height",
    terminalFontLabel: "Terminal font size",
    systemTitle: "System",
    updatesLabel: "Updates",
    readmeTitle: "Tutorial: How to use cmdfind",
    suggestionPrefix: "Suggestion:",
    suggestionApply: "Tab to apply",
    saveLanguageNeedPick: "Select de or en to save default language.",
    saveLanguageSaved: "Saved default language:",
    favoritesTitle: "Favorites loaded",
    favoritesEmpty: "No favorites saved yet.",
    favoriteAdd: "Added to favorites",
    favoriteRemove: "Removed from favorites",
    favoritesExported: "Favorites exported:",
    favoritesExportEmpty: "No favorites to export.",
    ranInTerminal: "Executed in terminal",
    terminalStartFailed: "Terminal could not start.",
    enterQuery: "Enter a query.",
    searching: "Searching...",
    noResults: "No results.",
    copyFailed: "Copy failed."
  }
} as const;

function t(key: keyof typeof i18n.de): string {
  return i18n[currentUiLanguage][key];
}

function isMacPlatform(): boolean {
  return /mac/i.test(navigator.platform);
}

function getDefaultSearchShortcut(): string {
  return isMacPlatform() ? "Meta+B" : "Control+B";
}

function normalizeShortcut(shortcut: string): string {
  const raw = shortcut
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!raw.length) return getDefaultSearchShortcut();

  const normalized = new Set<string>();
  for (const part of raw) {
    const low = part.toLowerCase();
    if (low === "cmd" || low === "command" || low === "meta") normalized.add("Meta");
    else if (low === "ctrl" || low === "control" || low === "strg") normalized.add("Control");
    else if (low === "alt" || low === "option") normalized.add("Alt");
    else if (low === "shift" || low === "umschalt") normalized.add("Shift");
    else if (low.length === 1) normalized.add(low.toUpperCase());
    else normalized.add(part.toUpperCase());
  }

  const mods = ["Meta", "Control", "Alt", "Shift"].filter((mod) => normalized.has(mod));
  for (const mod of mods) normalized.delete(mod);
  const key = Array.from(normalized).at(0) ?? "B";
  return [...mods, key].join("+");
}

function shortcutToLabel(shortcut: string): string {
  return normalizeShortcut(shortcut)
    .split("+")
    .map((part) => {
      if (part === "Meta") return isMacPlatform() ? "Cmd" : "Meta";
      if (part === "Control") return isMacPlatform() ? "Ctrl" : "Strg";
      if (part === "Alt") return "Alt";
      if (part === "Shift") return isMacPlatform() ? "Shift" : "Umschalt";
      return part;
    })
    .join("+");
}

function eventToShortcut(event: KeyboardEvent): string | null {
  if (event.repeat) return null;
  if (["Meta", "Control", "Alt", "Shift"].includes(event.key)) return null;

  const key = event.key === " " ? "Space" : event.key.length === 1 ? event.key.toUpperCase() : event.key.toUpperCase();
  const parts: string[] = [];
  if (event.metaKey) parts.push("Meta");
  if (event.ctrlKey) parts.push("Control");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (!parts.length) return null;
  parts.push(key);
  return normalizeShortcut(parts.join("+"));
}

function getReservedShortcutConflict(shortcut: string): string | null {
  const normalized = normalizeShortcut(shortcut);
  const reserved = new Map<string, keyof typeof i18n.de>([
    ["Control+C", "shortcutConflictTerminalInterrupt"],
    ["Meta+BACKSPACE", "shortcutConflictLineClear"]
  ]);
  const hit = reserved.get(normalized);
  return hit ? t(hit) : null;
}

function setShortcutConflict(message: string | null): void {
  if (!message) {
    searchShortcutConflict.hidden = true;
    searchShortcutConflict.textContent = "";
    return;
  }
  searchShortcutConflict.hidden = false;
  searchShortcutConflict.textContent = `${t("shortcutConflictPrefix")} ${message}`;
}

function setShortcutInput(shortcut: string): void {
  currentSearchShortcut = normalizeShortcut(shortcut);
  searchShortcutInput.dataset.shortcut = currentSearchShortcut;
  searchShortcutInput.value = shortcutToLabel(currentSearchShortcut);
}

function getReadmeHtml(lang: "de" | "en"): string {
  if (lang === "de") {
    return `
      <p><strong>Tutorial: In 2 Minuten produktiv</strong></p>
      <p><strong>Schritt 1 - Befehl suchen</strong><br />Tippe einen Begriff wie <code>ping</code>, <code>datei löschen</code> oder <code>port 3000</code> in die Suche und klicke auf <em>Suchen</em>.</p>
      <p><strong>Schritt 2 - Treffer verfeinern</strong><br />Nutze <em>Sprache</em>, <em>Plattform</em>, <em>Shell</em> und <em>Limit</em>, damit nur passende Befehle angezeigt werden.</p>
      <p><strong>Schritt 3 - Befehl ausführen</strong><br />Beim Treffer auf <em>Ausführen</em> klicken. Der Befehl startet direkt im integrierten Terminal.</p>
      <p><strong>Schritt 4 - Favoriten sichern</strong><br />Mit <em>★</em> speicherst du wichtige Befehle dauerhaft. Über <em>Favoriten</em> findest du sie sofort wieder.</p>
      <p><strong>Schritt 5 - Team teilen</strong><br />Mit <em>Export</em> bekommst du eine JSON-Datei deiner Favoriten, ideal für Backup oder Team-Setup.</p>
      <p><strong>Schritt 6 - Workflow beschleunigen</strong><br />Lege unter <em>Such-Shortcut</em> deine Tastenkombi fest. Mit dem Shortcut springst du direkt ins Suchfeld.</p>
      <p><strong>Schritt 7 - Terminal effizient nutzen</strong><br />Vorschlag mit <code>Tab</code> übernehmen, Verlauf mit Pfeil hoch/runter durchgehen, laufenden Prozess mit <code>Ctrl+C</code> stoppen.</p>
      <p><strong>Schritt 8 - Oberfläche anpassen</strong><br />In den Einstellungen änderst du App-Sprache, Theme, Akzent, UI-Größe und Terminal-Darstellung.</p>
      <p><strong>Pro-Tipps</strong></p>
      <ul>
        <li><strong>Suchverlauf:</strong> Häufige Begriffe erscheinen als Schnellzugriff.</li>
        <li><strong>Kontext-Modus:</strong> Mit <em>aktuellen Kontext bevorzugen</em> priorisiert cmdfind passende OS-/Shell-Befehle.</li>
        <li><strong>Updates:</strong> In <em>System > Updates</em> prüfst du neue Versionen direkt in der App.</li>
      </ul>
      <p><strong>Ziel:</strong> Weniger Suchzeit, weniger Tippfehler, schneller zum funktionierenden Befehl.</p>
    `;
  }
  return `
    <p><strong>Tutorial: Be productive in 2 minutes</strong></p>
    <p><strong>Step 1 - Search a command</strong><br />Type terms like <code>ping</code>, <code>delete file</code>, or <code>port 3000</code>, then click <em>Search</em>.</p>
    <p><strong>Step 2 - Refine results</strong><br />Use <em>language</em>, <em>platform</em>, <em>shell</em>, and <em>limit</em> to narrow down results.</p>
    <p><strong>Step 3 - Run command</strong><br />Click <em>Run</em> on any result to execute it inside the integrated terminal.</p>
    <p><strong>Step 4 - Save favorites</strong><br />Use <em>★</em> to keep important commands for quick reuse.</p>
    <p><strong>Step 5 - Share with your team</strong><br />Use <em>Export</em> to create a JSON backup/share file of favorites.</p>
    <p><strong>Step 6 - Speed up workflow</strong><br />Set your own search shortcut in Settings and jump to search instantly.</p>
    <p><strong>Step 7 - Terminal workflow</strong><br />Use <code>Tab</code> to apply suggestion, Up/Down for history, and <code>Ctrl+C</code> to stop running commands.</p>
    <p><strong>Step 8 - Customize UI</strong><br />Tune app language, theme, accent, UI scale, and terminal style in Settings.</p>
    <p><strong>Pro tips</strong></p>
    <ul>
      <li><strong>Search history:</strong> Reuse recent queries quickly.</li>
      <li><strong>Context mode:</strong> <em>Prefer current context</em> prioritizes commands for your active OS/shell.</li>
      <li><strong>Updates:</strong> Check new releases directly in <em>System > Updates</em>.</li>
    </ul>
    <p><strong>Goal:</strong> Spend less time searching and more time executing working commands.</p>
  `;
}

function applyUiLanguage(lang: "de" | "en"): void {
  currentUiLanguage = lang;
  (document.getElementById("subtitleText") as HTMLElement | null)?.replaceChildren(t("subtitle"));
  updateCheckBtn.textContent = t("updateCheck");
  updateDownloadBtn.textContent = t("updateDownload");
  updateInstallBtn.textContent = t("updateInstall");
  searchBtn.textContent = t("search");
  allBtn.textContent = t("allLocal");
  favoritesBtn.textContent = t("favorites");
  exportFavoritesBtn.textContent = t("exportFavorites");
  historyTitle.textContent = t("historyTitle");
  historyClearBtn.textContent = t("historyClear");
  searchShortcutLabel.textContent = t("searchShortcutLabel");
  searchShortcutReset.textContent = t("searchShortcutReset");
  searchShortcutHint.textContent = t("searchShortcutHint");
  if (!searchShortcutConflict.hidden && searchShortcutConflict.textContent) {
    const conflict = getReservedShortcutConflict(currentSearchShortcut);
    setShortcutConflict(conflict);
  }
  (document.getElementById("labelContext") as HTMLElement | null)?.replaceChildren(t("context"));
  (document.getElementById("labelRefresh") as HTMLElement | null)?.replaceChildren(t("refresh"));
  (document.getElementById("labelDisableLocal") as HTMLElement | null)?.replaceChildren(t("disableLocal"));
  saveLangBtn.textContent = t("saveLanguage");
  if (!updateStatusEl.textContent || updateStatusEl.textContent === i18n.de.statusLoadingVersion || updateStatusEl.textContent === i18n.en.statusLoadingVersion) {
    updateStatusEl.textContent = t("statusLoadingVersion");
  }
  (document.getElementById("terminalHeadLeft") as HTMLElement | null)?.replaceChildren(t("terminalHeadLeft"));
  (document.getElementById("terminalHeadCenter") as HTMLElement | null)?.replaceChildren(t("terminalHeadCenter"));
  terminalClear.textContent = t("terminalClear");
  terminalStop.textContent = t("terminalStop");
  terminalRun.textContent = t("terminalRun");
  terminalInput.placeholder = t("terminalPlaceholder");
  queryInput.placeholder = t("queryPlaceholder");
  (document.getElementById("settingsTitle") as HTMLElement | null)?.replaceChildren(t("settingsTitle"));
  (document.getElementById("uiLanguageLabel") as HTMLElement | null)?.replaceChildren(t("uiLanguageLabel"));
  (document.getElementById("themeLabel") as HTMLElement | null)?.replaceChildren(t("themeLabel"));
  (document.getElementById("chipDark") as HTMLElement | null)?.replaceChildren(t("chipDark"));
  (document.getElementById("chipContrast") as HTMLElement | null)?.replaceChildren(t("chipContrast"));
  (document.getElementById("accentLabel") as HTMLElement | null)?.replaceChildren(t("accentLabel"));
  (document.getElementById("uiScaleLabel") as HTMLElement | null)?.replaceChildren(t("uiScaleLabel"));
  (document.getElementById("radiusLabel") as HTMLElement | null)?.replaceChildren(t("radiusLabel"));
  (document.getElementById("terminalHeightLabel") as HTMLElement | null)?.replaceChildren(t("terminalHeightLabel"));
  (document.getElementById("terminalFontLabel") as HTMLElement | null)?.replaceChildren(t("terminalFontLabel"));
  (document.getElementById("systemTitle") as HTMLElement | null)?.replaceChildren(t("systemTitle"));
  (document.getElementById("updatesLabel") as HTMLElement | null)?.replaceChildren(t("updatesLabel"));
  readmeTitle.replaceChildren(t("readmeTitle"));
  readmeContent.innerHTML = getReadmeHtml(lang);
  setShortcutInput(currentSearchShortcut || getDefaultSearchShortcut());
  renderSearchHistory();
}
let terminalStarted = false;
const terminalHistory: string[] = [];
let terminalHistoryIndex = -1;
let terminalRows: string[] = [""];
let terminalCursorCol = 0;
let terminalSuggestions: string[] = [];
let terminalSuggestionIndex = -1;
let terminalSuggestTimer: number | undefined;
let terminalInputHadFocus = false;
let suppressInlineAutocompleteOnce = false;
let pendingInlineSuggestion: string | null = null;
let terminalSuggestionRequestId = 0;

function renderUpdateState(state: UpdateState): void {
  updateStatusEl.textContent = state.message || `Version ${state.currentVersion}`;

  updateCheckBtn.hidden = false;
  updateDownloadBtn.hidden = true;
  updateInstallBtn.hidden = true;
  updateCheckBtn.disabled = state.status === "checking";

  if (state.status === "available") {
    updateDownloadBtn.hidden = false;
    updateDownloadBtn.disabled = false;
  } else if (state.status === "downloading") {
    updateDownloadBtn.hidden = false;
    updateDownloadBtn.disabled = true;
  } else if (state.status === "downloaded") {
    updateInstallBtn.hidden = false;
    updateInstallBtn.disabled = false;
  }
}

function renderInlineHint(): void {
  if (!pendingInlineSuggestion) {
    terminalInlineHint.textContent = "";
    return;
  }
  terminalInlineHint.textContent = `${t("suggestionPrefix")} ${pendingInlineSuggestion}  |  ${t("suggestionApply")}`;
}

function updateTerminalCurrentDirHintFromOutput(plainOutput: string): void {
  const lines = plainOutput.split("\n");
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const match = line.match(/^\S+\s+(.+?)\s+[%$#](?:\s.*)?$/);
    if (match?.[1]) {
      terminalCurrentDirHint = match[1].trim();
      return;
    }
  }
}
let terminalCurrentDirHint = "~";
let wrapScrollRaf = 0;

function syncWrapScrollState(): void {
  const needsScroll = wrapEl.scrollHeight - wrapEl.clientHeight > 2;
  wrapEl.classList.toggle("can-scroll", needsScroll);
}

function queueWrapScrollState(): void {
  if (wrapScrollRaf) return;
  wrapScrollRaf = window.requestAnimationFrame(() => {
    wrapScrollRaf = 0;
    syncWrapScrollState();
  });
}

const quickSettingsFields: HTMLElement[] = [
  queryInput,
  langSelect,
  platformSelect,
  shellSelect,
  limitInput,
  searchBtn,
  allBtn,
  currentContextCheckbox,
  refreshCheckbox,
  disableLocalCheckbox,
  saveLangBtn
];

function moveQuickSettingsFocus(current: HTMLElement, direction: "left" | "right" | "up" | "down"): void {
  const currentIndex = quickSettingsFields.indexOf(current);
  if (currentIndex < 0) return;

  const firstRowColumns = 7;
  let nextIndex = currentIndex;

  if (direction === "left") {
    nextIndex = Math.max(0, currentIndex - 1);
  } else if (direction === "right") {
    nextIndex = Math.min(quickSettingsFields.length - 1, currentIndex + 1);
  } else if (direction === "up") {
    nextIndex = Math.max(0, currentIndex - firstRowColumns);
  } else if (direction === "down") {
    nextIndex = Math.min(quickSettingsFields.length - 1, currentIndex + firstRowColumns);
  }

  if (nextIndex !== currentIndex) {
    quickSettingsFields[nextIndex]?.focus();
  }
}

function readUiSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(uiSettingsKey);
    if (!raw) {
      return {
        uiLanguage: "de",
        searchShortcut: getDefaultSearchShortcut(),
        theme: "midnight",
        accent: "#6ca5ff",
        scale: 100,
        radius: 14,
        terminalHeight: 420,
        terminalFontSize: 16
      };
    }
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return {
      uiLanguage: parsed.uiLanguage === "en" ? "en" : "de",
      searchShortcut: normalizeShortcut(typeof parsed.searchShortcut === "string" ? parsed.searchShortcut : getDefaultSearchShortcut()),
      theme: supportedThemes.includes(parsed.theme as UiSettings["theme"])
        ? (parsed.theme as UiSettings["theme"])
        : "midnight",
      accent: typeof parsed.accent === "string" ? parsed.accent : "#6ca5ff",
      scale: typeof parsed.scale === "number" ? parsed.scale : 100,
      radius: typeof parsed.radius === "number" ? parsed.radius : 14,
      terminalHeight: typeof parsed.terminalHeight === "number" ? parsed.terminalHeight : 420,
      terminalFontSize: typeof parsed.terminalFontSize === "number" ? parsed.terminalFontSize : 16
    };
  } catch {
    return {
      uiLanguage: "de",
      searchShortcut: getDefaultSearchShortcut(),
      theme: "midnight",
      accent: "#6ca5ff",
      scale: 100,
      radius: 14,
      terminalHeight: 420,
      terminalFontSize: 16
    };
  }
}

function saveUiSettings(settings: UiSettings): void {
  localStorage.setItem(uiSettingsKey, JSON.stringify(settings));
}

function applyUiSettings(settings: UiSettings): void {
  currentSearchShortcut = normalizeShortcut(settings.searchShortcut);
  applyUiLanguage(settings.uiLanguage);
  document.body.dataset.theme = settings.theme;
  if (settings.theme === "midnight") {
    delete document.body.dataset.theme;
  }

  const root = document.documentElement;
  root.style.setProperty("--primary", settings.accent);
  root.style.setProperty("--line-strong", `${settings.accent}88`);
  root.style.setProperty("--radius", `${settings.radius}px`);
  root.style.setProperty("--radius-sm", `${Math.max(8, settings.radius - 4)}px`);
  const clampedScale = Math.max(90, Math.min(120, settings.scale));
  root.style.setProperty("--ui-scale", String(clampedScale / 100));
  const clampedTerminalHeight = Math.max(260, Math.min(620, settings.terminalHeight));
  const clampedTerminalFontSize = Math.max(13, Math.min(24, settings.terminalFontSize));
  root.style.setProperty("--terminal-height", `${clampedTerminalHeight}px`);
  root.style.setProperty("--terminal-font-size", `${clampedTerminalFontSize}px`);

  uiLanguageSelect.value = settings.uiLanguage;
  setShortcutInput(currentSearchShortcut);
  setShortcutConflict(getReservedShortcutConflict(currentSearchShortcut));
  themeSelect.value = settings.theme;
  accentColor.value = settings.accent;
  uiScale.value = String(clampedScale);
  radiusScale.value = String(settings.radius);
  terminalHeightRange.value = String(clampedTerminalHeight);
  terminalFontSizeRange.value = String(clampedTerminalFontSize);

  if (terminalStarted) {
    const size = getTerminalSizeEstimate();
    void window.cmdfindDesktop.terminalResize(size.cols, size.rows);
  }
  queueWrapScrollState();
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function favoriteKeyFor(entry: DesktopSearchResponse["results"][number]["entry"]): string {
  return `${entry.command}::${entry.platform}::${entry.shell}`;
}

function readFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(favoritesKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.entry?.command).slice(0, 500);
  } catch {
    return [];
  }
}

function saveFavorites(items: FavoriteItem[]): void {
  localStorage.setItem(favoritesKey, JSON.stringify(items));
}

function readSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(searchHistoryKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 12);
  } catch {
    return [];
  }
}

function saveSearchHistory(items: string[]): void {
  localStorage.setItem(searchHistoryKey, JSON.stringify(items.slice(0, 12)));
}

function pushSearchHistory(query: string): void {
  const clean = query.trim();
  if (!clean) return;
  const existing = readSearchHistory().filter((item) => item.toLowerCase() !== clean.toLowerCase());
  existing.unshift(clean);
  saveSearchHistory(existing);
}

function clearSearchHistory(): void {
  localStorage.removeItem(searchHistoryKey);
  renderSearchHistory();
}

function renderSearchHistory(): void {
  const history = readSearchHistory();
  if (!history.length) {
    searchHistoryWrap.hidden = true;
    searchHistoryList.innerHTML = "";
    queueWrapScrollState();
    return;
  }
  searchHistoryWrap.hidden = false;
  searchHistoryList.innerHTML = history
    .map((item) => `<button type="button" class="history-chip" data-query="${escapeHtml(item)}">${escapeHtml(item)}</button>`)
    .join("");
  queueWrapScrollState();
}

function isFavorite(entry: DesktopSearchResponse["results"][number]["entry"]): boolean {
  const key = favoriteKeyFor(entry);
  return readFavorites().some((item) => favoriteKeyFor(item.entry) === key);
}

function toggleFavorite(entry: DesktopSearchResponse["results"][number]["entry"]): { active: boolean } {
  const key = favoriteKeyFor(entry);
  const all = readFavorites();
  const existing = all.findIndex((item) => favoriteKeyFor(item.entry) === key);
  if (existing >= 0) {
    all.splice(existing, 1);
    saveFavorites(all);
    return { active: false };
  }
  all.unshift({ entry, savedAt: Date.now() });
  saveFavorites(all);
  return { active: true };
}

function renderEntries(
  entries: DesktopSearchResponse["results"][number]["entry"][],
  contextLanguage: "de" | "en",
  statusText: string
): void {
  renderedEntriesByKey.clear();
  for (const entry of entries) {
    renderedEntriesByKey.set(favoriteKeyFor(entry), entry);
  }
  statusEl.textContent = statusText;

  if (entries.length === 0) {
    resultsEl.innerHTML = `<div class="empty">${escapeHtml(t("noResults"))}</div>`;
    queueWrapScrollState();
    return;
  }

  resultsEl.innerHTML = entries
    .map((entry, index) => {
      const note = contextLanguage === "de" ? entry.description.de : entry.description.en;
      const activeFavorite = isFavorite(entry);
      return `
      <article class="card">
        <div class="head"><span class="idx">${index + 1}</span> ${escapeHtml(entry.task.replaceAll("_", " "))}</div>
        <div class="command-row">
          <div class="command">${escapeHtml(entry.command)}</div>
          <button class="copy-btn" data-cmd="${escapeHtml(entry.command)}">Copy</button>
          <button class="run-btn" data-run-cmd="${escapeHtml(entry.command)}">${escapeHtml(t("runInTerminal"))}</button>
          <button class="favorite-btn" data-fav-key="${escapeHtml(favoriteKeyFor(entry))}" aria-label="Favorite">${activeFavorite ? "★" : "☆"}</button>
        </div>
        <div class="note">${escapeHtml(note)}</div>
        <div class="meta">Example: ${escapeHtml(entry.example)}</div>
        <div class="meta">${escapeHtml(entry.platform)} | ${escapeHtml(entry.shell)} | ${escapeHtml(
        entry.sourceType
      )} | ${escapeHtml(entry.category)} | ${entry.locallyAvailable ? "local" : "seed"} | ${escapeHtml(
        entry.dangerLevel
      )}</div>
      </article>`;
    })
    .join("");
  queueWrapScrollState();
}

function render(response: DesktopSearchResponse): void {
  renderEntries(
    response.results.map((item) => item.entry),
    response.context.language,
    `Context: ${response.context.platform}/${response.context.shell} | Lang: ${response.context.language}`
  );
}

async function runCommandInTerminal(command: string): Promise<void> {
  if (!command.trim()) return;
  setTerminalOpen(true);
  if (!terminalStarted) {
    const started = await window.cmdfindDesktop.terminalStart();
    terminalStarted = started;
    if (!started) {
      statusEl.textContent = t("terminalStartFailed");
      return;
    }
    const size = getTerminalSizeEstimate();
    await window.cmdfindDesktop.terminalResize(size.cols, size.rows);
  }
  await window.cmdfindDesktop.terminalInput(`${command}\n`);
  statusEl.textContent = `${t("ranInTerminal")}: ${command}`;
}

async function copyCommand(command: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(command);
    statusEl.textContent = `Copied: ${command}`;
  } catch {
    statusEl.textContent = t("copyFailed");
  }
}

async function runSearch(forceAll = false): Promise<void> {
  const query = forceAll ? "all" : queryInput.value.trim();
  if (!query) {
    statusEl.textContent = t("enterQuery");
    return;
  }

  searchBtn.disabled = true;
  allBtn.disabled = true;
  statusEl.textContent = t("searching");

  try {
    if (!forceAll) {
      pushSearchHistory(query);
      renderSearchHistory();
    }
    const response = await window.cmdfindDesktop.search({
      query,
      language: langSelect.value as "de" | "en" | "auto",
      platform: platformSelect.value as "windows" | "linux" | "macos" | "auto",
      shell: shellSelect.value as "powershell" | "bash" | "zsh" | "auto",
      limit: Number(limitInput.value) || 20,
      useCurrentContext: currentContextCheckbox.checked,
      refreshIndex: refreshCheckbox.checked,
      disableLocalIndex: disableLocalCheckbox.checked
    });
    render(response);
  } catch (error) {
    statusEl.textContent = `Error: ${String(error)}`;
  } finally {
    searchBtn.disabled = false;
    allBtn.disabled = false;
  }
}

searchBtn.addEventListener("click", () => {
  void runSearch(false);
});

allBtn.addEventListener("click", () => {
  currentContextCheckbox.checked = false;
  void runSearch(true);
});

favoritesBtn.addEventListener("click", () => {
  const favorites = readFavorites().sort((a, b) => b.savedAt - a.savedAt);
  renderEntries(
    favorites.map((item) => item.entry),
    currentUiLanguage,
    t("favoritesTitle")
  );
  if (!favorites.length) {
    statusEl.textContent = t("favoritesEmpty");
  }
});

exportFavoritesBtn.addEventListener("click", () => {
  const favorites = readFavorites().sort((a, b) => b.savedAt - a.savedAt);
  if (!favorites.length) {
    statusEl.textContent = t("favoritesExportEmpty");
    return;
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    count: favorites.length,
    items: favorites
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cmdfind-favorites-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  statusEl.textContent = `${t("favoritesExported")} ${favorites.length}`;
});

updateCheckBtn.addEventListener("click", async () => {
  updateCheckBtn.disabled = true;
  await window.cmdfindDesktop.updateCheck();
  updateCheckBtn.disabled = false;
});

updateDownloadBtn.addEventListener("click", async () => {
  updateDownloadBtn.disabled = true;
  await window.cmdfindDesktop.updateDownload();
  updateDownloadBtn.disabled = false;
});

updateInstallBtn.addEventListener("click", async () => {
  updateInstallBtn.disabled = true;
  await window.cmdfindDesktop.updateInstall();
});

queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    void runSearch(false);
  }
});

searchHistoryList.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const btn = target.closest<HTMLButtonElement>(".history-chip");
  if (!btn) return;
  const q = btn.getAttribute("data-query");
  if (!q) return;
  queryInput.value = q;
  void runSearch(false);
});

historyClearBtn.addEventListener("click", () => {
  clearSearchHistory();
});

for (const field of quickSettingsFields) {
  field.addEventListener("keydown", (event) => {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveQuickSettingsFocus(target, "left");
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveQuickSettingsFocus(target, "right");
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveQuickSettingsFocus(target, "up");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveQuickSettingsFocus(target, "down");
    }
  });
}

saveLangBtn.addEventListener("click", async () => {
  const selected = langSelect.value as "de" | "en" | "auto";
  if (selected === "auto") {
    statusEl.textContent = t("saveLanguageNeedPick");
    return;
  }
  await window.cmdfindDesktop.setDefaultLanguage(selected);
  statusEl.textContent = `${t("saveLanguageSaved")} ${selected}`;
});

function setSettingsOpen(open: boolean): void {
  settingsPanel.hidden = !open;
  document.body.classList.toggle("settings-open", open);
  queueWrapScrollState();
}

settingsToggle.addEventListener("click", () => {
  setSettingsOpen(settingsPanel.hidden);
});

settingsClose.addEventListener("click", () => {
  setSettingsOpen(false);
});

document.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement | null;
  const inTextInput =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement;
  const incomingShortcut = eventToShortcut(event);
  if (incomingShortcut && incomingShortcut === currentSearchShortcut && target !== searchShortcutInput) {
    event.preventDefault();
    if (!inTextInput || target === queryInput) {
      setSettingsOpen(false);
      queryInput.focus();
      queryInput.select();
      statusEl.textContent = t("shortcutFocused");
      return;
    }
  }

  if (event.key === "Escape" && !terminalPanel.hidden) {
    setTerminalOpen(false);
    return;
  }
  if (event.key === "Escape") {
    setSettingsOpen(false);
  }
});

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (settingsPanel.hidden) return;
  if (target.closest("#settingsPanel") || target.closest("#settingsToggle")) return;
  setSettingsOpen(false);
});

function syncUiSettings(): void {
  const settings: UiSettings = {
    uiLanguage: uiLanguageSelect.value === "en" ? "en" : "de",
    searchShortcut: normalizeShortcut(searchShortcutInput.dataset.shortcut || currentSearchShortcut || getDefaultSearchShortcut()),
    theme: themeSelect.value as UiSettings["theme"],
    accent: accentColor.value,
    scale: Number(uiScale.value),
    radius: Number(radiusScale.value),
    terminalHeight: Number(terminalHeightRange.value),
    terminalFontSize: Number(terminalFontSizeRange.value)
  };
  applyUiSettings(settings);
  saveUiSettings(settings);
  if (settings.searchShortcut !== lastSyncedGlobalShortcut) {
    void window.cmdfindDesktop.setGlobalSearchShortcut(settings.searchShortcut).then((normalized) => {
      lastSyncedGlobalShortcut = normalized || settings.searchShortcut;
      if (normalized && normalized !== settings.searchShortcut) {
        setShortcutInput(normalized);
        setShortcutConflict(getReservedShortcutConflict(normalized));
        saveUiSettings({
          ...settings,
          searchShortcut: normalized
        });
      }
    });
  }
}

uiLanguageSelect.addEventListener("change", syncUiSettings);
themeSelect.addEventListener("change", syncUiSettings);
accentColor.addEventListener("input", syncUiSettings);
uiScale.addEventListener("input", syncUiSettings);
radiusScale.addEventListener("input", syncUiSettings);
terminalHeightRange.addEventListener("input", syncUiSettings);
terminalFontSizeRange.addEventListener("input", syncUiSettings);

searchShortcutInput.addEventListener("focus", () => {
  searchShortcutInput.select();
});

searchShortcutInput.addEventListener("keydown", (event) => {
  event.preventDefault();
  const captured = eventToShortcut(event);
  if (!captured) return;
  const conflict = getReservedShortcutConflict(captured);
  if (conflict) {
    setShortcutConflict(conflict);
    return;
  }
  setShortcutConflict(null);
  setShortcutInput(captured);
  syncUiSettings();
});

searchShortcutReset.addEventListener("click", () => {
  setShortcutConflict(null);
  setShortcutInput(getDefaultSearchShortcut());
  syncUiSettings();
});

function appendTerminalOutput(chunk: string): void {
  const normalized = chunk
    .replace(/\u001b\][^\u0007]*(\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-Z\\-_]/g, "")
    .replace(/[\uE000-\uF8FF\uFFFD]/g, "");

  for (const ch of normalized) {
    if (ch === "\r") {
      terminalCursorCol = 0;
      continue;
    }

    if (ch === "\n") {
      terminalRows.push("");
      terminalCursorCol = 0;
      continue;
    }

    if (ch === "\b") {
      if (terminalCursorCol > 0) {
        const rowIdx = terminalRows.length - 1;
        const row = terminalRows[rowIdx] || "";
        const nextCursor = terminalCursorCol - 1;
        terminalRows[rowIdx] = `${row.slice(0, nextCursor)}${row.slice(terminalCursorCol)}`;
        terminalCursorCol = nextCursor;
      }
      continue;
    }

    if (ch === "\u0007") {
      continue;
    }

    const code = ch.charCodeAt(0);
    if (code < 32 && ch !== "\t") {
      continue;
    }

    const rowIdx = terminalRows.length - 1;
    const row = terminalRows[rowIdx] || "";
    if (terminalCursorCol >= row.length) {
      const pad = terminalCursorCol > row.length ? " ".repeat(terminalCursorCol - row.length) : "";
      terminalRows[rowIdx] = `${row}${pad}${ch}`;
    } else {
      terminalRows[rowIdx] = `${row.slice(0, terminalCursorCol)}${ch}${row.slice(terminalCursorCol + 1)}`;
    }
    terminalCursorCol += 1;
  }

  if (terminalRows.length > 2200) {
    terminalRows = terminalRows.slice(-1800);
  }

  const plainOutput = terminalRows.join("\n");
  const withMarkup = escapeHtml(plainOutput)
    .replace(/(\[CMDFIND\][^\n]*)/g, '<span class="term-line-badge">$1</span>')
    .replace(/(^|\n)([^\n]*[%$#]\s)([^\n]*)/g, '$1<span class="term-prompt">$2</span><span class="term-command">$3</span>')
    .replace(/\b(error|failed|not found|permission denied|denied)\b/gi, '<span class="term-error">$1</span>')
    .replace(/\b(warn|warning)\b/gi, '<span class="term-warn">$1</span>')
    .replace(/\b(success|done|completed|ready)\b/gi, '<span class="term-ok">$1</span>');

  terminalOutput.innerHTML = withMarkup;
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  updateTerminalCurrentDirHintFromOutput(plainOutput);
}

function clearTerminalDisplay(): void {
  terminalRows = [""];
  terminalCursorCol = 0;
  terminalOutput.textContent = "";
}

function getTerminalSizeEstimate(): { cols: number; rows: number } {
  const width = terminalOutput.clientWidth || 880;
  const height = terminalOutput.clientHeight || 220;
  return {
    cols: Math.max(60, Math.floor(width / 8.4)),
    rows: Math.max(10, Math.floor(height / 19))
  };
}

function closeTerminalSuggestions(): void {
  terminalSuggestions = [];
  terminalSuggestionIndex = -1;
  pendingInlineSuggestion = null;
  renderInlineHint();
  terminalSuggest.hidden = true;
  terminalSuggest.innerHTML = "";
}

function applyTerminalSuggestion(command: string): void {
  terminalInput.value = command;
  terminalInput.focus();
  terminalInput.setSelectionRange(command.length, command.length);
  closeTerminalSuggestions();
}

function renderTerminalSuggestions(): void {
  if (!terminalSuggestions.length) {
    closeTerminalSuggestions();
    return;
  }

  if (terminalSuggestionIndex < 0 || terminalSuggestionIndex >= terminalSuggestions.length) {
    terminalSuggestionIndex = 0;
  }

  terminalSuggest.innerHTML = terminalSuggestions
    .map((cmd, index) => {
      const activeClass = index === terminalSuggestionIndex ? " is-active" : "";
      return `<button type="button" tabindex="-1" class="terminal-suggest-item${activeClass}" data-cmd="${escapeHtml(
        cmd
      )}">${escapeHtml(
        cmd
      )}</button>`;
    })
    .join("");
  terminalSuggest.hidden = false;
}

async function updateTerminalSuggestions(prefixRaw: string): Promise<void> {
  const requestId = ++terminalSuggestionRequestId;
  const raw = prefixRaw;
  const prefix = raw.trim();
  const cdMatch = raw.match(/^cd(?:\s+(.+))?$/);
  if (!prefix && !cdMatch) {
    closeTerminalSuggestions();
    return;
  }

  if (cdMatch) {
    const cdArgRaw = cdMatch[1] ?? "";
    try {
      const dirEntries = await window.cmdfindDesktop.listDirectories({
        cwdHint: terminalCurrentDirHint,
        inputPath: cdArgRaw,
        limit: 12,
        onlyDirectories: false
      });
      if (requestId !== terminalSuggestionRequestId) {
        return;
      }
      const cdSuggestions = dirEntries.map((entry) => `cd ${entry.value}`).sort((a, b) => a.localeCompare(b));
      const current = raw.trimEnd();
      const best = cdSuggestions[0];

      // Show real filesystem suggestions for cd and allow accept via Tab.
      pendingInlineSuggestion = null;
      if (best && best.toLowerCase().startsWith(current.toLowerCase()) && best.length > current.length) {
        pendingInlineSuggestion = best;
      }
      renderInlineHint();
      terminalSuggestions = cdSuggestions.slice(0, 8);
      terminalSuggestionIndex = terminalSuggestions.length ? 0 : -1;
      renderTerminalSuggestions();
      return;
    } catch {
      // fall through to regular command suggestions
    }
  }

  const historyMatches = Array.from(
    new Set(
      [...terminalHistory]
        .reverse()
        .filter((cmd) => cmd.toLowerCase().startsWith(prefix.toLowerCase()))
        .slice(0, 10)
    )
  );

  let searchMatches: string[] = [];
  try {
    const response = await window.cmdfindDesktop.search({
      query: prefix,
      limit: 12,
      useCurrentContext: false
    });
    if (requestId !== terminalSuggestionRequestId) {
      return;
    }
    searchMatches = Array.from(
      new Set(
        response.results
          .map((item) => item.entry.command.trim())
          .filter((cmd) => cmd.length > 0)
          .filter((cmd) => cmd.toLowerCase().startsWith(prefix.toLowerCase()))
      )
    );
  } catch {
    // ignore, history suggestions still work
  }

  const combined = Array.from(new Set([...historyMatches, ...searchMatches])).slice(0, 8);
  if (requestId !== terminalSuggestionRequestId) {
    return;
  }
  pendingInlineSuggestion = null;
  if (combined.length === 1) {
    const only = combined[0]!;
    if (only.toLowerCase().startsWith(prefix.toLowerCase()) && only.length > prefix.length) {
      pendingInlineSuggestion = only;
    }
  }
  renderInlineHint();

  terminalSuggestions = combined;
  terminalSuggestionIndex = combined.length ? 0 : -1;
  renderTerminalSuggestions();
}

function setTerminalOpen(open: boolean): void {
  terminalPanel.hidden = !open;
  if (open) {
    document.body.dataset.terminalMode = "focus";
  } else {
    delete document.body.dataset.terminalMode;
  }
  if (open) {
    terminalInput.focus();
  } else {
    closeTerminalSuggestions();
  }
}

// Keep typing focus in the command field; the run button stays mouse-clickable.
terminalRun.tabIndex = -1;
terminalClear.tabIndex = -1;
terminalStop.tabIndex = -1;

terminalInput.addEventListener("focus", () => {
  terminalInputHadFocus = true;
});

terminalInput.addEventListener("blur", () => {
  if (!terminalPanel.hidden) {
    window.setTimeout(() => {
      if (
        terminalInputHadFocus &&
        (document.activeElement === terminalRun ||
          document.activeElement === terminalClear ||
          document.activeElement === terminalStop)
      ) {
        terminalInput.focus();
      }
    }, 0);
  }
});

terminalToggle.addEventListener("click", async () => {
  const opening = terminalPanel.hidden;
  setTerminalOpen(opening);
  if (!opening || terminalStarted) {
    return;
  }

  const started = await window.cmdfindDesktop.terminalStart();
  terminalStarted = started;
  if (!started) {
    appendTerminalOutput("[terminal could not start]\n");
    return;
  }
  const size = getTerminalSizeEstimate();
  await window.cmdfindDesktop.terminalResize(size.cols, size.rows);
});

terminalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const command = terminalInput.value.trim();
  if (!command) return;

  if (!terminalStarted) {
    const started = await window.cmdfindDesktop.terminalStart();
    terminalStarted = started;
    if (!started) {
      appendTerminalOutput("[terminal could not start]\n");
      return;
    }
  }

  if (command.toLowerCase() === "clear") {
    clearTerminalDisplay();
    closeTerminalSuggestions();
    terminalInput.value = "";
    await window.cmdfindDesktop.terminalInput("\n");
    return;
  }

  await window.cmdfindDesktop.terminalInput(`${command}\n`);
  terminalHistory.push(command);
  terminalHistoryIndex = terminalHistory.length;
  terminalInput.value = "";
  closeTerminalSuggestions();
  terminalInput.focus();
});

terminalInput.addEventListener("keydown", async (event) => {
  if (event.key === "Backspace" && event.metaKey) {
    event.preventDefault();
    terminalInput.value = "";
    closeTerminalSuggestions();
    suppressInlineAutocompleteOnce = true;
    return;
  }

  if ((event.key === "Backspace" || event.key === "Delete") && !event.metaKey) {
    suppressInlineAutocompleteOnce = true;
  } else if (event.key.length === 1 || event.key === "Tab") {
    suppressInlineAutocompleteOnce = false;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    await updateTerminalSuggestions(terminalInput.value);
    if (pendingInlineSuggestion) {
      applyTerminalSuggestion(pendingInlineSuggestion);
      return;
    }
    if (!terminalSuggestions.length) return;
    const chosen = terminalSuggestions[Math.max(0, terminalSuggestionIndex)];
    if (chosen) {
      applyTerminalSuggestion(chosen);
    }
    return;
  }

  if (event.key === "ArrowUp") {
    if (terminalSuggestions.length) {
      event.preventDefault();
      terminalSuggestionIndex = Math.max(0, terminalSuggestionIndex - 1);
      renderTerminalSuggestions();
      return;
    }
    event.preventDefault();
    if (!terminalHistory.length) return;
    terminalHistoryIndex = Math.max(0, terminalHistoryIndex - 1);
    terminalInput.value = terminalHistory[terminalHistoryIndex] || "";
    terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
    return;
  }

  if (event.key === "ArrowDown") {
    if (terminalSuggestions.length) {
      event.preventDefault();
      terminalSuggestionIndex = Math.min(terminalSuggestions.length - 1, terminalSuggestionIndex + 1);
      renderTerminalSuggestions();
      return;
    }
    event.preventDefault();
    if (!terminalHistory.length) return;
    terminalHistoryIndex = Math.min(terminalHistory.length, terminalHistoryIndex + 1);
    terminalInput.value = terminalHistory[terminalHistoryIndex] || "";
    terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
    return;
  }

  if (event.key === "Enter" && event.shiftKey && terminalSuggestions.length && terminalSuggestionIndex >= 0) {
    event.preventDefault();
    const chosen = terminalSuggestions[terminalSuggestionIndex];
    if (chosen) {
      applyTerminalSuggestion(chosen);
    }
    return;
  }

  if (event.key === "Escape") {
    closeTerminalSuggestions();
    return;
  }

  if (event.key.toLowerCase() === "c" && event.ctrlKey) {
    event.preventDefault();
    if (!terminalStarted) return;
    await window.cmdfindDesktop.terminalInput("\u0003");
  }
});

terminalInput.addEventListener("input", () => {
  const value = terminalInput.value;
  if (/^cd(?:\s+.*)?$/i.test(value)) {
    if (terminalSuggestTimer) {
      window.clearTimeout(terminalSuggestTimer);
    }
    suppressInlineAutocompleteOnce = false;
    void updateTerminalSuggestions(value);
    return;
  }

  if (terminalSuggestTimer) {
    window.clearTimeout(terminalSuggestTimer);
  }
  terminalSuggestTimer = window.setTimeout(() => {
    suppressInlineAutocompleteOnce = false;
    void updateTerminalSuggestions(terminalInput.value);
  }, 120);
});

terminalSuggest.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const btn = target.closest<HTMLButtonElement>(".terminal-suggest-item");
  if (!btn) return;
  const cmd = btn.getAttribute("data-cmd");
  if (!cmd) return;
  applyTerminalSuggestion(cmd);
});

terminalClear.addEventListener("click", () => {
  clearTerminalDisplay();
});

terminalStop.addEventListener("click", async () => {
  await window.cmdfindDesktop.terminalStop();
  terminalStarted = false;
  appendTerminalOutput("[terminal stopped]\n");
});

window.addEventListener("resize", () => {
  if (!terminalStarted) return;
  const size = getTerminalSizeEstimate();
  void window.cmdfindDesktop.terminalResize(size.cols, size.rows);
});

resultsEl.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (target.classList.contains("run-btn")) {
    const cmd = target.getAttribute("data-run-cmd");
    if (!cmd) return;
    void runCommandInTerminal(cmd);
    return;
  }

  if (target.classList.contains("copy-btn")) {
    const cmd = target.getAttribute("data-cmd");
    if (!cmd) return;
    void copyCommand(cmd);
    return;
  }

  if (target.classList.contains("favorite-btn")) {
    const key = target.getAttribute("data-fav-key");
    if (!key) return;
    const found = renderedEntriesByKey.get(key);
    if (!found) return;
    const state = toggleFavorite(found);
    target.textContent = state.active ? "★" : "☆";
    statusEl.textContent = state.active ? t("favoriteAdd") : t("favoriteRemove");
  }
});

void window.cmdfindDesktop.getDefaultLanguage().then((lang) => {
  if (lang) {
    langSelect.value = lang;
  }
});

void window.cmdfindDesktop.getGlobalSearchShortcut().then((shortcut) => {
  if (!shortcut) return;
  lastSyncedGlobalShortcut = shortcut;
  const settings = readUiSettings();
  if (settings.searchShortcut === shortcut) return;
  const merged = { ...settings, searchShortcut: shortcut };
  applyUiSettings(merged);
  saveUiSettings(merged);
});

applyUiSettings(readUiSettings());
renderSearchHistory();
queueWrapScrollState();
window.addEventListener("resize", queueWrapScrollState);
new MutationObserver(() => queueWrapScrollState()).observe(wrapEl, {
  childList: true,
  subtree: true,
  attributes: true
});
window.cmdfindDesktop.onTerminalOutput((chunk) => {
  appendTerminalOutput(chunk);
});
window.cmdfindDesktop.onUpdateState((state) => {
  renderUpdateState(state);
});
window.cmdfindDesktop.onQuickFocus(() => {
  setSettingsOpen(false);
  queryInput.focus();
  queryInput.select();
});
void window.cmdfindDesktop.updateGetState().then((state) => {
  renderUpdateState(state);
});
