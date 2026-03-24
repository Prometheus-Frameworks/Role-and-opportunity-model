import { filterRoleOpportunityLabEnvelope, readRoleOpportunityLabArtifact } from '../services/roleOpportunityLabService.ts';

const parseOptionalInteger = (value: string | null) => {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
};

export const getRoleOpportunityLab = async (request: Request) => {
  const url = new URL(request.url);
  const season = parseOptionalInteger(url.searchParams.get('season'));
  const week = parseOptionalInteger(url.searchParams.get('week'));

  if (season === null || week === null) {
    return {
      status: 400,
      body: {
        error: 'Invalid query params',
        details: [
          ...(season === null ? [{ field: 'query.season', message: 'must be an integer' }] : []),
          ...(week === null ? [{ field: 'query.week', message: 'must be an integer' }] : []),
        ],
      },
    };
  }

  try {
    const envelope = await readRoleOpportunityLabArtifact();
    return {
      status: 200,
      body: filterRoleOpportunityLabEnvelope(envelope, {
        season,
        week,
      }),
    };
  } catch (error) {
    return {
      status: 404,
      body: {
        error: 'Role opportunity lab artifact not found',
        details: [
          {
            field: 'artifact',
            message: error instanceof Error ? error.message : 'unknown read error',
          },
        ],
      },
    };
  }
};
