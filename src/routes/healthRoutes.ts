import { buildReadinessSnapshot, SERVICE_NAME } from '../config/service.ts';

export const getHealthResponse = () => ({
  ok: true,
  service: SERVICE_NAME,
});

export const getReadinessResponse = () => buildReadinessSnapshot();
