import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Language } from "./types.js";

export interface CmdfindConfig {
  defaultLanguage?: Language;
  desktopSearchShortcut?: string;
}

function getDefaultBaseDir(): string {
  const homeDir = os.homedir();
  if (homeDir && homeDir !== path.parse(homeDir).root) {
    return path.join(homeDir, ".cmdfind");
  }

  const appDataDir = process.env.APPDATA || process.env.XDG_CONFIG_HOME;
  if (appDataDir) {
    return path.join(appDataDir, "cmdfind");
  }

  return path.join(os.tmpdir(), ".cmdfind");
}

function getConfigDir(): string {
  const customDir = process.env.CMDFIND_CONFIG_DIR;
  const baseDir = customDir || getDefaultBaseDir();
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
