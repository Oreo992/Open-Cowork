import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface EnvCheckResult {
  claudeCodeInstalled: boolean;
  claudeCodeVersion: string | null;
  apiKeyConfigured: boolean;
  claudeConfigExists: boolean;
  allPassed: boolean;
}

/**
 * Get enhanced PATH for finding global npm packages
 */
function getEnhancedPath(): string {
  const home = homedir();
  const currentPath = process.env.PATH || "";

  const additionalPaths = process.platform === "win32"
    ? [
        join(process.env.APPDATA || "", "npm"),
        join(home, "AppData", "Roaming", "npm"),
        join(process.env.LOCALAPPDATA || "", "pnpm"),
        join(home, ".bun", "bin"),
      ]
    : [
        "/usr/local/bin",
        "/opt/homebrew/bin",
        join(home, ".npm-global", "bin"),
        join(home, ".bun", "bin"),
        join(home, ".nvm", "versions", "node", "v20.0.0", "bin"),
        join(home, ".volta", "bin"),
        "/usr/bin",
        "/bin",
      ];

  const separator = process.platform === "win32" ? ";" : ":";
  return [...additionalPaths.filter(p => p), currentPath].join(separator);
}

/**
 * Check if Claude Code CLI is installed
 */
function checkClaudeCodeInstalled(): { installed: boolean; version: string | null } {
  try {
    const enhancedPath = getEnhancedPath();
    const result = execSync("claude --version", {
      encoding: "utf-8",
      timeout: 10000,
      windowsHide: true,
      env: { ...process.env, PATH: enhancedPath }
    }).trim();
    return { installed: true, version: result };
  } catch (error) {
    return { installed: false, version: null };
  }
}

/**
 * Check if API key is configured (either via env var or Claude Code config)
 */
function checkApiKeyConfigured(): boolean {
  // Check environment variable
  if (process.env.ANTHROPIC_API_KEY) {
    return true;
  }

  // Check Claude Code's config directory for authentication
  const claudeConfigDir = join(homedir(), ".claude");
  const credentialsFile = join(claudeConfigDir, ".credentials.json");

  return existsSync(credentialsFile);
}

/**
 * Check if Claude config directory exists
 */
function checkClaudeConfigExists(): boolean {
  const claudeConfigDir = join(homedir(), ".claude");
  return existsSync(claudeConfigDir);
}

/**
 * Run all environment checks
 */
export function checkEnvironment(): EnvCheckResult {
  const claudeCheck = checkClaudeCodeInstalled();
  const apiKeyConfigured = checkApiKeyConfigured();
  const claudeConfigExists = checkClaudeConfigExists();

  const allPassed = claudeCheck.installed && apiKeyConfigured;

  return {
    claudeCodeInstalled: claudeCheck.installed,
    claudeCodeVersion: claudeCheck.version,
    apiKeyConfigured,
    claudeConfigExists,
    allPassed
  };
}

/**
 * Open Claude Code installation page
 */
export function getInstallInstructions(): string {
  return `
Claude Code 安装指南
==================

1. 安装 Claude Code CLI:
   npm install -g @anthropic-ai/claude-code

2. 登录 Claude Code:
   claude login

3. 重启本应用

详细文档: https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview
  `.trim();
}
