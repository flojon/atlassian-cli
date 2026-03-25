import type { Command } from 'commander';
import { registerSearchCommand } from './search.js';
import { registerGetIssueCommand } from './get-issue.js';

export function registerJiraCommands(program: Command): void {
  const jira = program
    .command('jira')
    .description('Jira commands');

  registerSearchCommand(jira);
  registerGetIssueCommand(jira);
}
