import type { Language, SearchResult } from "./types.js";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function bold(value: string): string {
  return `\u001b[1m${value}\u001b[0m`;
}

export function formatResults(results: SearchResult[], language: Language): string {
  if (results.length === 0) {
    return language === "de"
      ? "Keine Treffer gefunden. Versuche andere Keywords oder entferne Filter."
      : "No matches found. Try different keywords or remove filters.";
  }

  return results
    .map((result, index) => {
      const { entry } = result;
      const lines = [
        `${index + 1}. ${entry.task.replaceAll("_", " ")}`,
        `   COMMAND     : ${bold(entry.command)}`,
        `   description : ${entry.description[language]}`,
        `   example     : ${entry.example}`,
        `   platform    : ${capitalize(entry.platform)}`,
        `   shell       : ${capitalize(entry.shell)}`,
        `   source_type : ${entry.sourceType}`,
        `   category    : ${entry.category}`,
        `   local       : ${entry.locallyAvailable ? "yes" : "no"}`,
        `   warning     : ${entry.dangerLevel}`
      ];
      return lines.join("\n");
    })
    .join("\n\n");
}
