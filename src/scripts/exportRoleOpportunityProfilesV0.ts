import {
  DEFAULT_PROFILE_GENERATED_AT,
  exportRoleOpportunityProfilesV0Artifact,
  getRoleOpportunityProfileExportPath,
} from '../services/roleOpportunityProfileExportService.ts';

interface CliOptions {
  season: number;
  week: number | null;
  outputPath?: string;
  generatedAt?: string;
}

const parseArgs = (argv: string[]): CliOptions => {
  const byKey = new Map<string, string>();

  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, ...valueParts] = arg.slice(2).split('=');
    byKey.set(key, valueParts.join('='));
  }

  const season = Number(byKey.get('season') ?? '2025');
  const rawWeek = byKey.get('week');
  const week = rawWeek === undefined || rawWeek === 'null' ? null : Number(rawWeek);

  if (!Number.isInteger(season)) throw new Error('Invalid --season. Must be an integer.');
  if (week !== null && (!Number.isInteger(week) || week < 1 || week > 25)) {
    throw new Error('Invalid --week. Must be null or an integer between 1 and 25.');
  }

  return {
    season,
    week,
    outputPath: byKey.get('output') || getRoleOpportunityProfileExportPath(),
    generatedAt: byKey.get('generated-at') || DEFAULT_PROFILE_GENERATED_AT,
  };
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  const result = await exportRoleOpportunityProfilesV0Artifact(options);

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        output_path: result.outputPath,
        artifact: result.artifact.artifact,
        season: result.artifact.season,
        week: result.artifact.week,
        profile_count: result.artifact.profiles.length,
      },
      null,
      2,
    )}\n`,
  );
};

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
