export type Platform = "windows" | "linux" | "macos";

export type Shell = "powershell" | "bash" | "zsh";

export type WarningLevel = "safe" | "careful" | "dangerous";

export type Language = "de" | "en";

export type SourceType = "external" | "builtin" | "powershell" | "alias" | "function";

export interface LocalizedText {
  de: string;
  en: string;
}

export interface CommandEntry {
  id: string;
  task: string;
  name: string;
  platform: Platform;
  shell: Shell;
  sourceType: SourceType;
  locallyAvailable: boolean;
  category: string;
  dangerLevel: WarningLevel;
  warning?: WarningLevel;
  command: string;
  example: string;
  description: LocalizedText;
  keywords: {
    de: string[];
    en: string[];
  };
}

export interface SearchOptions {
  platform?: Platform;
  shell?: Shell;
  currentPlatform?: Platform;
  currentShell?: Shell;
  language?: Language;
  limit?: number;
  preferLocal?: boolean;
  preferAdmin?: boolean;
  triggered?: boolean;
}

export interface SearchResult {
  entry: CommandEntry;
  score: number;
  matchedTerms: string[];
}
