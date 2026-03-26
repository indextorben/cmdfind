import { describe, expect, it } from "vitest";
import { loadCommands } from "../src/core/database.js";
import { searchCommands } from "../src/core/search.js";
import type { CommandEntry } from "../src/core/types.js";

const entries = loadCommands();

describe("searchCommands", () => {
  it("finds German query for large files on Linux Bash", () => {
    const results = searchCommands(entries, "grosse dateien finden", {
      platform: "linux",
      shell: "bash",
      language: "de"
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.task).toBe("find_large_files");
  });

  it("finds English query for large files on Windows PowerShell", () => {
    const results = searchCommands(entries, "find large files", {
      platform: "windows",
      shell: "powershell",
      language: "en"
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.id).toContain("find_large_files_windows_powershell");
  });

  it("finds process kill command by German port query", () => {
    const results = searchCommands(entries, "Prozess auf Port 3000 beenden", {
      platform: "windows",
      shell: "powershell",
      language: "de"
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.task).toBe("kill_process_on_port");
  });

  it("respects filters and returns empty for impossible combination", () => {
    const results = searchCommands(entries, "kill process on port", {
      platform: "linux",
      shell: "powershell",
      language: "en"
    });

    expect(results).toHaveLength(0);
  });

  it("prefers locally available commands with same intent", () => {
    const mock: CommandEntry[] = [
      {
        id: "a",
        task: "http_request",
        name: "curl",
        platform: "linux",
        shell: "bash",
        sourceType: "external",
        locallyAvailable: false,
        category: "http",
        dangerLevel: "safe",
        command: "curl -I https://example.com",
        example: "curl https://example.com",
        description: { de: "HTTP Anfrage", en: "HTTP request" },
        keywords: { de: ["curl", "http"], en: ["curl", "http"] }
      },
      {
        id: "b",
        task: "http_request",
        name: "curl",
        platform: "linux",
        shell: "bash",
        sourceType: "external",
        locallyAvailable: true,
        category: "http",
        dangerLevel: "safe",
        command: "curl -I https://example.com",
        example: "curl https://example.com",
        description: { de: "Lokale HTTP Anfrage", en: "Local HTTP request" },
        keywords: { de: ["curl", "http"], en: ["curl", "http"] }
      }
    ];

    const results = searchCommands(mock, "curl request", {
      language: "en",
      currentPlatform: "linux",
      currentShell: "bash"
    });
    expect(results[0].entry.id).toBe("b");
  });

  it("prefers current OS command over other OS for admin query", () => {
    const mock: CommandEntry[] = [
      {
        id: "linux-netstat",
        task: "show_connections",
        name: "ss",
        platform: "linux",
        shell: "bash",
        sourceType: "external",
        locallyAvailable: true,
        category: "network",
        dangerLevel: "safe",
        command: "ss -tulpen",
        example: "ss -tuln",
        description: { de: "Linux Ports", en: "Linux ports" },
        keywords: { de: ["ports", "netzwerk"], en: ["ports", "network"] }
      },
      {
        id: "windows-netstat",
        task: "show_connections",
        name: "netstat",
        platform: "windows",
        shell: "powershell",
        sourceType: "external",
        locallyAvailable: true,
        category: "network",
        dangerLevel: "safe",
        command: "netstat -ano",
        example: "netstat -ano",
        description: { de: "Windows Ports", en: "Windows ports" },
        keywords: { de: ["ports", "netzwerk"], en: ["ports", "network"] }
      }
    ];

    const results = searchCommands(mock, "list network ports", {
      language: "en",
      currentPlatform: "linux",
      currentShell: "bash",
      preferAdmin: true
    });
    expect(results[0].entry.id).toBe("linux-netstat");
  });

  it("boosts exact command-name matches when query is trigger-marked", () => {
    const mock: CommandEntry[] = [
      {
        id: "generic-network",
        task: "network_task",
        name: "networktool",
        platform: "linux",
        shell: "bash",
        sourceType: "external",
        locallyAvailable: true,
        category: "network",
        dangerLevel: "safe",
        command: "networktool --scan",
        example: "networktool --scan",
        description: { de: "Netzwerk Tool", en: "Network tool" },
        keywords: { de: ["ping"], en: ["ping"] }
      },
      {
        id: "exact-ping",
        task: "network_ping",
        name: "ping",
        platform: "linux",
        shell: "bash",
        sourceType: "external",
        locallyAvailable: true,
        category: "network",
        dangerLevel: "safe",
        command: "ping -c 4 8.8.8.8",
        example: "ping -c 4 8.8.8.8",
        description: { de: "Ping", en: "Ping" },
        keywords: { de: ["netzwerk"], en: ["network"] }
      }
    ];

    const results = searchCommands(mock, "ping", {
      language: "en",
      currentPlatform: "linux",
      currentShell: "bash",
      triggered: true
    });
    expect(results[0].entry.id).toBe("exact-ping");
  });
});
