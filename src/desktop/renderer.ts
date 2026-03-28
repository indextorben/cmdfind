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

type UiSettings = {
  theme: "midnight" | "slate" | "graphite";
  accent: string;
  scale: number;
  radius: number;
};

const uiSettingsKey = "cmdfind:desktop:ui-settings";

function readUiSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(uiSettingsKey);
    if (!raw) {
      return { theme: "midnight", accent: "#6ca5ff", scale: 100, radius: 14 };
    }
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return {
      theme: parsed.theme === "slate" || parsed.theme === "graphite" ? parsed.theme : "midnight",
      accent: typeof parsed.accent === "string" ? parsed.accent : "#6ca5ff",
      scale: typeof parsed.scale === "number" ? parsed.scale : 100,
      radius: typeof parsed.radius === "number" ? parsed.radius : 14
    };
  } catch {
    return { theme: "midnight", accent: "#6ca5ff", scale: 100, radius: 14 };
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
  root.style.fontSize = `${settings.scale}%`;

  themeSelect.value = settings.theme;
  accentColor.value = settings.accent;
  uiScale.value = String(settings.scale);
  radiusScale.value = String(settings.radius);
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
    radius: Number(radiusScale.value)
  };
  applyUiSettings(settings);
  saveUiSettings(settings);
}

themeSelect.addEventListener("change", syncUiSettings);
accentColor.addEventListener("input", syncUiSettings);
uiScale.addEventListener("input", syncUiSettings);
radiusScale.addEventListener("input", syncUiSettings);

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
