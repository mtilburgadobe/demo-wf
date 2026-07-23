/**
 * Mortgage rate data for the segmented rate widget (Tabs block, `segmented` variant).
 *
 * Rates are injected client-side by tabs.js so the page content only carries an
 * empty rate widget — this module is the single source of truth for rate rows.
 * Keyed by the tab id (toClassName of the tab label, e.g. "Home Purchase" →
 * "home-purchase").
 *
 * Each tab entry:
 *   summary    — inputs summary line shown above the rate cards
 *   columns    — column labels, in order (Loan / Interest / APR / Points)
 *   rows       — [loan, interest, apr, points] per rate card
 *   disclosure — rates/terms disclaimer shown below the cards
 */
export const RATE_COLUMNS = ['Loan', 'Interest', 'APR', 'Points'];

export const RATE_AS_OF = '7/03/2026 10:16 AM Eastern Daylight Time';

const DISCLOSURE = `Rates, terms, and fees as of ${RATE_AS_OF} and subject to change without notice. Select a product to view important disclosures, payments, assumptions, and APR information. Please note we offer additional home loan options not displayed here.`;

const rates = {
  'home-purchase': {
    summary: 'These rates are based on a home in Austin, TX with a purchase price of $400,000 and a down payment of $80,000.',
    columns: RATE_COLUMNS,
    rows: [
      ['15-Year Fixed Rate', '5.625%', '5.874%', '$2,800'],
      ['30-Year Fixed-Rate VA', '5.750%', '5.971%', '$2,835'],
      ['7/6-Month ARM', '6.000%', '6.345%', '$3,200'],
      ['30-Year Fixed Rate', '6.500%', '6.644%', '$2,400'],
    ],
    disclosure: DISCLOSURE,
  },
  refinance: {
    summary: 'These rates are based on a home in Austin, TX with an estimated value of $400,000 and a loan balance of $250,000.',
    columns: RATE_COLUMNS,
    rows: [
      ['15-Year Fixed Rate', '5.750%', '5.998%', '$2,750'],
      ['30-Year Fixed-Rate VA', '5.875%', '6.096%', '$2,790'],
      ['7/6-Month ARM', '6.125%', '6.470%', '$3,150'],
      ['30-Year Fixed Rate', '6.625%', '6.769%', '$2,350'],
    ],
    disclosure: DISCLOSURE,
  },
};

export default rates;
