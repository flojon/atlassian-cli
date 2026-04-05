import type { Command } from 'commander';
import { registerSearchCommand } from './search.js';
import { registerGetIssueCommand } from './get-issue.js';
import { registerCreateIssueCommand } from './create-issue.js';
import { registerUpdateIssueCommand } from './update-issue.js';
import { registerAddCommentCommand } from './add-comment.js';
import { registerGetTransitionsCommand } from './get-transitions.js';
import { registerTransitionIssueCommand } from './transition-issue.js';

export function registerJiraCommands(program: Command): void {
  const jira = program
    .command('jira')
    .description('Jira commands');

  registerSearchCommand(jira);
  registerGetIssueCommand(jira);
  registerCreateIssueCommand(jira);
  registerUpdateIssueCommand(jira);
  registerAddCommentCommand(jira);
  registerGetTransitionsCommand(jira);
  registerTransitionIssueCommand(jira);
}
