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
      getMenuBarEnabled: () => Promise<boolean>;
      setMenuBarEnabled: (enabled: boolean) => Promise<boolean>;
      getBackgroundModeEnabled: () => Promise<boolean>;
      setBackgroundModeEnabled: (enabled: boolean) => Promise<boolean>;
      updateGetState: () => Promise<UpdateState>;
      updateCheck: () => Promise<boolean>;
      updateDownload: () => Promise<boolean>;
      updateInstall: () => Promise<boolean>;
      terminalStart: (sessionId?: number) => Promise<boolean>;
      terminalInput: (input: string, sessionId?: number) => Promise<boolean>;
      terminalResize: (cols: number, rows: number, sessionId?: number) => Promise<boolean>;
      terminalStop: (sessionId?: number) => Promise<boolean>;
      listDirectories: (request: {
        cwdHint?: string;
        inputPath?: string;
        limit?: number;
        onlyDirectories?: boolean;
      }) => Promise<
        Array<{ value: string; label: string }>
      >;
      onTerminalOutput: (callback: (sessionId: number, chunk: string) => void) => () => void;
      onUpdateState: (callback: (state: UpdateState) => void) => () => void;
      onQuickFocus: (callback: () => void) => () => void;
      onQuickPrefill: (callback: (value: string) => void) => () => void;
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
const safetyEnabledCheckbox = document.querySelector<HTMLInputElement>("#safetyEnabled")!;
const safetyModeSelect = document.querySelector<HTMLSelectElement>("#safetyMode")!;
const updateCheckBtn = document.querySelector<HTMLButtonElement>("#updateCheckBtn")!;
const updateDownloadBtn = document.querySelector<HTMLButtonElement>("#updateDownloadBtn")!;
const updateInstallBtn = document.querySelector<HTMLButtonElement>("#updateInstallBtn")!;
const updateStatusEl = document.querySelector<HTMLDivElement>("#updateStatus")!;
const menuBarEnabledCheckbox = document.querySelector<HTMLInputElement>("#menuBarEnabled")!;
const menuBarLabel = document.querySelector<HTMLElement>("#menuBarLabel")!;
const backgroundModeEnabledCheckbox = document.querySelector<HTMLInputElement>("#backgroundModeEnabled")!;
const backgroundModeLabel = document.querySelector<HTMLElement>("#backgroundModeLabel")!;
const settingsPanel = document.querySelector<HTMLElement>("#settingsPanel")!;
const settingsClose = document.querySelector<HTMLButtonElement>("#settingsClose")!;
const uiLanguageSelect = document.querySelector<HTMLSelectElement>("#uiLanguage")!;
const readmeTitle = document.querySelector<HTMLElement>("#readmeTitle")!;
const readmeToggleBtn = document.querySelector<HTMLButtonElement>("#readmeToggleBtn")!;
const readmeContent = document.querySelector<HTMLElement>("#readmeContent")!;
const welcomeOverlay = document.querySelector<HTMLElement>("#welcomeOverlay")!;
const welcomeTitle = document.querySelector<HTMLElement>("#welcomeTitle")!;
const welcomeSubtitle = document.querySelector<HTMLElement>("#welcomeSubtitle")!;
const welcomeContent = document.querySelector<HTMLElement>("#welcomeContent")!;
const welcomeStartBtn = document.querySelector<HTMLButtonElement>("#welcomeStartBtn")!;
const themeSelect = document.querySelector<HTMLSelectElement>("#themeSelect")!;
const backgroundPresetSelect = document.querySelector<HTMLSelectElement>("#backgroundPreset")!;
const uiFontPresetSelect = document.querySelector<HTMLSelectElement>("#uiFontPreset")!;
const terminalFontPresetSelect = document.querySelector<HTMLSelectElement>("#terminalFontPreset")!;
const renderingModeSelect = document.querySelector<HTMLSelectElement>("#renderingMode")!;
const accentColor = document.querySelector<HTMLInputElement>("#accentColor")!;
const uiScale = document.querySelector<HTMLInputElement>("#uiScale")!;
const radiusScale = document.querySelector<HTMLInputElement>("#radiusScale")!;
const terminalHeightRange = document.querySelector<HTMLInputElement>("#terminalHeight")!;
const terminalFontSizeRange = document.querySelector<HTMLInputElement>("#terminalFontSize")!;
const terminalThemePresetSelect = document.querySelector<HTMLSelectElement>("#terminalThemePreset")!;
const terminalToggle = document.querySelector<HTMLButtonElement>("#terminalToggle")!;
const terminalPanel = document.querySelector<HTMLElement>("#terminalPanel")!;
const terminalHead = document.querySelector<HTMLElement>(".terminal-head")!;
const terminalTabs = document.querySelector<HTMLDivElement>("#terminalTabs")!;
const terminalAddTab = document.querySelector<HTMLButtonElement>("#terminalAddTab")!;
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
  safetyLayerEnabled: boolean;
  safetyLayerMode: "confirm-dangerous" | "confirm-careful" | "block-dangerous";
  theme: "midnight" | "slate" | "graphite" | "sunset" | "emerald" | "amber" | "cyber" | "rose";
  backgroundPreset: "aurora" | "deep" | "slate" | "sunset" | "pitch";
  uiFontPreset: "jetbrains" | "inter" | "sf" | "fira";
  terminalFontPreset: "jetbrains" | "cascadia" | "menlo" | "fira";
  renderingMode: "balanced" | "smooth" | "sharp";
  terminalThemePreset: "classic" | "matrix" | "sunset" | "ice" | "mono";
  accent: string;
  scale: number;
  radius: number;
  terminalHeight: number;
  terminalFontSize: number;
  menuBarEnabled: boolean;
  backgroundModeEnabled: boolean;
};

type FavoriteItem = {
  entry: DesktopSearchResponse["results"][number]["entry"];
  savedAt: number;
};

const uiSettingsKey = "cmdfind:desktop:ui-settings";
const favoritesKey = "cmdfind:desktop:favorites";
const searchHistoryKey = "cmdfind:desktop:search-history";
const onboardingSeenKey = "cmdfind:desktop:onboarding-seen-v1";
const supportedThemes: UiSettings["theme"][] = ["midnight", "slate", "graphite", "sunset", "emerald", "amber", "cyber", "rose"];
const supportedBackgroundPresets: UiSettings["backgroundPreset"][] = ["aurora", "deep", "slate", "sunset", "pitch"];
const supportedUiFontPresets: UiSettings["uiFontPreset"][] = ["jetbrains", "inter", "sf", "fira"];
const supportedTerminalFontPresets: UiSettings["terminalFontPreset"][] = ["jetbrains", "cascadia", "menlo", "fira"];
const supportedRenderingModes: UiSettings["renderingMode"][] = ["balanced", "smooth", "sharp"];
const supportedTerminalThemes: UiSettings["terminalThemePreset"][] = ["classic", "matrix", "sunset", "ice", "mono"];
const supportedSafetyModes: UiSettings["safetyLayerMode"][] = ["confirm-dangerous", "confirm-careful", "block-dangerous"];
let currentUiLanguage: "de" | "en" = "de";
let currentSearchShortcut = "";
let lastSyncedGlobalShortcut = "";
let readmeExpanded = false;
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
    safetyTitle: "Safety Layer",
    safetyEnabledLabel: "Riskante Befehle vor Ausführung bestätigen",
    safetyModeLabel: "Safety-Modus",
    safetyModeConfirmDangerous: "Nur gefährliche Befehle bestätigen",
    safetyModeConfirmCareful: "Auch vorsichtige Befehle bestätigen",
    safetyModeBlockDangerous: "Gefährliche Befehle blockieren",
    safetyBlockedDangerous: "Safety Layer hat einen gefährlichen Befehl blockiert:",
    safetyCanceled: "Befehlsausführung durch Safety Layer abgebrochen.",
    safetyReasonCatalogDangerous: "Befehl ist im Index als gefährlich markiert.",
    safetyReasonCatalogCareful: "Befehl ist im Index als vorsichtig markiert.",
    safetyReasonDelete: "Kann Dateien oder Verzeichnisse löschen.",
    safetyReasonPrivilege: "Benötigt erhöhte Rechte (sudo/admin).",
    safetyReasonSystem: "Kann das System herunterfahren/neustarten oder tief ändern.",
    safetyReasonDisk: "Kann Datenträger/Dateisysteme überschreiben oder formatieren.",
    safetyReasonProcess: "Kann laufende Prozesse hart beenden.",
    safetyConfirmDangerousTitle: "Gefährlicher Befehl erkannt",
    safetyConfirmCarefulTitle: "Vorsicht bei diesem Befehl",
    safetyConfirmQuestion: "Trotzdem ausführen?",
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
    backgroundPresetLabel: "Hintergrund-Modus",
    backgroundPresetAurora: "Aurora",
    backgroundPresetDeep: "Deep Space",
    backgroundPresetSlate: "Slate Mist",
    backgroundPresetSunset: "Sunset Glow",
    backgroundPresetPitch: "Pitch Black",
    uiFontPresetLabel: "UI-Schriftart",
    uiFontPresetJetBrains: "JetBrains Mono",
    uiFontPresetInter: "Inter",
    uiFontPresetSF: "SF Pro",
    uiFontPresetFira: "Fira Code",
    terminalFontPresetLabel: "Terminal-Schrift",
    terminalFontPresetJetBrains: "JetBrains Mono",
    terminalFontPresetCascadia: "Cascadia Mono",
    terminalFontPresetMenlo: "Menlo",
    terminalFontPresetFira: "Fira Code",
    renderingModeLabel: "Rendering",
    renderingModeBalanced: "Ausgewogen",
    renderingModeSmooth: "Glatt",
    renderingModeSharp: "Scharf",
    chipDark: "Dunkel",
    chipContrast: "Hoher Kontrast",
    accentLabel: "Akzentfarbe",
    uiScaleLabel: "App- & Schriftgröße",
    radiusLabel: "Rundungen",
    terminalHeightLabel: "Terminal-Höhe",
    terminalFontLabel: "Terminal-Schriftgröße",
    terminalThemePresetLabel: "Terminal-Theme",
    terminalThemePresetClassic: "Classic Night",
    terminalThemePresetMatrix: "Matrix Green",
    terminalThemePresetSunset: "Sunset Ops",
    terminalThemePresetIce: "Ice Blue",
    terminalThemePresetMono: "Mono Contrast",
    systemTitle: "System",
    menuBarLabel: "Menüleisten-Icon (macOS)",
    backgroundModeLabel: "Im Hintergrund weiterlaufen (Shortcut aktiv)",
    updatesLabel: "Updates",
    readmeTitle: "Tutorial: So nutzt du cmdfind",
    readmeToggleShow: "Tutorial anzeigen",
    readmeToggleHide: "Tutorial ausblenden",
    welcomeTitle: "Willkommen bei cmdfind",
    welcomeSubtitle: "Schnellstart für den ersten Start",
    welcomeStart: "Los geht's",
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
    safetyTitle: "Safety Layer",
    safetyEnabledLabel: "Confirm risky commands before execution",
    safetyModeLabel: "Safety mode",
    safetyModeConfirmDangerous: "Confirm dangerous commands only",
    safetyModeConfirmCareful: "Also confirm careful commands",
    safetyModeBlockDangerous: "Block dangerous commands",
    safetyBlockedDangerous: "Safety layer blocked a dangerous command:",
    safetyCanceled: "Command execution canceled by safety layer.",
    safetyReasonCatalogDangerous: "Command is marked dangerous in the index.",
    safetyReasonCatalogCareful: "Command is marked careful in the index.",
    safetyReasonDelete: "May delete files or directories.",
    safetyReasonPrivilege: "Requires elevated privileges (sudo/admin).",
    safetyReasonSystem: "May shut down/reboot or deeply alter the system.",
    safetyReasonDisk: "May overwrite or format disks/filesystems.",
    safetyReasonProcess: "May forcefully terminate running processes.",
    safetyConfirmDangerousTitle: "Dangerous command detected",
    safetyConfirmCarefulTitle: "Be careful with this command",
    safetyConfirmQuestion: "Run anyway?",
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
    backgroundPresetLabel: "Background mode",
    backgroundPresetAurora: "Aurora",
    backgroundPresetDeep: "Deep Space",
    backgroundPresetSlate: "Slate Mist",
    backgroundPresetSunset: "Sunset Glow",
    backgroundPresetPitch: "Pitch Black",
    uiFontPresetLabel: "UI font",
    uiFontPresetJetBrains: "JetBrains Mono",
    uiFontPresetInter: "Inter",
    uiFontPresetSF: "SF Pro",
    uiFontPresetFira: "Fira Code",
    terminalFontPresetLabel: "Terminal font",
    terminalFontPresetJetBrains: "JetBrains Mono",
    terminalFontPresetCascadia: "Cascadia Mono",
    terminalFontPresetMenlo: "Menlo",
    terminalFontPresetFira: "Fira Code",
    renderingModeLabel: "Rendering",
    renderingModeBalanced: "Balanced",
    renderingModeSmooth: "Smooth",
    renderingModeSharp: "Sharp",
    chipDark: "Dark",
    chipContrast: "High Contrast",
    accentLabel: "Accent color",
    uiScaleLabel: "App & font size",
    radiusLabel: "Radius",
    terminalHeightLabel: "Terminal height",
    terminalFontLabel: "Terminal font size",
    terminalThemePresetLabel: "Terminal theme",
    terminalThemePresetClassic: "Classic Night",
    terminalThemePresetMatrix: "Matrix Green",
    terminalThemePresetSunset: "Sunset Ops",
    terminalThemePresetIce: "Ice Blue",
    terminalThemePresetMono: "Mono Contrast",
    systemTitle: "System",
    menuBarLabel: "Menu bar icon (macOS)",
    backgroundModeLabel: "Run in background (shortcut stays active)",
    updatesLabel: "Updates",
    readmeTitle: "Tutorial: How to use cmdfind",
    readmeToggleShow: "Show tutorial",
    readmeToggleHide: "Hide tutorial",
    welcomeTitle: "Welcome to cmdfind",
    welcomeSubtitle: "Quick start for your first launch",
    welcomeStart: "Let's start",
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
    if (low === "commandorcontrol" || low === "cmdorctrl") {
      normalized.add(isMacPlatform() ? "Meta" : "Control");
    } else if (low === "cmd" || low === "command" || low === "meta") normalized.add("Meta");
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
      if (part === "CommandOrControl") return isMacPlatform() ? "Cmd" : "Strg";
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

function getWelcomeHtml(lang: "de" | "en"): string {
  if (lang === "de") {
    return `
      <p><strong>Schritt 1:</strong> Gib oben einen Suchbegriff ein, z. B. <code>ping</code>, <code>nmap</code> oder <code>Datei löschen</code>.</p>
      <p><strong>Schritt 2:</strong> Verfeinere mit Sprache, Plattform und Shell für präzisere Treffer.</p>
      <p><strong>Schritt 3:</strong> Klicke bei einem Treffer auf <em>Ausführen</em>, um ihn im integrierten Terminal zu starten.</p>
      <p><strong>Schritt 4:</strong> Speichere wichtige Befehle als Favoriten und exportiere sie bei Bedarf.</p>
      <p><strong>Tipp:</strong> In den Einstellungen kannst du Shortcut, Design, Updates und weitere Optionen anpassen.</p>
    `;
  }
  return `
    <p><strong>Step 1:</strong> Enter a search query, e.g. <code>ping</code>, <code>nmap</code>, or <code>delete file</code>.</p>
    <p><strong>Step 2:</strong> Refine results with language, platform, and shell for better matches.</p>
    <p><strong>Step 3:</strong> Click <em>Run</em> on any result to execute it in the integrated terminal.</p>
    <p><strong>Step 4:</strong> Save important commands as favorites and export them when needed.</p>
    <p><strong>Tip:</strong> In Settings you can adjust shortcut, theme, updates, and more.</p>
  `;
}

function setReadmeExpanded(expanded: boolean): void {
  readmeExpanded = expanded;
  readmeContent.hidden = !expanded;
  readmeToggleBtn.textContent = expanded ? t("readmeToggleHide") : t("readmeToggleShow");
  queueWrapScrollState();
}

function setWelcomeOpen(open: boolean): void {
  welcomeOverlay.hidden = !open;
  document.body.classList.toggle("welcome-open", open);
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
  (document.getElementById("safetyTitle") as HTMLElement | null)?.replaceChildren(t("safetyTitle"));
  (document.getElementById("safetyEnabledLabel") as HTMLElement | null)?.replaceChildren(t("safetyEnabledLabel"));
  (document.getElementById("safetyModeLabel") as HTMLElement | null)?.replaceChildren(t("safetyModeLabel"));
  (document.getElementById("safetyModeConfirmDangerous") as HTMLElement | null)?.replaceChildren(t("safetyModeConfirmDangerous"));
  (document.getElementById("safetyModeConfirmCareful") as HTMLElement | null)?.replaceChildren(t("safetyModeConfirmCareful"));
  (document.getElementById("safetyModeBlockDangerous") as HTMLElement | null)?.replaceChildren(t("safetyModeBlockDangerous"));
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
  (document.getElementById("backgroundPresetLabel") as HTMLElement | null)?.replaceChildren(t("backgroundPresetLabel"));
  (document.getElementById("backgroundPresetAurora") as HTMLElement | null)?.replaceChildren(t("backgroundPresetAurora"));
  (document.getElementById("backgroundPresetDeep") as HTMLElement | null)?.replaceChildren(t("backgroundPresetDeep"));
  (document.getElementById("backgroundPresetSlate") as HTMLElement | null)?.replaceChildren(t("backgroundPresetSlate"));
  (document.getElementById("backgroundPresetSunset") as HTMLElement | null)?.replaceChildren(t("backgroundPresetSunset"));
  (document.getElementById("backgroundPresetPitch") as HTMLElement | null)?.replaceChildren(t("backgroundPresetPitch"));
  (document.getElementById("uiFontPresetLabel") as HTMLElement | null)?.replaceChildren(t("uiFontPresetLabel"));
  (document.getElementById("uiFontPresetJetBrains") as HTMLElement | null)?.replaceChildren(t("uiFontPresetJetBrains"));
  (document.getElementById("uiFontPresetInter") as HTMLElement | null)?.replaceChildren(t("uiFontPresetInter"));
  (document.getElementById("uiFontPresetSF") as HTMLElement | null)?.replaceChildren(t("uiFontPresetSF"));
  (document.getElementById("uiFontPresetFira") as HTMLElement | null)?.replaceChildren(t("uiFontPresetFira"));
  (document.getElementById("terminalFontPresetLabel") as HTMLElement | null)?.replaceChildren(t("terminalFontPresetLabel"));
  (document.getElementById("terminalFontPresetJetBrains") as HTMLElement | null)?.replaceChildren(t("terminalFontPresetJetBrains"));
  (document.getElementById("terminalFontPresetCascadia") as HTMLElement | null)?.replaceChildren(t("terminalFontPresetCascadia"));
  (document.getElementById("terminalFontPresetMenlo") as HTMLElement | null)?.replaceChildren(t("terminalFontPresetMenlo"));
  (document.getElementById("terminalFontPresetFira") as HTMLElement | null)?.replaceChildren(t("terminalFontPresetFira"));
  (document.getElementById("renderingModeLabel") as HTMLElement | null)?.replaceChildren(t("renderingModeLabel"));
  (document.getElementById("renderingModeBalanced") as HTMLElement | null)?.replaceChildren(t("renderingModeBalanced"));
  (document.getElementById("renderingModeSmooth") as HTMLElement | null)?.replaceChildren(t("renderingModeSmooth"));
  (document.getElementById("renderingModeSharp") as HTMLElement | null)?.replaceChildren(t("renderingModeSharp"));
  (document.getElementById("chipDark") as HTMLElement | null)?.replaceChildren(t("chipDark"));
  (document.getElementById("chipContrast") as HTMLElement | null)?.replaceChildren(t("chipContrast"));
  (document.getElementById("accentLabel") as HTMLElement | null)?.replaceChildren(t("accentLabel"));
  (document.getElementById("uiScaleLabel") as HTMLElement | null)?.replaceChildren(t("uiScaleLabel"));
  (document.getElementById("radiusLabel") as HTMLElement | null)?.replaceChildren(t("radiusLabel"));
  (document.getElementById("terminalHeightLabel") as HTMLElement | null)?.replaceChildren(t("terminalHeightLabel"));
  (document.getElementById("terminalFontLabel") as HTMLElement | null)?.replaceChildren(t("terminalFontLabel"));
  (document.getElementById("terminalThemePresetLabel") as HTMLElement | null)?.replaceChildren(t("terminalThemePresetLabel"));
  (document.getElementById("terminalThemePresetClassic") as HTMLElement | null)?.replaceChildren(t("terminalThemePresetClassic"));
  (document.getElementById("terminalThemePresetMatrix") as HTMLElement | null)?.replaceChildren(t("terminalThemePresetMatrix"));
  (document.getElementById("terminalThemePresetSunset") as HTMLElement | null)?.replaceChildren(t("terminalThemePresetSunset"));
  (document.getElementById("terminalThemePresetIce") as HTMLElement | null)?.replaceChildren(t("terminalThemePresetIce"));
  (document.getElementById("terminalThemePresetMono") as HTMLElement | null)?.replaceChildren(t("terminalThemePresetMono"));
  (document.getElementById("systemTitle") as HTMLElement | null)?.replaceChildren(t("systemTitle"));
  menuBarLabel.replaceChildren(t("menuBarLabel"));
  backgroundModeLabel.replaceChildren(t("backgroundModeLabel"));
  (document.getElementById("updatesLabel") as HTMLElement | null)?.replaceChildren(t("updatesLabel"));
  readmeTitle.replaceChildren(t("readmeTitle"));
  readmeContent.innerHTML = getReadmeHtml(lang);
  readmeToggleBtn.textContent = readmeExpanded ? t("readmeToggleHide") : t("readmeToggleShow");
  welcomeTitle.replaceChildren(t("welcomeTitle"));
  welcomeSubtitle.replaceChildren(t("welcomeSubtitle"));
  welcomeContent.innerHTML = getWelcomeHtml(lang);
  welcomeStartBtn.textContent = t("welcomeStart");
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
let terminalSegment = 1;
let terminalScrollRaf = 0;
let terminalLayoutRaf = 0;
let cachedTerminalHeadHeight = 0;
let cachedTerminalFormHeight = 0;
let cachedTerminalInlineHintHeight = 0;
let terminalCurrentDirHint = "~";
let wrapScrollRaf = 0;

type TerminalTabSnapshot = {
  id: number;
  title: string;
  started: boolean;
  history: string[];
  historyIndex: number;
  rows: string[];
  cursorCol: number;
  suggestions: string[];
  suggestionIndex: number;
  segment: number;
  currentDirHint: string;
};

const terminalTabSnapshots = new Map<number, TerminalTabSnapshot>();
let activeTerminalTabId = 1;
let nextTerminalTabId = 2;

function createTerminalTabSnapshot(id: number): TerminalTabSnapshot {
  return {
    id,
    title: `Tab ${id}`,
    started: false,
    history: [],
    historyIndex: -1,
    rows: [""],
    cursorCol: 0,
    suggestions: [],
    suggestionIndex: -1,
    segment: 1,
    currentDirHint: "~"
  };
}

function getTerminalTabSnapshot(tabId = activeTerminalTabId): TerminalTabSnapshot {
  let found = terminalTabSnapshots.get(tabId);
  if (!found) {
    found = createTerminalTabSnapshot(tabId);
    terminalTabSnapshots.set(tabId, found);
  }
  return found;
}

function saveActiveTerminalTabSnapshot(): void {
  const current = getTerminalTabSnapshot(activeTerminalTabId);
  current.started = terminalStarted;
  current.history = [...terminalHistory];
  current.historyIndex = terminalHistoryIndex;
  current.rows = [...terminalRows];
  current.cursorCol = terminalCursorCol;
  current.suggestions = [...terminalSuggestions];
  current.suggestionIndex = terminalSuggestionIndex;
  current.segment = terminalSegment;
  current.currentDirHint = terminalCurrentDirHint;
}

function loadTerminalTabSnapshot(tabId: number): void {
  const next = getTerminalTabSnapshot(tabId);
  activeTerminalTabId = tabId;
  terminalStarted = next.started;
  terminalHistory.splice(0, terminalHistory.length, ...next.history);
  terminalHistoryIndex = next.historyIndex;
  terminalRows = [...next.rows];
  terminalCursorCol = next.cursorCol;
  terminalSuggestions = [...next.suggestions];
  terminalSuggestionIndex = next.suggestionIndex;
  terminalSegment = next.segment;
  terminalCurrentDirHint = next.currentDirHint || "~";
}

function renderTerminalTabs(): void {
  const ordered = [...terminalTabSnapshots.values()].sort((a, b) => a.id - b.id);
  terminalTabs.innerHTML = ordered
    .map((tab) => {
      const active = tab.id === activeTerminalTabId ? " is-active" : "";
      const canClose = ordered.length > 1;
      return `<button type="button" class="terminal-tab${active}" data-tab-id="${tab.id}">
        <span class="terminal-tab-label">${escapeHtml(tab.title)}</span>
        ${canClose ? `<span class="terminal-tab-close" data-tab-close="${tab.id}">×</span>` : ""}
      </button>`;
    })
    .join("");
}

type TerminalBufferPolicy = {
  hardLimit: number;
  keepRows: number;
  profile: "low" | "balanced" | "high";
};

function detectTerminalBufferPolicy(): TerminalBufferPolicy {
  const cores = Number(navigator.hardwareConcurrency || 4);
  const mem = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0);

  if (cores <= 4 || (mem > 0 && mem <= 4)) {
    return { hardLimit: 1400, keepRows: 1000, profile: "low" };
  }
  if (cores >= 10 || mem >= 12) {
    return { hardLimit: 4200, keepRows: 3400, profile: "high" };
  }
  return { hardLimit: 2600, keepRows: 2000, profile: "balanced" };
}

const terminalBufferPolicy = detectTerminalBufferPolicy();

function scrollTerminalToBottom(): void {
  if (terminalScrollRaf) {
    cancelAnimationFrame(terminalScrollRaf);
  }
  terminalScrollRaf = requestAnimationFrame(() => {
    terminalScrollRaf = 0;
    terminalOutput.scrollTo({ top: Number.MAX_SAFE_INTEGER, behavior: "auto" });
    // Some repaint cycles update height one tick later (long wrapped lines, heavy output).
    requestAnimationFrame(() => {
      terminalOutput.scrollTo({ top: Number.MAX_SAFE_INTEGER, behavior: "auto" });
    });
  });
}

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
    queueTerminalLayoutMetricsSync();
    return;
  }
  terminalInlineHint.textContent = `${t("suggestionPrefix")} ${pendingInlineSuggestion}  |  ${t("suggestionApply")}`;
  queueTerminalLayoutMetricsSync();
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

function syncTerminalLayoutMetrics(): void {
  const headHeight = Math.ceil(terminalHead.getBoundingClientRect().height || 42);
  const formHeight = Math.ceil(terminalForm.getBoundingClientRect().height || 74);
  const inlineHintHeight = Math.ceil(terminalInlineHint.getBoundingClientRect().height || 20);
  const root = document.documentElement;
  if (cachedTerminalHeadHeight !== headHeight) {
    root.style.setProperty("--terminal-head-height", `${headHeight}px`);
    cachedTerminalHeadHeight = headHeight;
  }
  if (cachedTerminalFormHeight !== formHeight) {
    root.style.setProperty("--terminal-form-height", `${formHeight}px`);
    cachedTerminalFormHeight = formHeight;
  }
  if (cachedTerminalInlineHintHeight !== inlineHintHeight) {
    root.style.setProperty("--terminal-inline-hint-height", `${inlineHintHeight}px`);
    cachedTerminalInlineHintHeight = inlineHintHeight;
  }
}

function queueTerminalLayoutMetricsSync(): void {
  if (terminalLayoutRaf) return;
  terminalLayoutRaf = window.requestAnimationFrame(() => {
    terminalLayoutRaf = 0;
    syncTerminalLayoutMetrics();
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

function applyTerminalThemePreset(preset: UiSettings["terminalThemePreset"]): void {
  const root = document.documentElement;
  const varsByPreset: Record<UiSettings["terminalThemePreset"], Record<string, string>> = {
    classic: {
      "--terminal-panel-border": "color-mix(in srgb, var(--primary) 30%, var(--line))",
      "--terminal-panel-glow": "color-mix(in srgb, var(--primary) 22%, transparent)",
      "--terminal-panel-bg-a": "rgba(16, 23, 44, 0.94)",
      "--terminal-panel-bg-b": "rgba(8, 12, 24, 0.97)",
      "--terminal-head-border": "color-mix(in srgb, var(--primary) 24%, var(--line))",
      "--terminal-head-bg-a": "rgba(22, 31, 58, 0.82)",
      "--terminal-head-bg-b": "rgba(14, 22, 43, 0.76)",
      "--terminal-output-fg": "#e8f1ff",
      "--terminal-output-glow": "rgba(108, 165, 255, 0.12)",
      "--terminal-output-bg-a": "rgba(6, 10, 22, 0.96)",
      "--terminal-output-bg-b": "rgba(5, 9, 20, 0.98)",
      "--terminal-prompt-color": "#8fc0ff",
      "--terminal-command-color": "#eaf3ff",
      "--terminal-error-color": "#ff8d9d",
      "--terminal-warn-color": "#ffd58b",
      "--terminal-ok-color": "#93efba",
      "--terminal-badge-color": "#b7cdff",
      "--terminal-sub-color": "#a9bbdf",
      "--terminal-form-border": "color-mix(in srgb, var(--primary) 24%, var(--line))",
      "--terminal-form-bg": "rgba(10, 16, 31, 0.82)",
      "--terminal-inline-hint-color": "#95a7cb",
      "--terminal-suggest-border": "color-mix(in srgb, var(--primary) 30%, var(--line))",
      "--terminal-suggest-bg": "rgba(11, 17, 33, 0.96)",
      "--terminal-suggest-item-bg": "rgba(100, 120, 160, 0.16)",
      "--terminal-suggest-item-border": "rgba(120, 146, 200, 0.22)",
      "--terminal-suggest-item-active-bg": "rgba(145, 168, 218, 0.32)",
      "--terminal-suggest-item-active-fg": "#f5f9ff"
    },
    matrix: {
      "--terminal-panel-border": "rgba(74, 185, 124, 0.42)",
      "--terminal-panel-glow": "rgba(74, 185, 124, 0.26)",
      "--terminal-panel-bg-a": "rgba(8, 23, 15, 0.94)",
      "--terminal-panel-bg-b": "rgba(4, 13, 8, 0.97)",
      "--terminal-head-border": "rgba(74, 185, 124, 0.32)",
      "--terminal-head-bg-a": "rgba(13, 33, 22, 0.9)",
      "--terminal-head-bg-b": "rgba(9, 22, 15, 0.84)",
      "--terminal-output-fg": "#dafbe8",
      "--terminal-output-glow": "rgba(74, 185, 124, 0.16)",
      "--terminal-output-bg-a": "rgba(3, 14, 7, 0.97)",
      "--terminal-output-bg-b": "rgba(2, 9, 4, 0.99)",
      "--terminal-prompt-color": "#7dffb1",
      "--terminal-command-color": "#e2ffef",
      "--terminal-error-color": "#ff8a99",
      "--terminal-warn-color": "#ffd178",
      "--terminal-ok-color": "#8ef5b2",
      "--terminal-badge-color": "#baf7d2",
      "--terminal-sub-color": "#8ed0ad",
      "--terminal-form-border": "rgba(74, 185, 124, 0.3)",
      "--terminal-form-bg": "rgba(7, 20, 12, 0.9)",
      "--terminal-inline-hint-color": "#7cbf9b",
      "--terminal-suggest-border": "rgba(74, 185, 124, 0.38)",
      "--terminal-suggest-bg": "rgba(7, 22, 13, 0.96)",
      "--terminal-suggest-item-bg": "rgba(74, 185, 124, 0.12)",
      "--terminal-suggest-item-border": "rgba(95, 206, 143, 0.24)",
      "--terminal-suggest-item-active-bg": "rgba(95, 206, 143, 0.26)",
      "--terminal-suggest-item-active-fg": "#eefff5"
    },
    sunset: {
      "--terminal-panel-border": "rgba(255, 146, 99, 0.44)",
      "--terminal-panel-glow": "rgba(255, 132, 86, 0.28)",
      "--terminal-panel-bg-a": "rgba(36, 20, 24, 0.94)",
      "--terminal-panel-bg-b": "rgba(16, 9, 13, 0.97)",
      "--terminal-head-border": "rgba(255, 146, 99, 0.3)",
      "--terminal-head-bg-a": "rgba(54, 28, 30, 0.88)",
      "--terminal-head-bg-b": "rgba(30, 17, 20, 0.82)",
      "--terminal-output-fg": "#ffe7df",
      "--terminal-output-glow": "rgba(255, 140, 92, 0.16)",
      "--terminal-output-bg-a": "rgba(22, 12, 17, 0.97)",
      "--terminal-output-bg-b": "rgba(12, 8, 13, 0.99)",
      "--terminal-prompt-color": "#ffb39a",
      "--terminal-command-color": "#fff1ed",
      "--terminal-error-color": "#ff8596",
      "--terminal-warn-color": "#ffd284",
      "--terminal-ok-color": "#92ecb7",
      "--terminal-badge-color": "#ffd1c4",
      "--terminal-sub-color": "#dfaf9e",
      "--terminal-form-border": "rgba(255, 146, 99, 0.3)",
      "--terminal-form-bg": "rgba(22, 11, 15, 0.9)",
      "--terminal-inline-hint-color": "#d0a090",
      "--terminal-suggest-border": "rgba(255, 146, 99, 0.38)",
      "--terminal-suggest-bg": "rgba(27, 14, 18, 0.96)",
      "--terminal-suggest-item-bg": "rgba(255, 146, 99, 0.12)",
      "--terminal-suggest-item-border": "rgba(255, 162, 120, 0.24)",
      "--terminal-suggest-item-active-bg": "rgba(255, 162, 120, 0.26)",
      "--terminal-suggest-item-active-fg": "#fff5f1"
    },
    ice: {
      "--terminal-panel-border": "rgba(127, 196, 255, 0.42)",
      "--terminal-panel-glow": "rgba(127, 196, 255, 0.26)",
      "--terminal-panel-bg-a": "rgba(16, 29, 43, 0.94)",
      "--terminal-panel-bg-b": "rgba(8, 15, 24, 0.97)",
      "--terminal-head-border": "rgba(127, 196, 255, 0.3)",
      "--terminal-head-bg-a": "rgba(24, 38, 56, 0.88)",
      "--terminal-head-bg-b": "rgba(15, 25, 38, 0.82)",
      "--terminal-output-fg": "#ecf8ff",
      "--terminal-output-glow": "rgba(127, 196, 255, 0.18)",
      "--terminal-output-bg-a": "rgba(8, 18, 30, 0.97)",
      "--terminal-output-bg-b": "rgba(4, 10, 18, 0.99)",
      "--terminal-prompt-color": "#9bd7ff",
      "--terminal-command-color": "#f2fbff",
      "--terminal-error-color": "#ff9aac",
      "--terminal-warn-color": "#ffe199",
      "--terminal-ok-color": "#a4f2d0",
      "--terminal-badge-color": "#c5e8ff",
      "--terminal-sub-color": "#abd0eb",
      "--terminal-form-border": "rgba(127, 196, 255, 0.28)",
      "--terminal-form-bg": "rgba(9, 19, 30, 0.9)",
      "--terminal-inline-hint-color": "#9abdd9",
      "--terminal-suggest-border": "rgba(127, 196, 255, 0.36)",
      "--terminal-suggest-bg": "rgba(11, 22, 35, 0.96)",
      "--terminal-suggest-item-bg": "rgba(127, 196, 255, 0.12)",
      "--terminal-suggest-item-border": "rgba(157, 212, 255, 0.22)",
      "--terminal-suggest-item-active-bg": "rgba(157, 212, 255, 0.26)",
      "--terminal-suggest-item-active-fg": "#f2fbff"
    },
    mono: {
      "--terminal-panel-border": "rgba(214, 220, 233, 0.32)",
      "--terminal-panel-glow": "rgba(168, 181, 207, 0.16)",
      "--terminal-panel-bg-a": "rgba(18, 21, 29, 0.95)",
      "--terminal-panel-bg-b": "rgba(10, 12, 17, 0.98)",
      "--terminal-head-border": "rgba(214, 220, 233, 0.24)",
      "--terminal-head-bg-a": "rgba(33, 37, 48, 0.9)",
      "--terminal-head-bg-b": "rgba(19, 22, 31, 0.84)",
      "--terminal-output-fg": "#eef1f8",
      "--terminal-output-glow": "rgba(189, 197, 214, 0.08)",
      "--terminal-output-bg-a": "rgba(12, 15, 22, 0.97)",
      "--terminal-output-bg-b": "rgba(8, 10, 16, 0.99)",
      "--terminal-prompt-color": "#bfd1ff",
      "--terminal-command-color": "#f4f6fb",
      "--terminal-error-color": "#ff9fb0",
      "--terminal-warn-color": "#ffd9a0",
      "--terminal-ok-color": "#a7d7be",
      "--terminal-badge-color": "#d5dcef",
      "--terminal-sub-color": "#b7bfd2",
      "--terminal-form-border": "rgba(214, 220, 233, 0.22)",
      "--terminal-form-bg": "rgba(16, 18, 27, 0.9)",
      "--terminal-inline-hint-color": "#a4aec5",
      "--terminal-suggest-border": "rgba(214, 220, 233, 0.3)",
      "--terminal-suggest-bg": "rgba(17, 20, 30, 0.96)",
      "--terminal-suggest-item-bg": "rgba(139, 149, 170, 0.14)",
      "--terminal-suggest-item-border": "rgba(154, 165, 190, 0.22)",
      "--terminal-suggest-item-active-bg": "rgba(165, 176, 200, 0.28)",
      "--terminal-suggest-item-active-fg": "#f7f9ff"
    }
  };
  const vars = varsByPreset[preset] ?? varsByPreset.classic;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

function applyBackgroundPreset(preset: UiSettings["backgroundPreset"]): void {
  const root = document.documentElement;
  const varsByPreset: Record<UiSettings["backgroundPreset"], Record<string, string>> = {
    aurora: {
      "--bg": "#0b1020",
      "--bg-orb-a": "#25335f",
      "--bg-orb-b": "#2b2148",
      "--bg-bottom": "#080d19"
    },
    deep: {
      "--bg": "#050a15",
      "--bg-orb-a": "#0d2a57",
      "--bg-orb-b": "#18193d",
      "--bg-bottom": "#04070f"
    },
    slate: {
      "--bg": "#101721",
      "--bg-orb-a": "#2a3852",
      "--bg-orb-b": "#243047",
      "--bg-bottom": "#0c121b"
    },
    sunset: {
      "--bg": "#160f14",
      "--bg-orb-a": "#5d2f45",
      "--bg-orb-b": "#42233a",
      "--bg-bottom": "#120b10"
    },
    pitch: {
      "--bg": "#07090f",
      "--bg-orb-a": "#121827",
      "--bg-orb-b": "#11131c",
      "--bg-bottom": "#05060b"
    }
  };
  const vars = varsByPreset[preset] ?? varsByPreset.aurora;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

function applyFontAndRendering(
  uiFont: UiSettings["uiFontPreset"],
  terminalFont: UiSettings["terminalFontPreset"],
  renderingMode: UiSettings["renderingMode"]
): void {
  const root = document.documentElement;
  const uiFonts: Record<UiSettings["uiFontPreset"], string> = {
    jetbrains: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    inter: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    sf: '"SF Pro Text", "SF Pro Display", -apple-system, "Segoe UI", sans-serif',
    fira: '"Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  };
  const terminalFonts: Record<UiSettings["terminalFontPreset"], string> = {
    jetbrains: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    cascadia: '"Cascadia Mono", "Cascadia Code", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
    menlo: 'Menlo, "SFMono-Regular", Monaco, Consolas, ui-monospace, monospace',
    fira: '"Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  };
  root.style.setProperty("--font-ui-stack", uiFonts[uiFont] ?? uiFonts.jetbrains);
  root.style.setProperty("--font-terminal-stack", terminalFonts[terminalFont] ?? terminalFonts.jetbrains);
  document.body.dataset.rendering = renderingMode;
}

function readUiSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(uiSettingsKey);
    if (!raw) {
      return {
        uiLanguage: "de",
        searchShortcut: getDefaultSearchShortcut(),
        safetyLayerEnabled: true,
        safetyLayerMode: "confirm-dangerous",
        theme: "midnight",
        backgroundPreset: "aurora",
        uiFontPreset: "jetbrains",
        terminalFontPreset: "jetbrains",
        renderingMode: "balanced",
        terminalThemePreset: "classic",
        accent: "#6ca5ff",
        scale: 100,
        radius: 14,
        terminalHeight: 420,
        terminalFontSize: 16,
        menuBarEnabled: true,
        backgroundModeEnabled: true
      };
    }
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return {
      uiLanguage: parsed.uiLanguage === "en" ? "en" : "de",
      searchShortcut: normalizeShortcut(typeof parsed.searchShortcut === "string" ? parsed.searchShortcut : getDefaultSearchShortcut()),
      safetyLayerEnabled: typeof parsed.safetyLayerEnabled === "boolean" ? parsed.safetyLayerEnabled : true,
      safetyLayerMode: supportedSafetyModes.includes(parsed.safetyLayerMode as UiSettings["safetyLayerMode"])
        ? (parsed.safetyLayerMode as UiSettings["safetyLayerMode"])
        : "confirm-dangerous",
      theme: supportedThemes.includes(parsed.theme as UiSettings["theme"])
        ? (parsed.theme as UiSettings["theme"])
        : "midnight",
      backgroundPreset: supportedBackgroundPresets.includes(parsed.backgroundPreset as UiSettings["backgroundPreset"])
        ? (parsed.backgroundPreset as UiSettings["backgroundPreset"])
        : "aurora",
      uiFontPreset: supportedUiFontPresets.includes(parsed.uiFontPreset as UiSettings["uiFontPreset"])
        ? (parsed.uiFontPreset as UiSettings["uiFontPreset"])
        : "jetbrains",
      terminalFontPreset: supportedTerminalFontPresets.includes(parsed.terminalFontPreset as UiSettings["terminalFontPreset"])
        ? (parsed.terminalFontPreset as UiSettings["terminalFontPreset"])
        : "jetbrains",
      renderingMode: supportedRenderingModes.includes(parsed.renderingMode as UiSettings["renderingMode"])
        ? (parsed.renderingMode as UiSettings["renderingMode"])
        : "balanced",
      terminalThemePreset: supportedTerminalThemes.includes(parsed.terminalThemePreset as UiSettings["terminalThemePreset"])
        ? (parsed.terminalThemePreset as UiSettings["terminalThemePreset"])
        : "classic",
      accent: typeof parsed.accent === "string" ? parsed.accent : "#6ca5ff",
      scale: typeof parsed.scale === "number" ? parsed.scale : 100,
      radius: typeof parsed.radius === "number" ? parsed.radius : 14,
      terminalHeight: typeof parsed.terminalHeight === "number" ? parsed.terminalHeight : 420,
      terminalFontSize: typeof parsed.terminalFontSize === "number" ? parsed.terminalFontSize : 16,
      menuBarEnabled: typeof parsed.menuBarEnabled === "boolean" ? parsed.menuBarEnabled : true,
      backgroundModeEnabled: typeof parsed.backgroundModeEnabled === "boolean" ? parsed.backgroundModeEnabled : true
    };
  } catch {
    return {
      uiLanguage: "de",
      searchShortcut: getDefaultSearchShortcut(),
      safetyLayerEnabled: true,
      safetyLayerMode: "confirm-dangerous",
      theme: "midnight",
      backgroundPreset: "aurora",
      uiFontPreset: "jetbrains",
      terminalFontPreset: "jetbrains",
      renderingMode: "balanced",
      terminalThemePreset: "classic",
      accent: "#6ca5ff",
      scale: 100,
      radius: 14,
      terminalHeight: 420,
      terminalFontSize: 16,
      menuBarEnabled: true,
      backgroundModeEnabled: true
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
  applyBackgroundPreset(settings.backgroundPreset);
  applyFontAndRendering(settings.uiFontPreset, settings.terminalFontPreset, settings.renderingMode);
  applyTerminalThemePreset(settings.terminalThemePreset);

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
  safetyEnabledCheckbox.checked = settings.safetyLayerEnabled;
  safetyModeSelect.value = settings.safetyLayerMode;
  safetyModeSelect.disabled = !settings.safetyLayerEnabled;
  themeSelect.value = settings.theme;
  backgroundPresetSelect.value = settings.backgroundPreset;
  uiFontPresetSelect.value = settings.uiFontPreset;
  terminalFontPresetSelect.value = settings.terminalFontPreset;
  renderingModeSelect.value = settings.renderingMode;
  terminalThemePresetSelect.value = settings.terminalThemePreset;
  accentColor.value = settings.accent;
  uiScale.value = String(clampedScale);
  radiusScale.value = String(settings.radius);
  terminalHeightRange.value = String(clampedTerminalHeight);
  terminalFontSizeRange.value = String(clampedTerminalFontSize);
  menuBarEnabledCheckbox.checked = settings.menuBarEnabled;
  backgroundModeEnabledCheckbox.checked = settings.backgroundModeEnabled;
  menuBarEnabledCheckbox.disabled = !isMacPlatform();

  if (terminalStarted) {
    const size = getTerminalSizeEstimate();
    void window.cmdfindDesktop.terminalResize(size.cols, size.rows, activeTerminalTabId);
  }
  queueWrapScrollState();
  queueTerminalLayoutMetricsSync();
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
          <button class="run-btn" data-run-cmd="${escapeHtml(entry.command)}" data-run-danger="${escapeHtml(
            entry.dangerLevel
          )}">${escapeHtml(t("runInTerminal"))}</button>
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

async function runCommandInTerminal(command: string, indexedDangerLevel?: string): Promise<void> {
  if (!command.trim()) return;
  if (!confirmSafetyForCommand(command, indexedDangerLevel)) {
    statusEl.textContent = t("safetyCanceled");
    return;
  }
  setTerminalOpen(true);
  if (!terminalStarted) {
    const started = await window.cmdfindDesktop.terminalStart(activeTerminalTabId);
    terminalStarted = started;
    saveActiveTerminalTabSnapshot();
    if (!started) {
      statusEl.textContent = t("terminalStartFailed");
      return;
    }
    const size = getTerminalSizeEstimate();
    await window.cmdfindDesktop.terminalResize(size.cols, size.rows, activeTerminalTabId);
  }
  await window.cmdfindDesktop.terminalInput(`${command}\n`, activeTerminalTabId);
  statusEl.textContent = `${t("ranInTerminal")}: ${command}`;
}

type SafetyAssessment = {
  level: "safe" | "careful" | "dangerous";
  reason: string;
};

function safetyLevelWeight(level: SafetyAssessment["level"]): number {
  if (level === "dangerous") return 3;
  if (level === "careful") return 2;
  return 1;
}

function assessCommandSafety(command: string, indexedDangerLevel?: string): SafetyAssessment {
  const source = (indexedDangerLevel || "").toLowerCase();
  const raw = command.trim().toLowerCase();
  const reasons: string[] = [];
  let level: SafetyAssessment["level"] = "safe";

  const setLevel = (next: SafetyAssessment["level"], reasonKey: keyof typeof i18n.de): void => {
    if (safetyLevelWeight(next) > safetyLevelWeight(level)) {
      level = next;
    }
    reasons.push(t(reasonKey));
  };

  if (source === "dangerous") setLevel("dangerous", "safetyReasonCatalogDangerous");
  else if (source === "careful") setLevel("careful", "safetyReasonCatalogCareful");

  const dangerousChecks: Array<[RegExp, keyof typeof i18n.de]> = [
    [/\brm\s+-rf\s+\/(\s|$)/i, "safetyReasonDelete"],
    [/\b(del|erase)\s+\/[sqf]/i, "safetyReasonDelete"],
    [/\bmkfs(\.| )|\b(format|diskpart|fdisk)\b/i, "safetyReasonDisk"],
    [/\bdd\s+.*\bof=\/dev\//i, "safetyReasonDisk"],
    [/\b(diskutil\s+erase|diskutil\s+partition|shred)\b/i, "safetyReasonDisk"],
    [/\b(shutdown|reboot|poweroff|halt|init\s+0|init\s+6)\b/i, "safetyReasonSystem"]
  ];

  const carefulChecks: Array<[RegExp, keyof typeof i18n.de]> = [
    [/\bsudo\b|runas\b/i, "safetyReasonPrivilege"],
    [/\brm\b|\bdel\b|\bmv\b/i, "safetyReasonDelete"],
    [/\bkillall\b|\bpkill\b|\bkill\s+-9\b/i, "safetyReasonProcess"],
    [/\bchmod\b|\bchown\b/i, "safetyReasonSystem"]
  ];

  for (const [pattern, reason] of dangerousChecks) {
    if (pattern.test(raw)) {
      setLevel("dangerous", reason);
    }
  }
  for (const [pattern, reason] of carefulChecks) {
    if (pattern.test(raw)) {
      setLevel("careful", reason);
    }
  }

  if (!reasons.length) {
    return { level: "safe", reason: "" };
  }
  const reason = Array.from(new Set(reasons)).slice(0, 2).join(" ");
  return { level, reason };
}

function confirmSafetyForCommand(command: string, indexedDangerLevel?: string): boolean {
  const settings = readUiSettings();
  if (!settings.safetyLayerEnabled) {
    return true;
  }

  const assessment = assessCommandSafety(command, indexedDangerLevel);
  if (assessment.level === "safe") {
    return true;
  }

  if (settings.safetyLayerMode === "block-dangerous" && assessment.level === "dangerous") {
    statusEl.textContent = `${t("safetyBlockedDangerous")} ${command}`;
    return false;
  }

  const needsConfirm =
    settings.safetyLayerMode === "confirm-careful" ||
    (settings.safetyLayerMode === "confirm-dangerous" && assessment.level === "dangerous");

  if (!needsConfirm) {
    return true;
  }

  const title = assessment.level === "dangerous" ? t("safetyConfirmDangerousTitle") : t("safetyConfirmCarefulTitle");
  const reasonLine = assessment.reason ? `\n${assessment.reason}` : "";
  const message = `${title}\n\n${command}${reasonLine}\n\n${t("safetyConfirmQuestion")}`;
  return window.confirm(message);
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

readmeToggleBtn.addEventListener("click", () => {
  setReadmeExpanded(!readmeExpanded);
});

welcomeStartBtn.addEventListener("click", () => {
  localStorage.setItem(onboardingSeenKey, "1");
  setWelcomeOpen(false);
  setSettingsOpen(false);
  queryInput.focus();
  queryInput.select();
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
  if (event.key === "Escape" && !welcomeOverlay.hidden) {
    localStorage.setItem(onboardingSeenKey, "1");
    setWelcomeOpen(false);
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
    safetyLayerEnabled: safetyEnabledCheckbox.checked,
    safetyLayerMode: supportedSafetyModes.includes(safetyModeSelect.value as UiSettings["safetyLayerMode"])
      ? (safetyModeSelect.value as UiSettings["safetyLayerMode"])
      : "confirm-dangerous",
    theme: themeSelect.value as UiSettings["theme"],
    backgroundPreset: supportedBackgroundPresets.includes(backgroundPresetSelect.value as UiSettings["backgroundPreset"])
      ? (backgroundPresetSelect.value as UiSettings["backgroundPreset"])
      : "aurora",
    uiFontPreset: supportedUiFontPresets.includes(uiFontPresetSelect.value as UiSettings["uiFontPreset"])
      ? (uiFontPresetSelect.value as UiSettings["uiFontPreset"])
      : "jetbrains",
    terminalFontPreset: supportedTerminalFontPresets.includes(terminalFontPresetSelect.value as UiSettings["terminalFontPreset"])
      ? (terminalFontPresetSelect.value as UiSettings["terminalFontPreset"])
      : "jetbrains",
    renderingMode: supportedRenderingModes.includes(renderingModeSelect.value as UiSettings["renderingMode"])
      ? (renderingModeSelect.value as UiSettings["renderingMode"])
      : "balanced",
    terminalThemePreset: supportedTerminalThemes.includes(terminalThemePresetSelect.value as UiSettings["terminalThemePreset"])
      ? (terminalThemePresetSelect.value as UiSettings["terminalThemePreset"])
      : "classic",
    accent: accentColor.value,
    scale: Number(uiScale.value),
    radius: Number(radiusScale.value),
    terminalHeight: Number(terminalHeightRange.value),
    terminalFontSize: Number(terminalFontSizeRange.value),
    menuBarEnabled: menuBarEnabledCheckbox.checked,
    backgroundModeEnabled: backgroundModeEnabledCheckbox.checked
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
  if (isMacPlatform()) {
    void window.cmdfindDesktop.setMenuBarEnabled(settings.menuBarEnabled).then((enabled) => {
      if (enabled !== settings.menuBarEnabled) {
        menuBarEnabledCheckbox.checked = enabled;
        saveUiSettings({
          ...settings,
          menuBarEnabled: enabled
        });
      }
    });
  }
  void window.cmdfindDesktop.setBackgroundModeEnabled(settings.backgroundModeEnabled).then((enabled) => {
    if (enabled !== settings.backgroundModeEnabled) {
      backgroundModeEnabledCheckbox.checked = enabled;
      saveUiSettings({
        ...settings,
        backgroundModeEnabled: enabled
      });
    }
  });
}

uiLanguageSelect.addEventListener("change", syncUiSettings);
themeSelect.addEventListener("change", syncUiSettings);
backgroundPresetSelect.addEventListener("change", syncUiSettings);
uiFontPresetSelect.addEventListener("change", syncUiSettings);
terminalFontPresetSelect.addEventListener("change", syncUiSettings);
renderingModeSelect.addEventListener("change", syncUiSettings);
terminalThemePresetSelect.addEventListener("change", syncUiSettings);
accentColor.addEventListener("input", syncUiSettings);
uiScale.addEventListener("input", syncUiSettings);
radiusScale.addEventListener("input", syncUiSettings);
terminalHeightRange.addEventListener("input", syncUiSettings);
terminalFontSizeRange.addEventListener("input", syncUiSettings);
safetyEnabledCheckbox.addEventListener("change", syncUiSettings);
safetyModeSelect.addEventListener("change", syncUiSettings);
menuBarEnabledCheckbox.addEventListener("change", syncUiSettings);
backgroundModeEnabledCheckbox.addEventListener("change", syncUiSettings);

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

function appendTerminalOutput(chunk: string, tabId = activeTerminalTabId): void {
  const target = getTerminalTabSnapshot(tabId);
  const normalized = chunk
    .replace(/\u001b\][^\u0007]*(\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-Z\\-_]/g, "")
    .replace(/[\uE000-\uF8FF\uFFFD]/g, "");

  for (const ch of normalized) {
    if (ch === "\r") {
      target.cursorCol = 0;
      continue;
    }

    if (ch === "\n") {
      target.rows.push("");
      target.cursorCol = 0;
      continue;
    }

    if (ch === "\b") {
      if (target.cursorCol > 0) {
        const rowIdx = target.rows.length - 1;
        const row = target.rows[rowIdx] || "";
        const nextCursor = target.cursorCol - 1;
        target.rows[rowIdx] = `${row.slice(0, nextCursor)}${row.slice(target.cursorCol)}`;
        target.cursorCol = nextCursor;
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

    const rowIdx = target.rows.length - 1;
    const row = target.rows[rowIdx] || "";
    if (target.cursorCol >= row.length) {
      const pad = target.cursorCol > row.length ? " ".repeat(target.cursorCol - row.length) : "";
      target.rows[rowIdx] = `${row}${pad}${ch}`;
    } else {
      target.rows[rowIdx] = `${row.slice(0, target.cursorCol)}${ch}${row.slice(target.cursorCol + 1)}`;
    }
    target.cursorCol += 1;
  }

  if (target.rows.length > terminalBufferPolicy.hardLimit) {
    const nextSegment = target.segment + 1;
    const rolloverLine =
      currentUiLanguage === "de"
        ? `[CMDFIND] Terminal ${nextSegment} gestartet (auto, Profil: ${terminalBufferPolicy.profile}). Verlauf gekürzt, Session läuft weiter.`
        : `[CMDFIND] Terminal ${nextSegment} started (auto, profile: ${terminalBufferPolicy.profile}). Log trimmed, session continues.`;
    target.rows = [rolloverLine, ...target.rows.slice(-terminalBufferPolicy.keepRows)];
    target.segment = nextSegment;
  }

  if (tabId !== activeTerminalTabId) {
    return;
  }

  const plainOutput = target.rows.join("\n");
  const withMarkup = escapeHtml(plainOutput)
    .replace(/(\[CMDFIND\][^\n]*)/g, '<span class="term-line-badge">$1</span>')
    .replace(/(^|\n)([^\n]*[%$#]\s)([^\n]*)/g, '$1<span class="term-prompt">$2</span><span class="term-command">$3</span>')
    .replace(/\b(error|failed|not found|permission denied|denied)\b/gi, '<span class="term-error">$1</span>')
    .replace(/\b(warn|warning)\b/gi, '<span class="term-warn">$1</span>')
    .replace(/\b(success|done|completed|ready)\b/gi, '<span class="term-ok">$1</span>')
    .replace(
      /(^|\n)\s*C M D F I N D\s*(?=\n|$)/g,
      '$1<span class="term-cmdfind-badge"><span class="term-cmdfind-c">C</span> <span class="term-cmdfind-m">M</span> <span class="term-cmdfind-d">D</span> <span class="term-cmdfind-f">F</span> <span class="term-cmdfind-i">I</span> <span class="term-cmdfind-n">N</span> <span class="term-cmdfind-d2">D</span></span>'
    )
    .replace(/(^|\n)\s*command finder\s*(?=\n|$)/gi, '$1<span class="term-cmdfind-sub">command finder</span>');

  terminalOutput.innerHTML = `${withMarkup}<span data-term-end="1"></span>`;
  scrollTerminalToBottom();
  updateTerminalCurrentDirHintFromOutput(plainOutput);
  saveActiveTerminalTabSnapshot();
}

function clearTerminalDisplay(): void {
  terminalRows = [""];
  terminalCursorCol = 0;
  terminalSegment = 1;
  terminalOutput.textContent = "";
  saveActiveTerminalTabSnapshot();
}

function renderActiveTerminalFromSnapshot(): void {
  const plainOutput = terminalRows.join("\n");
  const withMarkup = escapeHtml(plainOutput)
    .replace(/(\[CMDFIND\][^\n]*)/g, '<span class="term-line-badge">$1</span>')
    .replace(/(^|\n)([^\n]*[%$#]\s)([^\n]*)/g, '$1<span class="term-prompt">$2</span><span class="term-command">$3</span>')
    .replace(/\b(error|failed|not found|permission denied|denied)\b/gi, '<span class="term-error">$1</span>')
    .replace(/\b(warn|warning)\b/gi, '<span class="term-warn">$1</span>')
    .replace(/\b(success|done|completed|ready)\b/gi, '<span class="term-ok">$1</span>')
    .replace(
      /(^|\n)\s*C M D F I N D\s*(?=\n|$)/g,
      '$1<span class="term-cmdfind-badge"><span class="term-cmdfind-c">C</span> <span class="term-cmdfind-m">M</span> <span class="term-cmdfind-d">D</span> <span class="term-cmdfind-f">F</span> <span class="term-cmdfind-i">I</span> <span class="term-cmdfind-n">N</span> <span class="term-cmdfind-d2">D</span></span>'
    )
    .replace(/(^|\n)\s*command finder\s*(?=\n|$)/gi, '$1<span class="term-cmdfind-sub">command finder</span>');
  terminalOutput.innerHTML = `${withMarkup}<span data-term-end="1"></span>`;
  scrollTerminalToBottom();
  renderTerminalSuggestions();
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
  saveActiveTerminalTabSnapshot();
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

function updateSuggestionIndexFromButton(button: HTMLButtonElement): void {
  const items = Array.from(terminalSuggest.querySelectorAll<HTMLButtonElement>(".terminal-suggest-item"));
  const idx = items.indexOf(button);
  if (idx < 0 || idx === terminalSuggestionIndex) return;
  terminalSuggestionIndex = idx;
  renderTerminalSuggestions();
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

function switchTerminalTab(tabId: number): void {
  if (tabId === activeTerminalTabId) return;
  saveActiveTerminalTabSnapshot();
  loadTerminalTabSnapshot(tabId);
  closeTerminalSuggestions();
  terminalInput.value = "";
  renderActiveTerminalFromSnapshot();
  renderTerminalTabs();
  if (terminalStarted) {
    const size = getTerminalSizeEstimate();
    void window.cmdfindDesktop.terminalResize(size.cols, size.rows, activeTerminalTabId);
  }
}

function addTerminalTab(): void {
  saveActiveTerminalTabSnapshot();
  const newTabId = nextTerminalTabId++;
  terminalTabSnapshots.set(newTabId, createTerminalTabSnapshot(newTabId));
  loadTerminalTabSnapshot(newTabId);
  closeTerminalSuggestions();
  renderActiveTerminalFromSnapshot();
  renderTerminalTabs();
  setTerminalOpen(true);
}

async function closeTerminalTab(tabId: number): Promise<void> {
  const snapshot = terminalTabSnapshots.get(tabId);
  if (!snapshot || terminalTabSnapshots.size <= 1) return;
  if (snapshot.started) {
    await window.cmdfindDesktop.terminalStop(tabId);
  }
  terminalTabSnapshots.delete(tabId);

  if (activeTerminalTabId === tabId) {
    const fallback = [...terminalTabSnapshots.keys()].sort((a, b) => a - b)[0] ?? 1;
    loadTerminalTabSnapshot(fallback);
    renderActiveTerminalFromSnapshot();
  }
  renderTerminalTabs();
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

terminalAddTab.addEventListener("click", () => {
  addTerminalTab();
});

terminalTabs.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const close = target.closest<HTMLElement>("[data-tab-close]");
  if (close) {
    const tabId = Number(close.getAttribute("data-tab-close"));
    if (Number.isFinite(tabId)) {
      void closeTerminalTab(tabId);
    }
    return;
  }
  const tabButton = target.closest<HTMLElement>("[data-tab-id]");
  if (!tabButton) return;
  const tabId = Number(tabButton.getAttribute("data-tab-id"));
  if (Number.isFinite(tabId)) {
    switchTerminalTab(tabId);
  }
});

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

  const started = await window.cmdfindDesktop.terminalStart(activeTerminalTabId);
  terminalStarted = started;
  saveActiveTerminalTabSnapshot();
  if (!started) {
    appendTerminalOutput("[terminal could not start]\n");
    return;
  }
  const size = getTerminalSizeEstimate();
  await window.cmdfindDesktop.terminalResize(size.cols, size.rows, activeTerminalTabId);
});

terminalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const command = terminalInput.value.trim();
  if (!command) return;

  if (command.toLowerCase() === "clear") {
    clearTerminalDisplay();
    closeTerminalSuggestions();
    terminalInput.value = "";
    if (terminalStarted) {
      await window.cmdfindDesktop.terminalInput("\n", activeTerminalTabId);
    }
    return;
  }

  if (!confirmSafetyForCommand(command)) {
    statusEl.textContent = t("safetyCanceled");
    return;
  }

  if (!terminalStarted) {
    const started = await window.cmdfindDesktop.terminalStart(activeTerminalTabId);
    terminalStarted = started;
    saveActiveTerminalTabSnapshot();
    if (!started) {
      appendTerminalOutput("[terminal could not start]\n");
      return;
    }
  }

  await window.cmdfindDesktop.terminalInput(`${command}\n`, activeTerminalTabId);
  terminalHistory.push(command);
  terminalHistoryIndex = terminalHistory.length;
  saveActiveTerminalTabSnapshot();
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
    await window.cmdfindDesktop.terminalInput("\u0003", activeTerminalTabId);
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
  updateSuggestionIndexFromButton(btn);
  const cmd = btn.getAttribute("data-cmd");
  if (!cmd) return;
  applyTerminalSuggestion(cmd);
});

terminalSuggest.addEventListener("mousemove", (event) => {
  const target = event.target as HTMLElement;
  const btn = target.closest<HTMLButtonElement>(".terminal-suggest-item");
  if (!btn) return;
  updateSuggestionIndexFromButton(btn);
});

terminalClear.addEventListener("click", () => {
  clearTerminalDisplay();
});

terminalStop.addEventListener("click", async () => {
  await window.cmdfindDesktop.terminalStop(activeTerminalTabId);
  terminalStarted = false;
  saveActiveTerminalTabSnapshot();
  appendTerminalOutput("[terminal stopped]\n");
});

window.addEventListener("resize", () => {
  queueTerminalLayoutMetricsSync();
  if (!terminalStarted) return;
  const size = getTerminalSizeEstimate();
  void window.cmdfindDesktop.terminalResize(size.cols, size.rows, activeTerminalTabId);
});

resultsEl.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (target.classList.contains("run-btn")) {
    const cmd = target.getAttribute("data-run-cmd");
    const danger = target.getAttribute("data-run-danger");
    if (!cmd) return;
    void runCommandInTerminal(cmd, danger || undefined);
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

if (isMacPlatform()) {
  void window.cmdfindDesktop.getMenuBarEnabled().then((enabled) => {
    const settings = readUiSettings();
    if (settings.menuBarEnabled === enabled) return;
    const merged = { ...settings, menuBarEnabled: enabled };
    applyUiSettings(merged);
    saveUiSettings(merged);
  });
}

void window.cmdfindDesktop.getBackgroundModeEnabled().then((enabled) => {
  const settings = readUiSettings();
  if (settings.backgroundModeEnabled === enabled) return;
  const merged = { ...settings, backgroundModeEnabled: enabled };
  applyUiSettings(merged);
  saveUiSettings(merged);
});

applyUiSettings(readUiSettings());
setReadmeExpanded(false);
renderSearchHistory();
queueWrapScrollState();
queueTerminalLayoutMetricsSync();
terminalTabSnapshots.set(1, createTerminalTabSnapshot(1));
loadTerminalTabSnapshot(1);
renderTerminalTabs();
window.addEventListener("resize", queueWrapScrollState);
new MutationObserver(() => queueWrapScrollState()).observe(wrapEl, {
  childList: true,
  subtree: true,
  attributes: true
});
window.cmdfindDesktop.onTerminalOutput((sessionId, chunk) => {
  const targetId = Number.isFinite(sessionId) ? sessionId : 1;
  if (!terminalTabSnapshots.has(targetId)) {
    terminalTabSnapshots.set(targetId, createTerminalTabSnapshot(targetId));
    const snap = getTerminalTabSnapshot(targetId);
    snap.started = true;
    renderTerminalTabs();
  }
  appendTerminalOutput(chunk, targetId);
  if (targetId !== activeTerminalTabId) {
    renderTerminalTabs();
  }
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

if (!localStorage.getItem(onboardingSeenKey)) {
  setWelcomeOpen(true);
}
