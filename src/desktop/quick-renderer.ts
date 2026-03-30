type SearchResponse = {
  results: Array<{
    entry: {
      task: string;
      command: string;
      platform: string;
      shell: string;
      description: { de: string; en: string };
    };
  }>;
};

type DesktopApi = {
  search: (request: {
    query: string;
    language?: "de" | "en" | "auto";
    platform?: "windows" | "linux" | "macos" | "auto";
    shell?: "powershell" | "bash" | "zsh" | "auto";
    limit?: number;
    useCurrentContext?: boolean;
    refreshIndex?: boolean;
    disableLocalIndex?: boolean;
  }) => Promise<SearchResponse>;
  onQuickFocus: (callback: () => void) => () => void;
};

const api = (window as Window & { cmdfindDesktop: DesktopApi }).cmdfindDesktop;

const queryInput = document.querySelector<HTMLInputElement>("#quickQuery")!;
const resultsEl = document.querySelector<HTMLElement>("#quickResults")!;

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function runQuickSearch(): Promise<void> {
  const query = queryInput.value.trim();
  if (!query) {
    resultsEl.innerHTML = `<div class="empty">Tippe einen Suchbegriff und drücke Enter.</div>`;
    return;
  }

  resultsEl.innerHTML = `<div class="status">Suche läuft...</div>`;
  try {
    const response = await api.search({
      query,
      language: "auto",
      platform: "auto",
      shell: "auto",
      limit: 8,
      useCurrentContext: true,
      refreshIndex: false,
      disableLocalIndex: false
    });

    const entries = response.results.map((item) => item.entry);
    if (!entries.length) {
      resultsEl.innerHTML = `<div class="empty">Keine Treffer für <strong>${escapeHtml(query)}</strong>.</div>`;
      return;
    }

    resultsEl.innerHTML = entries
      .map((entry, index) => {
        const note = entry.description.de || entry.description.en;
        return `
          <article class="result" data-command="${escapeHtml(entry.command)}">
            <div class="task">${index + 1}. ${escapeHtml(entry.task.replaceAll("_", " "))}</div>
            <div class="command">${escapeHtml(entry.command)}</div>
            <div class="meta">${escapeHtml(entry.platform)} | ${escapeHtml(entry.shell)} | ${escapeHtml(note)}</div>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    resultsEl.innerHTML = `<div class="empty">Fehler bei der Suche: ${escapeHtml(String(error))}</div>`;
  }
}

queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void runQuickSearch();
    return;
  }
  if (event.key === "Escape") {
    window.close();
  }
});

resultsEl.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const card = target.closest<HTMLElement>(".result");
  if (!card) return;
  const command = card.getAttribute("data-command");
  if (!command) return;
  await navigator.clipboard.writeText(command).catch(() => undefined);
  const prev = card.innerHTML;
  card.innerHTML = `${prev}<div class="status ok">In Zwischenablage kopiert</div>`;
});

api.onQuickFocus(() => {
  queryInput.focus();
  queryInput.select();
});

window.addEventListener("focus", () => {
  queryInput.focus();
  queryInput.select();
});

queryInput.focus();
