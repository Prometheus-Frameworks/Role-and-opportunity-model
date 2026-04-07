import {
  DEFAULT_LAB_GENERATED_AT,
  exportRoleOpportunityLabArtifact,
  exportRoleOpportunityLabArtifactFromUpstream,
  getRoleOpportunityLabExportPath,
} from '../services/roleOpportunityLabService.ts';

type ExportSource = 'upstream' | 'seeded';

interface CliOptions {
  season: number;
  week: number;
  outputPath?: string;
  generatedAt?: string;
  source: ExportSource;
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
  const source = (byKey.get('source') as ExportSource) ?? 'upstream';

  if (!Number.isInteger(season)) {
    throw new Error('Invalid --season. Must be an integer.');
  }

  if (!Number.isInteger(week) || week < 1 || week > 25) {
    throw new Error('Invalid --week. Must be an integer between 1 and 25.');
  }

  if (source !== 'upstream' && source !== 'seeded') {
    throw new Error('Invalid --source. Must be "upstream" or "seeded".');
  }

  const outputPath = byKey.get('output') || getRoleOpportunityLabExportPath();
  const generatedAt = byKey.get('generated-at') || DEFAULT_LAB_GENERATED_AT;

  return {
    season,
    week,
    outputPath,
    generatedAt,
    source,
  };
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));

  const exportFn =
    options.source === 'upstream'
      ? exportRoleOpportunityLabArtifactFromUpstream
      : exportRoleOpportunityLabArtifact;

  const result = await exportFn({
    season: options.season,
    week: options.week,
    generatedAt: options.generatedAt,
    outputPath: options.outputPath,
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        output_path: result.outputPath,
        season: result.envelope.season,
        week: result.envelope.week,
        row_count: result.envelope.rows.length,
        season_scope_marker: result.envelope.season_scope_marker,
        source: result.envelope.source,
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
