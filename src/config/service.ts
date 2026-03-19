import packageJson from '../../package.json' with { type: 'json' };

export const SERVICE_NAME = 'role-and-opportunity-model';
export const SERVICE_VERSION = packageJson.version;

export const buildMeta = () => ({
  service: SERVICE_NAME,
  evaluatedAt: new Date().toISOString(),
  version: SERVICE_VERSION,
});
