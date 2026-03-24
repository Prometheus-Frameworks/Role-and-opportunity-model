import { DEFAULT_LAB_GENERATED_AT, exportRoleOpportunityLabArtifact, getRoleOpportunityLabExportPath } from '../services/roleOpportunityLabService.ts';

interface CliOptions {
  season: number;
  week: number;
  outputPath?: string;
  generatedAt?: string;
}

const parseArgs = (argv: string[]): CliOptions => {
  const byKey = new Map<string, string>();

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      continue;
    }

    const [key, ...valueParts] = arg.slice(2).split('=');
    byKey.set(key, valueParts.join('='));
  }

  const season = Number(byKey.get('season') ?? '2025');
  const week = Number(byKey.get('week') ?? '1');

  if (!Number.isInteger(season)) {
    throw new Error('Invalid --season. Must be an integer.');
  }

  if (!Number.isInteger(week) || week < 1 || week > 25) {
    throw new Error('Invalid --week. Must be an integer between 1 and 25.');
  }

  const outputPath = byKey.get('output') || getRoleOpportunityLabExportPath();
  const generatedAt = byKey.get('generated-at') || DEFAULT_LAB_GENERATED_AT;

  return {
    season,
    week,
    outputPath,
    generatedAt,
  };
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  const result = await exportRoleOpportunityLabArtifact(options);

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        output_path: result.outputPath,
        season: result.envelope.season,
        week: result.envelope.week,
        row_count: result.envelope.rows.length,
        season_scope_marker: result.envelope.season_scope_marker,
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
