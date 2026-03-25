export type AuthMethod =
  | { type: 'basic'; username: string; token: string }
  | { type: 'pat'; token: string };

export type DeploymentType = 'cloud' | 'server';

export interface ServiceConfig {
  baseUrl: string;
  auth: AuthMethod;
  deployment: DeploymentType;
  sslVerify: boolean;
}

export interface Config {
  jira?: ServiceConfig;
  confluence?: ServiceConfig;
}
