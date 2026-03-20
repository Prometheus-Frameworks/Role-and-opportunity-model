import packageJson from '../../package.json' with { type: 'json' };

export const SERVICE_NAME = 'role-and-opportunity-model';
export const SERVICE_VERSION = packageJson.version;

const readTrimmed = (value: string | undefined, fallback: string) => value?.trim() || fallback;

export interface RuntimeConfig {
  port: number;
  host: string;
  tiberDataBaseUrl: string;
}

export const getRuntimeConfig = (): RuntimeConfig => {
  const portValue = process.env.PORT?.trim();
  const parsedPort = portValue ? Number(portValue) : 3000;

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const host = readTrimmed(process.env.HOST, '0.0.0.0');
  const tiberDataBaseUrl = readTrimmed(process.env.TIBER_DATA_BASE_URL, 'http://localhost:3001');

  try {
    new URL(tiberDataBaseUrl);
  } catch {
    throw new Error('TIBER_DATA_BASE_URL must be a valid absolute URL.');
  }

  return {
    port: parsedPort,
    host,
    tiberDataBaseUrl,
  };
};

export const TIBER_DATA_BASE_URL = getRuntimeConfig().tiberDataBaseUrl;

export const buildMeta = () => ({
  service: SERVICE_NAME,
  evaluatedAt: new Date().toISOString(),
  version: SERVICE_VERSION,
});

export const buildReadinessSnapshot = () => {
  const config = getRuntimeConfig();

  return {
    ok: true,
    service: SERVICE_NAME,
    checks: {
      config: true,
      upstreamBaseUrl: config.tiberDataBaseUrl,
    },
  };
};
