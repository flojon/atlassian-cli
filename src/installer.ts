import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SKILL_NAME = 'atl';
const MARKER = '<!-- atl-skill -->';

function getSkillSource(): string {
  // When installed via npm, skill file is at dist/src/skills/atl/SKILL.md
  // relative to this file (dist/src/installer.js)
  const candidate = join(__dirname, 'skills', SKILL_NAME, 'SKILL.md');
  if (existsSync(candidate)) {
    return candidate;
  }
  throw new Error(
    `Could not locate SKILL.md (looked at ${candidate}). ` +
    'Re-install atl-cli or run from the project root.',
  );
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function installSkills(): void {
  let sourcePath: string;
  try {
    sourcePath = getSkillSource();
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
    return;
  }

  const skillContent = readFileSync(sourcePath, 'utf-8');
  const home = homedir();
  const installed: string[] = [];
  const skipped: string[] = [];

  // ── Claude Code ──────────────────────────────────────────────────────
  const claudeTarget = join(home, '.claude', 'skills', SKILL_NAME, 'SKILL.md');
  ensureDir(dirname(claudeTarget));
  copyFileSync(sourcePath, claudeTarget);
  installed.push(`Claude Code  →  ${claudeTarget}`);

  // ── Cursor ───────────────────────────────────────────────────────────
  const cursorRulesDir = join(home, '.cursor', 'rules');
  if (existsSync(cursorRulesDir)) {
    const cursorTarget = join(cursorRulesDir, `${SKILL_NAME}.md`);
    copyFileSync(sourcePath, cursorTarget);
    installed.push(`Cursor       →  ${cursorTarget}`);
  } else {
    skipped.push('Cursor (~/.cursor/rules not found — open Cursor at least once to create it)');
  }

  // ── Copilot (standalone) ─────────────────────────────────────────────
  const copilotSkillsTarget = join(home, '.copilot', 'skills', SKILL_NAME, 'SKILL.md');
  ensureDir(dirname(copilotSkillsTarget));
  copyFileSync(sourcePath, copilotSkillsTarget);
  installed.push(`Copilot      →  ${copilotSkillsTarget}`);

  // ── GitHub Copilot (append to .github/copilot-instructions.md) ──────
  const copilotDir = '.github';
  const copilotTarget = join(copilotDir, 'copilot-instructions.md');
  if (existsSync(copilotDir)) {
    let newContent: string;
    if (existsSync(copilotTarget)) {
      const existing = readFileSync(copilotTarget, 'utf-8');
      if (existing.includes(MARKER)) {
        // Already present — replace block
        const beforeIdx = existing.indexOf(MARKER);
        const afterIdx = existing.indexOf(MARKER, beforeIdx + MARKER.length);
        if (afterIdx !== -1) {
          const before = existing.slice(0, beforeIdx);
          const tail = existing.slice(afterIdx + MARKER.length);
          newContent = before + MARKER + '\n' + skillContent + '\n' + MARKER + tail;
        } else {
          newContent = existing + `\n\n${MARKER}\n${skillContent}\n${MARKER}\n`;
        }
      } else {
        newContent = existing + `\n\n${MARKER}\n${skillContent}\n${MARKER}\n`;
      }
    } else {
      newContent = `${MARKER}\n${skillContent}\n${MARKER}\n`;
    }
    writeFileSync(copilotTarget, newContent, 'utf-8');
    installed.push(`GitHub Copilot  →  ${resolve(copilotTarget)}`);
  } else {
    skipped.push('GitHub Copilot (.github/ not found — run from the root of a git repo)');
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\natl skills installed:');
  for (const msg of installed) {
    console.log(`  ✓  ${msg}`);
  }

  if (skipped.length) {
    console.log('\nSkipped (target not detected):');
    for (const msg of skipped) {
      console.log(`  -  ${msg}`);
    }
  }
}

export function uninstallSkills(): void {
  const home = homedir();
  const removed: string[] = [];
  const skipped: string[] = [];

  // ── Claude Code ──────────────────────────────────────────────────────
  const claudeTarget = join(home, '.claude', 'skills', SKILL_NAME, 'SKILL.md');
  if (existsSync(claudeTarget)) {
    unlinkSync(claudeTarget);
    try { rmdirSync(dirname(claudeTarget)); } catch { /* not empty */ }
    removed.push(`Claude Code  →  ${claudeTarget}`);
  } else {
    skipped.push('Claude Code (not installed)');
  }

  // ── Cursor ───────────────────────────────────────────────────────────
  const cursorTarget = join(home, '.cursor', 'rules', `${SKILL_NAME}.md`);
  if (existsSync(cursorTarget)) {
    unlinkSync(cursorTarget);
    removed.push(`Cursor       →  ${cursorTarget}`);
  } else {
    skipped.push('Cursor (not installed)');
  }

  // ── Copilot (standalone) ─────────────────────────────────────────────
  const copilotSkillsTarget = join(home, '.copilot', 'skills', SKILL_NAME, 'SKILL.md');
  if (existsSync(copilotSkillsTarget)) {
    unlinkSync(copilotSkillsTarget);
    try { rmdirSync(dirname(copilotSkillsTarget)); } catch { /* not empty */ }
    removed.push(`Copilot      →  ${copilotSkillsTarget}`);
  } else {
    skipped.push('Copilot (not installed)');
  }

  // ── GitHub Copilot ───────────────────────────────────────────────────
  const copilotTarget = join('.github', 'copilot-instructions.md');
  if (existsSync(copilotTarget)) {
    const existing = readFileSync(copilotTarget, 'utf-8');
    if (existing.includes(MARKER)) {
      const beforeIdx = existing.indexOf(MARKER);
      const afterIdx = existing.indexOf(MARKER, beforeIdx + MARKER.length);
      if (afterIdx !== -1) {
        const before = existing.slice(0, beforeIdx);
        const tail = existing.slice(afterIdx + MARKER.length);
        const newContent = (before + tail).trim();
        if (newContent) {
          writeFileSync(copilotTarget, newContent + '\n', 'utf-8');
        } else {
          unlinkSync(copilotTarget);
        }
        removed.push(`GitHub Copilot  →  ${resolve(copilotTarget)}`);
      }
    } else {
      skipped.push('GitHub Copilot (atl block not found)');
    }
  } else {
    skipped.push('GitHub Copilot (.github/copilot-instructions.md not found)');
  }

  // ── Summary ──────────────────────────────────────────────────────────
  if (removed.length) {
    console.log('\natl skills removed:');
    for (const msg of removed) {
      console.log(`  ✓  ${msg}`);
    }
  } else {
    console.log('\nNothing to remove — atl skills were not installed.');
  }

  if (skipped.length) {
    console.log('\nSkipped (not found):');
    for (const msg of skipped) {
      console.log(`  -  ${msg}`);
    }
  }
}
