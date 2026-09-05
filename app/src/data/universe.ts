/**
 * Rehearsal universe — SGX-listed candidates across hazard classes for the
 * PLUS session. Hazard classes are our own calls to sanity-check, per the
 * brief; verify current data availability before committing.
 */

import type { HazardClass } from '../engine/types.js';

/** Any stock the app can underwrite — search result or curated pick. */
export interface StockRef {
  ticker: string;
  name: string;
}

export interface UniverseStock extends StockRef {
  expectedHazardClass: HazardClass;
  /** What this name exercises in the worksheet. */
  purpose: string;
}

export const DEMO_UNIVERSE: readonly UniverseStock[] = [
  // Class 1 — REITs, trusts, regulated infrastructure
  { ticker: 'C38U', name: 'CapitaLand Integrated Commercial Trust', expectedHazardClass: 'Class 1', purpose: 'REIT — low-drama floor case' },
  { ticker: 'M44U', name: 'Mapletree Logistics Trust', expectedHazardClass: 'Class 1', purpose: 'REIT — logistics trust' },
  { ticker: 'AJBU', name: 'Keppel DC REIT', expectedHazardClass: 'Class 1', purpose: 'Data-centre REIT' },
  { ticker: 'CJLU', name: 'NetLink NBN Trust', expectedHazardClass: 'Class 1', purpose: 'Regulated fibre infrastructure trust' },
  { ticker: 'HMN', name: 'CapitaLand Ascendas Trust', expectedHazardClass: 'Class 1', purpose: 'REIT — industrial & office' },
  { ticker: 'BUOU', name: 'Frasers Logistics & Commercial Trust', expectedHazardClass: 'Class 1', purpose: 'REIT — logistics & commercial' },
  { ticker: 'N2IU', name: 'Mapletree Pan Asia Commercial Trust', expectedHazardClass: 'Class 1', purpose: 'REIT — pan-Asia commercial' },
  { ticker: 'ME8U', name: 'Mapletree Industrial Trust', expectedHazardClass: 'Class 1', purpose: 'REIT — industrial' },
  // Class 2 — industrials, transport, telcos
  { ticker: 'C52', name: 'ComfortDelGro Corporation', expectedHazardClass: 'Class 2', purpose: 'Transport baseline — calm, large cap' },
  { ticker: 'Z74', name: 'Singapore Telecommunications', expectedHazardClass: 'Class 2', purpose: 'Telco — large cap' },
  { ticker: 'C6L', name: 'Singapore Airlines', expectedHazardClass: 'Class 2', purpose: 'Airline — cyclical transport' },
  { ticker: 'BN4', name: 'Keppel Ltd', expectedHazardClass: 'Class 2', purpose: 'Conglomerate — infrastructure & assets' },
  { ticker: 'U96', name: 'Sembcorp Industries', expectedHazardClass: 'Class 2', purpose: 'Utilities & energy' },
  { ticker: 'S63', name: 'ST Engineering', expectedHazardClass: 'Class 2', purpose: 'Aerospace & defence engineering' },
  // Class 3 — property, construction, agri-commodities
  { ticker: 'C09', name: 'City Developments Ltd', expectedHazardClass: 'Class 3', purpose: 'Property developer — cyclical accounting' },
  { ticker: 'U14', name: 'UOL Group', expectedHazardClass: 'Class 3', purpose: 'Property developer — alternative name' },
  { ticker: '9CI', name: 'CapitaLand Investment', expectedHazardClass: 'Class 3', purpose: 'Real estate investment manager' },
  { ticker: 'F34', name: 'Wilmar International', expectedHazardClass: 'Class 3', purpose: 'Agri-commodities' },
  // Class 4 — financials, offshore & marine, technology
  { ticker: 'D05', name: 'DBS Group Holdings', expectedHazardClass: 'Class 4', purpose: 'Bank — regulatory intensity' },
  { ticker: 'O39', name: 'Oversea-Chinese Banking Corp', expectedHazardClass: 'Class 4', purpose: 'Bank' },
  { ticker: 'U11', name: 'United Overseas Bank', expectedHazardClass: 'Class 4', purpose: 'Bank' },
  { ticker: '5E2', name: 'Seatrium Ltd', expectedHazardClass: 'Class 4', purpose: 'Offshore/marine — stress test' },
  { ticker: 'V03', name: 'Venture Corporation', expectedHazardClass: 'Class 4', purpose: 'Tech manufacturing' },
];
