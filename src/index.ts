export { loadCommands, mergeLocalAvailability } from "./core/database.js";
export { formatResults } from "./core/formatter.js";
export { discoverAndIndexLocalCommands, getIndexLocation } from "./core/local-index.js";
export { searchCommands } from "./core/search.js";
export type {
  CommandEntry,
  Language,
  Platform,
  SearchOptions,
  SearchResult,
  Shell,
  SourceType,
  WarningLevel
} from "./core/types.js";
