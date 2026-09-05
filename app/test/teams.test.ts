import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildTeams, SUBAGENT_SPECS } from '../src/agent/subagents.js';

describe('buildTeams', () => {
  it('returns the requested number of teams, clamped to 1–5', () => {
    expect(buildTeams(2)).toHaveLength(2);
    expect(buildTeams(5)).toHaveLength(5);
    expect(buildTeams(0)).toHaveLength(1);
    expect(buildTeams(9)).toHaveLength(5);
  });

  it('keeps every specialist brief covered exactly once, for every team count', () => {
    const all = SUBAGENT_SPECS.map((s) => s.id).sort();
    for (const n of [1, 2, 3, 4, 5]) {
      const ids = buildTeams(n)
        .flatMap((t) => t.id.split('+'))
        .sort();
      expect(ids, `team count ${n}`).toEqual(all);
    }
  });

  it('merged team schema carries every field of its member briefs', () => {
    const [team] = buildTeams(1);
    const shape = (team!.schema as z.ZodObject<Record<string, z.ZodTypeAny>>).shape;
    for (const spec of SUBAGENT_SPECS) {
      for (const key of Object.keys(spec.schema.shape)) {
        expect(shape[key], `missing ${key} in merged schema`).toBeDefined();
      }
    }
  });

  it('scales the step budget with team size', () => {
    const [solo] = buildTeams(1);
    expect(solo!.size).toBe(5);
    const pairs = buildTeams(2);
    expect(pairs.every((t) => (t.size ?? 1) >= 1)).toBe(true);
  });

  it('accepts a report that omits dataGaps (models drop empty arrays)', () => {
    // Regression: DGX omitted dataGaps, zod rejected the tool input, the SDK
    // fed the error back and both teams burned their whole step budget.
    const minimal: Record<string, unknown> = {
      market: {
        q1MarketCap: { value: 21318.8, rationale: 'r', source: 's' },
        q3SharePriceMove: { value: 0.029, rationale: 'r', source: 's' },
        q4ForeignPct: { value: 0.41, rationale: 'r', source: 's' },
        q15UsSecurities: { value: 'None', rationale: 'r', source: 's' },
        q16CapitalRaising: { value: 'None', rationale: 'r', source: 's' },
        businessSummary: 'summary',
      },
      financials: {
        q5NetGearing: { value: 0.5, rationale: 'r', source: 's' },
        q6ProfitHistory: { value: 'All three', rationale: 'r', source: 's' },
        profitByYear: [1, 2, 3],
        shareholdersEquity: 100,
        financialTrend: 'up',
        financialRedFlags: 'None identified',
        financialStrength: 'Strong',
      },
      governance: {
        q8IndependentDirectors: { value: 0.6, rationale: 'r', source: 's' },
        q10AuditOpinion: { value: 'Unqualified', rationale: 'r', source: 's' },
        q11AuditorChanged: { value: false, rationale: 'r', source: 's' },
        q12CeoCfoChanged: { value: false, rationale: 'r', source: 's' },
        keyOfficersWithFinanceExperience: 2,
        governanceSummary: 'summary',
        managementStrength: 'Strong',
        governanceConcern: 'None',
      },
      shareholding: {
        q2FreeFloat: { value: 0.49, rationale: 'r', source: 's' },
        q9LargestShareholder: { value: 0.29, rationale: 'r', source: 's' },
        largestShareholderName: 'Temasek',
        iptObservations: 'None identified',
      },
      adverse: {
        q7AdverseAnnouncement: { value: false, rationale: 'r', source: 's' },
        q13SgxQueries: { value: 0, rationale: 'r', source: 's' },
        q14WatchListOrInvestigation: { value: false, rationale: 'r', source: 's' },
        adverseNews: 'None identified',
        regulatoryActions: 'None identified',
        litigation: 'None identified',
        litigationExposure: 'Low',
      },
    };
    for (const spec of SUBAGENT_SPECS) {
      const parsed = spec.schema.safeParse(minimal[spec.id]);
      expect(parsed.success, `${spec.id}: ${JSON.stringify(parsed.success ? null : parsed.error!.issues.map((i) => i.path.join('.')))}`).toBe(true);
      if (parsed.success) expect(parsed.data.dataGaps).toEqual([]);
    }
  });
});
