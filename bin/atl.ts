#!/usr/bin/env node

import { readFileSync } from 'fs';
import { program } from 'commander';
import { registerJiraCommands } from '../src/commands/jira/index.js';
import { registerConfluenceCommands } from '../src/commands/confluence/index.js';
import { installSkills, uninstallSkills } from '../src/installer.js';
import { detectOutputMode, outputError } from '../src/output.js';
import { CliError } from '../src/errors.js';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));

program
  .name('atl')
  .version(pkg.version)
  .description(
    'CLI for Atlassian Jira and Confluence — Cloud and Server/Data Center\n\n' +
    'Every command accepts --json (machine-readable output).\n' +
    'Run any command with --help for full details.\n\n' +
    'Setup:\n' +
    '  Set JIRA_URL + auth env vars for Jira\n' +
    '  Set CONFLUENCE_URL + auth env vars for Confluence\n' +
    '  Run `atl install --skills` to install AI agent skill files'
  )
  .option('--json', 'Force JSON output')
  .option('--no-color', 'Disable colored output');

registerJiraCommands(program);
registerConfluenceCommands(program);

program
  .command('install')
  .description('Install components (use --skills to install AI agent skill files)')
  .option('--skills', 'Install AI agent skill files (Claude Code, Copilot, Cursor)')
  .action((opts: { skills?: boolean }) => {
    if (opts.skills) {
      installSkills();
    } else {
      console.log('Usage: atl install --skills\n');
      console.log('Options:');
      console.log('  --skills    Install AI agent skill files (Claude Code, Copilot, Cursor)');
    }
  });

program
  .command('uninstall')
  .description('Uninstall components (use --skills to remove AI agent skill files)')
  .option('--skills', 'Remove AI agent skill files')
  .action((opts: { skills?: boolean }) => {
    if (opts.skills) {
      uninstallSkills();
    } else {
      console.log('Usage: atl uninstall --skills\n');
      console.log('Options:');
      console.log('  --skills    Remove AI agent skill files');
    }
  });

// Global error handler
const originalParse = program.parseAsync.bind(program);
program.parseAsync = async (argv?: string[]) => {
  try {
    return await originalParse(argv);
  } catch (error) {
    const ctx = detectOutputMode(program.opts().json);
    outputError(error, ctx);
    const exitCode = error instanceof CliError ? error.exitCode : 1;
    process.exit(exitCode);
  }
};

program.parseAsync();
