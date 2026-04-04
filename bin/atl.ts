#!/usr/bin/env node

import { program } from 'commander';
import { registerJiraCommands } from '../src/commands/jira/index.js';
import { registerConfluenceCommands } from '../src/commands/confluence/index.js';
import { installSkills, uninstallSkills } from '../src/installer.js';
import { detectOutputMode, outputError } from '../src/output.js';
import { CliError } from '../src/errors.js';

program
  .name('atl')
  .version('0.1.0')
  .description(
    'CLI for Atlassian Jira and Confluence — Cloud and Server/Data Center\n\n' +
    'Every command accepts --json (machine-readable output).\n' +
    'Run any command with --help for full details.\n\n' +
    'Setup:\n' +
    '  Set JIRA_URL + auth env vars for Jira\n' +
    '  Set CONFLUENCE_URL + auth env vars for Confluence\n' +
    '  Run `atl install` to install AI agent skill files'
  )
  .option('--json', 'Force JSON output')
  .option('--no-color', 'Disable colored output');

registerJiraCommands(program);
registerConfluenceCommands(program);

program
  .command('install')
  .description('Install atl skill files into AI agent directories (Claude Code, Copilot, Cursor)')
  .action(() => {
    installSkills();
  });

program
  .command('uninstall')
  .description('Remove atl skill files from AI agent directories')
  .action(() => {
    uninstallSkills();
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
