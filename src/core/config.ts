import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Language } from "./types.js";

export interface CmdfindConfig {
  defaultLanguage?: Language;
}

function getConfigDir(): string {
  const customDir = process.env.CMDFIND_CONFIG_DIR;
  const baseDir = customDir || path.join(process.cwd(), ".cmdfind");
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

export function loadConfig(): CmdfindConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as CmdfindConfig;
    return parsed;
  } catch {
    return {};
  }
}

export function saveConfig(config: CmdfindConfig): void {
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
}
