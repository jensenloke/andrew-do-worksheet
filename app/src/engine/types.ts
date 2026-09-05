/**
 * Worksheet input types — mirrors the yellow cells of DO_Worksheet_SGX_Simple.xlsx.
 * Percentages are decimals: an 18% decline is -0.18, a 42% free float is 0.42.
 */

export type ProfitHistory = 'All three' | 'Two of three' | 'One of three' | 'None';
export type CapitalRaising = 'None' | 'Placement or rights issue' | 'IPO or RTO';
export type AuditOpinion = 'Unqualified' | 'Qualified' | 'Disclaimer' | 'Adverse';

/** Part 1 — the 20 questions. */
export interface RiskAnswers {
  /** Q1. Market capitalisation in S$m. THE exposure base. */
  q1MarketCap: number;
  /** Q2. Free float as a fraction (0..1). */
  q2FreeFloat: number;
  /** Q3. Share price movement over 12 months, negative for a fall (-0.18 = down 18%). */
  q3SharePriceMove: number;
  /** Q4. Assets or revenue outside Singapore, whichever is higher (0..1). */
  q4ForeignPct: number;
  /** Q5. Net gearing (net debt / equity). Use 999 when equity is negative. */
  q5NetGearing: number;
  /** Q6. Profitable in each of the last three financial years? */
  q6ProfitHistory: ProfitHistory;
  /** Q7. Profit warning, restatement or material adverse announcement in last 12 months? */
  q7AdverseAnnouncement: boolean;
  /** Q8. Independent directors as a fraction of the board (0..1). */
  q8IndependentDirectors: number;
  /** Q9. Largest shareholder holding as a fraction (0..1). */
  q9LargestShareholder: number;
  /** Q10. Audit opinion, most recent. */
  q10AuditOpinion: AuditOpinion;
  /** Q11. Change of external auditor in the last 3 years? */
  q11AuditorChanged: boolean;
  /** Q12. CEO or CFO change in the last 24 months? */
  q12CeoCfoChanged: boolean;
  /** Q13. SGX queries received in the last 24 months (count). */
  q13SgxQueries: number;
  /** Q14. Watch-list, trading suspension or regulatory investigation? */
  q14WatchListOrInvestigation: boolean;
  /** Q15. US securities exposure. 'None' or a description of the exposure. */
  q15UsSecurities: string;
  /** Q16. IPO, RTO or capital raising in the last 24 months? */
  q16CapitalRaising: CapitalRaising;
  /** Q17. D&O claims or notifications in the last 5 years (count, notifications included). */
  q17Claims: number;
  /** Q18. Known circumstance disclosed but not yet notified? */
  q18KnownCircumstance: boolean;
  /** Q19. Has any insurer declined, cancelled or non-renewed D&O cover? */
  q19PreviouslyDeclined: boolean;
  /** Q20. Expiring premium for the same limit and share, S$. 0 for new business. */
  q20ExpiringPremium: number;
}

/** Part 2 — the structure. */
export type LimitOption = 'S$5m' | 'S$10m' | 'S$15m' | 'S$20m' | 'S$25m' | 'S$30m' | 'S$50m';
export type RetentionOption = 'SGD 100k' | 'SGD 250k' | 'SGD 500k' | 'SGD 1m' | 'SGD 2.5m';
export type HazardClass = 'Class 1' | 'Class 2' | 'Class 3' | 'Class 4' | 'Class 5';

export interface Structure {
  limit: LimitOption;
  retention: RetentionOption;
  hazardClass: HazardClass;
}

/** Part 3 — the five modifiers (1.00 = neutral). */
export interface Modifiers {
  financialStrength: number;
  governanceAndOwnership: number;
  sharePriceAndFloat: number;
  regulatoryGeographyTransactions: number;
  claimsAndInsuranceHistory: number;
}

/** Part 4C — risk-specific exclusions and extensions. */
export type ExclusionId =
  | 'majorShareholder'
  | 'usSecurities'
  | 'publicOffering'
  | 'specificMatter'
  | 'specificInvestigation'
  | 'ipt'
  | 'territorial'
  | 'insolvency'
  | 'specificPriorClaims';

export type ExtensionId =
  | 'fullInvestigationCosts'
  | 'broadEpl'
  | 'extendedReportingPeriod'
  | 'runOffBeyondSixYears';

/** Part 4A — sublimit categories. */
export type SublimitId =
  | 'emergencyLegal'
  | 'investigation'
  | 'epl'
  | 'crisis'
  | 'extradition'
  | 'reputation'
  | 'deprivation'
  | 'sideC';

/** Risk Narrative tab — the four assessment dropdowns plus cross-check inputs. */
export type LitigationExposure = 'Low' | 'Moderate' | 'High';
export type FinancialStrengthCall = 'Strong' | 'Adequate' | 'Weak' | 'Serious concern';
export type ManagementStrengthCall = 'Strong' | 'Adequate' | 'Weak';
export type GovernanceConcernCall = 'None' | 'Minor' | 'Material';

export interface NarrativeAssessment {
  /** True when all twelve narrative fields are filled (else the sheet refers as incomplete). */
  complete: boolean;
  litigationExposure: LitigationExposure;
  financialStrength: FinancialStrengthCall;
  managementStrength: ManagementStrengthCall;
  governanceConcern: GovernanceConcernCall;
  /** Count of key officers with finance or accounting experience. */
  keyOfficersWithFinanceExperience: number;
  /** Whether any key officer rows were entered at all. */
  keyOfficersEntered: boolean;
  /** Most recent shareholders' equity, S$m (negative equity refers). */
  shareholdersEquity: number;
  /** Three-year net profit history entered in the narrative, for the Q6 cross-check. */
  profitByYear: [number, number, number];
}

/** Everything the agent (or a human) fills in. */
export interface WorksheetInput {
  risk: RiskAnswers;
  structure: Structure;
  modifiers: Modifiers;
  appliedExclusions: ExclusionId[];
  appliedExtensions?: ExtensionId[];
  /** Agreed sublimits; omitted entries fall back to the suggested level. */
  agreedSublimits?: Partial<Record<SublimitId, number>>;
  /** Part 5 knobs with sheet defaults. */
  permissibleLossRatio?: number;
  marketAdjustment?: number;
  participation?: number;
  narrative?: NarrativeAssessment;
}
