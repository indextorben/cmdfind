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
      terminalStart: () => Promise<boolean>;
      terminalInput: (input: string) => Promise<boolean>;
      terminalResize: (cols: number, rows: number) => Promise<boolean>;
      terminalStop: () => Promise<boolean>;
      onTerminalOutput: (callback: (chunk: string) => void) => () => void;
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
const saveLangBtn = document.querySelector<HTMLButtonElement>("#saveLangBtn")!;
const settingsToggle = document.querySelector<HTMLButtonElement>("#settingsToggle")!;
const settingsPanel = document.querySelector<HTMLElement>("#settingsPanel")!;
const settingsClose = document.querySelector<HTMLButtonElement>("#settingsClose")!;
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
const terminalClear = document.querySelector<HTMLButtonElement>("#terminalClear")!;
const terminalStop = document.querySelector<HTMLButtonElement>("#terminalStop")!;

type UiSettings = {
  theme: "midnight" | "slate" | "graphite" | "sunset" | "emerald" | "amber" | "cyber" | "rose";
  accent: string;
  scale: number;
  radius: number;
  terminalHeight: number;
  terminalFontSize: number;
};

const uiSettingsKey = "cmdfind:desktop:ui-settings";
const supportedThemes: UiSettings["theme"][] = ["midnight", "slate", "graphite", "sunset", "emerald", "amber", "cyber", "rose"];
let terminalStarted = false;
const terminalHistory: string[] = [];
let terminalHistoryIndex = -1;

function readUiSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(uiSettingsKey);
    if (!raw) {
      return { theme: "midnight", accent: "#6ca5ff", scale: 100, radius: 14, terminalHeight: 420, terminalFontSize: 16 };
    }
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return {
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
    return { theme: "midnight", accent: "#6ca5ff", scale: 100, radius: 14, terminalHeight: 420, terminalFontSize: 16 };
  }
}

function saveUiSettings(settings: UiSettings): void {
  localStorage.setItem(uiSettingsKey, JSON.stringify(settings));
}

function applyUiSettings(settings: UiSettings): void {
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
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render(response: DesktopSearchResponse): void {
  statusEl.textContent = `Context: ${response.context.platform}/${response.context.shell} | Lang: ${response.context.language}`;

  if (response.results.length === 0) {
    resultsEl.innerHTML = '<div class="empty">No results.</div>';
    return;
  }

  resultsEl.innerHTML = response.results
    .map((result, index) => {
      const note = response.context.language === "de" ? result.entry.description.de : result.entry.description.en;
      return `
      <article class="card">
        <div class="head"><span class="idx">${index + 1}</span> ${escapeHtml(result.entry.task.replaceAll("_", " "))}</div>
        <div class="command-row">
          <div class="command">${escapeHtml(result.entry.command)}</div>
          <button class="copy-btn" data-cmd="${escapeHtml(result.entry.command)}">Copy</button>
        </div>
        <div class="note">${escapeHtml(note)}</div>
        <div class="meta">Example: ${escapeHtml(result.entry.example)}</div>
        <div class="meta">${escapeHtml(result.entry.platform)} | ${escapeHtml(result.entry.shell)} | ${escapeHtml(
        result.entry.sourceType
      )} | ${escapeHtml(result.entry.category)} | ${result.entry.locallyAvailable ? "local" : "seed"} | ${escapeHtml(
        result.entry.dangerLevel
      )}</div>
      </article>`;
    })
    .join("");
}

async function copyCommand(command: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(command);
    statusEl.textContent = `Copied: ${command}`;
  } catch {
    statusEl.textContent = "Copy failed.";
  }
}

async function runSearch(forceAll = false): Promise<void> {
  const query = forceAll ? "all" : queryInput.value.trim();
  if (!query) {
    statusEl.textContent = "Enter a query.";
    return;
  }

  searchBtn.disabled = true;
  allBtn.disabled = true;
  statusEl.textContent = "Searching...";

  try {
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

queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    void runSearch(false);
  }
});

saveLangBtn.addEventListener("click", async () => {
  const selected = langSelect.value as "de" | "en" | "auto";
  if (selected === "auto") {
    statusEl.textContent = "Select de or en to save default language.";
    return;
  }
  await window.cmdfindDesktop.setDefaultLanguage(selected);
  statusEl.textContent = `Saved default language: ${selected}`;
});

function setSettingsOpen(open: boolean): void {
  settingsPanel.hidden = !open;
}

settingsToggle.addEventListener("click", () => {
  setSettingsOpen(settingsPanel.hidden);
});

settingsClose.addEventListener("click", () => {
  setSettingsOpen(false);
});

document.addEventListener("keydown", (event) => {
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
    theme: themeSelect.value as UiSettings["theme"],
    accent: accentColor.value,
    scale: Number(uiScale.value),
    radius: Number(radiusScale.value),
    terminalHeight: Number(terminalHeightRange.value),
    terminalFontSize: Number(terminalFontSizeRange.value)
  };
  applyUiSettings(settings);
  saveUiSettings(settings);
}

themeSelect.addEventListener("change", syncUiSettings);
accentColor.addEventListener("input", syncUiSettings);
uiScale.addEventListener("input", syncUiSettings);
radiusScale.addEventListener("input", syncUiSettings);
terminalHeightRange.addEventListener("input", syncUiSettings);
terminalFontSizeRange.addEventListener("input", syncUiSettings);

function appendTerminalOutput(chunk: string): void {
  const normalized = chunk
    .replace(/\u001b\][^\u0007]*(\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-Z\\-_]/g, "")
    .replace(/[\uE000-\uF8FF\uFFFD]/g, "");

  let content = terminalOutput.textContent || "";
  for (const char of normalized) {
    if (char === "\r") {
      const lastNewline = content.lastIndexOf("\n");
      content = lastNewline >= 0 ? content.slice(0, lastNewline + 1) : "";
      continue;
    }

    if (char === "\b") {
      if (content.length > 0 && content[content.length - 1] !== "\n") {
        content = content.slice(0, -1);
      }
      continue;
    }

    if (char === "\u0007") {
      continue;
    }

    const code = char.charCodeAt(0);
    if (code < 32 && char !== "\n" && char !== "\t") {
      continue;
    }

    content += char;
  }

  terminalOutput.textContent = content;
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function getTerminalSizeEstimate(): { cols: number; rows: number } {
  const width = terminalOutput.clientWidth || 880;
  const height = terminalOutput.clientHeight || 220;
  return {
    cols: Math.max(60, Math.floor(width / 8.4)),
    rows: Math.max(10, Math.floor(height / 19))
  };
}

function setTerminalOpen(open: boolean): void {
  terminalPanel.hidden = !open;
  if (open) {
    terminalInput.focus();
  }
}

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

  await window.cmdfindDesktop.terminalInput(`${command}\n`);
  terminalHistory.push(command);
  terminalHistoryIndex = terminalHistory.length;
  terminalInput.value = "";
});

terminalInput.addEventListener("keydown", async (event) => {
  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!terminalHistory.length) return;
    terminalHistoryIndex = Math.max(0, terminalHistoryIndex - 1);
    terminalInput.value = terminalHistory[terminalHistoryIndex] || "";
    terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!terminalHistory.length) return;
    terminalHistoryIndex = Math.min(terminalHistory.length, terminalHistoryIndex + 1);
    terminalInput.value = terminalHistory[terminalHistoryIndex] || "";
    terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
    return;
  }

  if (event.key.toLowerCase() === "c" && event.ctrlKey) {
    event.preventDefault();
    if (!terminalStarted) return;
    await window.cmdfindDesktop.terminalInput("\u0003");
  }
});

terminalClear.addEventListener("click", () => {
  terminalOutput.textContent = "";
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
  if (!target.classList.contains("copy-btn")) {
    return;
  }
  const cmd = target.getAttribute("data-cmd");
  if (!cmd) {
    return;
  }
  void copyCommand(cmd);
});

void window.cmdfindDesktop.getDefaultLanguage().then((lang) => {
  if (lang) {
    langSelect.value = lang;
  }
});

applyUiSettings(readUiSettings());
window.cmdfindDesktop.onTerminalOutput((chunk) => {
  appendTerminalOutput(chunk);
});
