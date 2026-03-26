import type { CommandEntry, Language, SearchOptions, SearchResult } from "./types.js";
import { inferLanguage, isAdminQuery, normalizeText, similarity, tokenize } from "./utils.js";

const ADMIN_CATEGORIES = new Set(["network", "dns", "process", "service", "permissions", "system", "remote"]);

function scoreEntry(entry: CommandEntry, query: string, language: Language, options: SearchOptions): SearchResult | null {
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenize(query);
  const adminQuery = isAdminQuery(query);
  const normalizedName = normalizeText(entry.name);
  const normalizedCommand = normalizeText(entry.command);

  if (queryTokens.length === 0) {
    return null;
  }

  const keywordPool = [
    ...entry.keywords[language],
    ...entry.keywords[language === "de" ? "en" : "de"],
    entry.name,
    entry.category,
    entry.sourceType,
    entry.task,
    entry.id,
    entry.description[language],
    entry.description[language === "de" ? "en" : "de"]
  ].map(normalizeText);

  const searchTokens = keywordPool.flatMap((item) => tokenize(item));

  let score = 0;
  const matchedTerms = new Set<string>();

  if (keywordPool.some((item) => item.includes(normalizedQuery))) {
    score += 40;
  }

  for (const token of queryTokens) {
    if (searchTokens.includes(token)) {
      score += 20;
      matchedTerms.add(token);
      continue;
    }

    let best = 0;
    let bestToken = "";

    for (const candidate of searchTokens) {
      const s = similarity(token, candidate);
      if (s > best) {
        best = s;
        bestToken = candidate;
      }
    }

    if (best >= 0.8) {
      score += 10;
      matchedTerms.add(bestToken);
    } else if (best >= 0.65) {
      score += 5;
      matchedTerms.add(bestToken);
    }
  }

  if (score === 0) {
    return null;
  }

  if (options.preferLocal !== false && entry.locallyAvailable) {
    score += 12;
  }

  if (options.currentPlatform) {
    if (entry.platform === options.currentPlatform) {
      score += 18;
    } else {
      score -= 12;
    }
  }

  if (options.currentShell) {
    if (entry.shell === options.currentShell) {
      score += 8;
    } else {
      score -= 2;
    }
  }

  if (options.preferAdmin !== false && adminQuery) {
    if (ADMIN_CATEGORIES.has(entry.category)) {
      score += 24;
    } else {
      score -= 10;
    }
  }

  if (options.triggered) {
    if (normalizedQuery.includes(normalizedName) || queryTokens.some((token) => normalizedName.startsWith(token))) {
      score += 24;
    }
    if (normalizedQuery.includes(normalizedCommand)) {
      score += 10;
    }
  }

  return {
    entry,
    score,
    matchedTerms: [...matchedTerms]
  };
}

export function searchCommands(
  entries: CommandEntry[],
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const language = options.language ?? inferLanguage(query);
  const limit = options.limit ?? 5;

  const filtered = entries.filter((entry) => {
    if (options.platform && entry.platform !== options.platform) {
      return false;
    }
    if (options.shell && entry.shell !== options.shell) {
      return false;
    }
    return true;
  });

  return filtered
    .map((entry) => scoreEntry(entry, query, language, options))
    .filter((result): result is SearchResult => result !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
