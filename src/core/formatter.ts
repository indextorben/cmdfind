import type { Language, SearchResult } from "./types.js";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function bold(value: string): string {
  return `\u001b[1m${value}\u001b[0m`;
}

export function formatResults(results: SearchResult[], language: Language): string {
  const labels =
    language === "de"
      ? {
          command: "BEFEHL",
          note: "notiz",
          example: "beispiel",
          platform: "plattform",
          shell: "shell",
          sourceType: "quelle",
          category: "kategorie",
          local: "lokal",
          warning: "warnstufe",
          yes: "ja",
          no: "nein"
        }
      : {
          command: "COMMAND",
          note: "note",
          example: "example",
          platform: "platform",
          shell: "shell",
          sourceType: "source_type",
          category: "category",
          local: "local",
          warning: "warning",
          yes: "yes",
          no: "no"
        };

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
        `   ${labels.command.padEnd(11)}: ${bold(entry.command)}`,
        `   ${labels.note.padEnd(11)}: ${entry.description[language]}`,
        `   ${labels.example.padEnd(11)}: ${entry.example}`,
        `   ${labels.platform.padEnd(11)}: ${capitalize(entry.platform)}`,
        `   ${labels.shell.padEnd(11)}: ${capitalize(entry.shell)}`,
        `   ${labels.sourceType.padEnd(11)}: ${entry.sourceType}`,
        `   ${labels.category.padEnd(11)}: ${entry.category}`,
        `   ${labels.local.padEnd(11)}: ${entry.locallyAvailable ? labels.yes : labels.no}`,
        `   ${labels.warning.padEnd(11)}: ${entry.dangerLevel}`
      ];
      return lines.join("\n");
    })
    .join("\n\n");
}
