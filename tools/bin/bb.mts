#!/usr/bin/env node --experimental-strip-types

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

interface ScriptInfo {
  name: string;
  source: "tools" | "agent" | "local";
  command?: string;
  path?: string;
}

main();

function main(): void {
  const args = process.argv.slice(2);
  const currentDir = process.cwd();
  const repoRoot = validateRepo(currentDir);

  if (args.length === 0) {
    showHelp(discoverScripts(repoRoot, currentDir));
    process.exit(0);
  }

  const [scriptName, ...scriptArgs] = args;
  const scripts = discoverScripts(repoRoot, currentDir);

  try {
    execute(scriptName, scriptArgs, scripts, repoRoot, currentDir);
  } catch (_error) {
    process.exit(1);
  }
}

/** @return validated repo root, exits if invalid */
function validateRepo(currentDir: string): string {
  const repoRoot = findRepoRoot(currentDir);
  if (!repoRoot) {
    console.error("Error: Could not find repository root (.git directory)");
    process.exit(1);
  }

  if (!isWeslRepo(repoRoot)) {
    console.error("Error: bb must be run within a wesl-js repository");
    console.error("This directory does not appear to be a wesl-js git branch");
    process.exit(1);
  }

  return repoRoot;
}

/** @return repo root containing .git, or null if not found */
function findRepoRoot(startDir: string): string | null {
  let dir = resolve(startDir);

  while (dir !== "/") {
    if (existsSync(join(dir, ".git"))) {
      return dir;
    }
    const parentDir = dirname(dir);
    if (parentDir === dir) break;
    dir = parentDir;
  }
  return null;
}

/** @return true if repo's initial commit matches wesl-js */
function isWeslRepo(repoRoot: string): boolean {
  try {
    const result = execSync("git rev-list --max-parents=0 HEAD", {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    // Identifies wesl-js repo by its unique initial commit
    const weslInitialCommit = "6f4c51db254c7b86c7fb839f61d85a2af5c37bc1";
    return result === weslInitialCommit;
  } catch {
    return false;
  }
}

/** @return scripts object from package.json, or empty if missing */
function loadScripts(packagePath: string): Record<string, string> {
  if (!existsSync(packagePath)) return {};

  try {
    const content = readFileSync(packagePath, "utf8");
    const pkg = JSON.parse(content);
    return pkg.scripts || {};
  } catch {
    return {};
  }
}

/** @return names of executable files in directory */
function findExecutables(dir: string): string[] {
  if (!existsSync(dir)) return [];

  try {
    return readdirSync(dir).filter(file => {
      try {
        const stat = statSync(join(dir, file));
        return stat.isFile() && (stat.mode & 0o111) !== 0;
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

/** @return all scripts from tools, agent, and local sources */
function discoverScripts(
  repoRoot: string,
  currentDir: string,
): Map<string, ScriptInfo> {
  const scripts = new Map<string, ScriptInfo>();

  // Load tools scripts
  const toolsPackagePath = join(repoRoot, "tools", "package.json");
  const toolsScripts = loadPackageScripts(toolsPackagePath, "tools");
  toolsScripts.forEach(script => scripts.set(script.name, script));

  // Load agent scripts
  const agentScripts = loadAgentScripts(repoRoot);
  agentScripts.forEach(script => scripts.set(script.name, script));

  // Load local scripts (override global ones)
  const localPackagePath = join(currentDir, "package.json");
  if (existsSync(localPackagePath) && localPackagePath !== toolsPackagePath) {
    const localScripts = loadPackageScripts(localPackagePath, "local");
    localScripts.forEach(script => scripts.set(script.name, script));
  }

  return scripts;
}

/** Load scripts from package.json and return as ScriptInfo array */
function loadPackageScripts(
  packagePath: string,
  source: "tools" | "local",
): ScriptInfo[] {
  if (!existsSync(packagePath)) return [];
  
  const packageScripts = loadScripts(packagePath);
  return Object.entries(packageScripts).map(([name, command]) => ({
    name,
    source,
    command,
  }));
}

/** Load agent scripts from .agent/bin directory */
function loadAgentScripts(repoRoot: string): ScriptInfo[] {
  const agentBinDir = join(repoRoot, ".agent", "bin");
  const executables = findExecutables(agentBinDir);
  
  return executables.map(exe => ({
    name: exe,
    source: "agent" as const,
    path: join(agentBinDir, exe),
  }));
}

/** Execute discovered script or pass through to pnpm */
function execute(
  scriptName: string,
  scriptArgs: string[],
  scripts: Map<string, ScriptInfo>,
  repoRoot: string,
  currentDir: string,
): void {
  const scriptInfo = scripts.get(scriptName);

  if (scriptInfo) {
    runScript(scriptInfo, scriptArgs, repoRoot, currentDir);
  } else {
    // Pass unknown commands directly to pnpm
    const cmd = `pnpm ${scriptName} ${scriptArgs.join(" ")}`.trim();
    execSync(cmd, { stdio: "inherit", cwd: currentDir });
  }
}

/** Run script using appropriate method for its source */
function runScript(
  scriptInfo: ScriptInfo,
  args: string[],
  repoRoot: string,
  currentDir: string,
): void {
  const { source, name, path } = scriptInfo;

  if (source === "agent" && path) {
    runAgentScript(scriptInfo, args, currentDir);
  } else if (source === "local") {
    runPnpmScript(name, args, currentDir);
  } else if (source === "tools") {
    runPnpmScript(name, args, join(repoRoot, "tools"));
  }
}

/** Run agent executable directly */
function runAgentScript(
  scriptInfo: ScriptInfo,
  args: string[],
  currentDir: string,
): void {
  const cmd = `${scriptInfo.path!} ${quoteArgs(args)}`.trim();
  execSync(cmd, { stdio: "inherit", cwd: currentDir });
}

/** Run script via pnpm */
function runPnpmScript(scriptName: string, args: string[], cwd: string): void {
  const cmd = `pnpm run ${scriptName} ${quoteArgs(args)}`.trim();
  execSync(cmd, { stdio: "inherit", cwd });
}

/** @return shell-safe quoted arguments */
function quoteArgs(args: string[]): string {
  return args
    .map(arg =>
      /[\s"'`$|&;<>()\\]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg,
    )
    .join(" ");
}

/** Print usage and available scripts */
function showHelp(scripts: Map<string, ScriptInfo>): void {
  console.log("Usage: bb <script> [args...]");
  console.log("\nAvailable scripts:");

  printGroup(filterBySource(scripts, "local"), "Local (current directory)");
  printGroup(
    filterBySource(scripts, "tools"),
    "Tools (from tools/package.json)",
  );
  printGroup(filterBySource(scripts, "agent"), "Agent (from .agent/bin)");

  console.log("\nAny other command will be passed through to pnpm.");
}

/** Print script group with title */
function printGroup(scripts: ScriptInfo[], title: string): void {
  if (scripts.length === 0) return;
  console.log(`\n  ${title}:`);
  scripts.forEach(script => console.log(`    ${script.name}`));
}

/** @return scripts matching the given source */
function filterBySource(
  scripts: Map<string, ScriptInfo>,
  source: string,
): ScriptInfo[] {
  return Array.from(scripts.values()).filter(s => s.source === source);
}
