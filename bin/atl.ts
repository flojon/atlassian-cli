#!/usr/bin/env node

import { program } from 'commander';
import { registerJiraCommands } from '../src/commands/jira/index.js';
import { registerConfluenceCommands } from '../src/commands/confluence/index.js';
import { detectOutputMode, outputError } from '../src/output.js';
import { CliError } from '../src/errors.js';

program
  .name('atl')
  .version('0.1.0')
  .description('CLI for Atlassian Jira and Confluence')
  .option('--json', 'Force JSON output')
  .option('--no-color', 'Disable colored output');

registerJiraCommands(program);
registerConfluenceCommands(program);

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
