/* eslint-disable */
/* global WebImporter */

/**
 * Parser: table
 * Base block: Table (Block Collection)
 * Source selector: .index__segmentedContainer___JQRgw (rate widget) — rate rows
 * Source: https://www.wellsfargo.com/mortgage/rates/
 *
 * Table convention: first row = block name; each subsequent row is a data row with
 * one cell per column. The default Table block renders the first data row as the
 * column header, so the first data row here is the Loan / Interest / APR / Points
 * header, followed by one row per rate.
 * Columns: Loan | Interest | APR | Points.
 *
 * Source structure per rate row:
 *   .index__loanwrapper___ki3Um
 *     .index__linkwrapper___pJne8 a .WFLink__text___Ia8fg  -> Loan name
 *     (sibling) .index__right___w1BUv
 *       .index__loanwrapper___ki3Um > .index__interest___HVlqg  -> Interest, APR, Points (in order)
 */
export default function parse(element, { document }) {
  // Locate rate rows. Prefer the loan-name wrappers (one per rate row); this
  // avoids the duplicate counting caused by the source's nested basecard markup.
  const loanWrappers = Array.from(element.querySelectorAll('.index__loanwrapper___ki3Um'))
    .filter((w) => w.querySelector('.index__link___lRnLV, .index__linkwrapper___pJne8'));

  const rows = [];
  loanWrappers.forEach((wrapper) => {
    const loanNameEl = wrapper.querySelector(
      '.index__link___lRnLV .WFLink__text___Ia8fg, .index__linkwrapper___pJne8 a'
    );
    const loanName = loanNameEl ? loanNameEl.textContent.trim() : '';
    if (!loanName) return;

    const right = wrapper.parentElement
      ? wrapper.parentElement.querySelector('.index__right___w1BUv')
      : null;
    let interest = '';
    let apr = '';
    let points = '';
    if (right) {
      const metricEls = Array.from(right.querySelectorAll('.index__interest___HVlqg'));
      [interest, apr, points] = metricEls.map((m) => m.textContent.trim());
    }

    rows.push([loanName, interest || '', apr || '', points || '']);
  });

  // If no rate rows detected, bail gracefully (leave DOM untouched).
  if (rows.length === 0) {
    return;
  }

  const cells = [];
  cells.push(['Loan', 'Interest', 'APR', 'Points']); // header data row
  rows.forEach((r) => cells.push(r));

  const block = WebImporter.Blocks.createBlock(document, { name: 'Table', cells });
  element.replaceWith(block);
}
