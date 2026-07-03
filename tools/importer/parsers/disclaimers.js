/* eslint-disable */
/* global WebImporter */

/**
 * Parser: disclaimers
 * Custom block: Disclaimers (AGENTS.md Rule 8 — compliance)
 * Source selector: .ps-footnote
 * Source: https://www.wellsfargo.com/mortgage/rates/
 *
 * Extracts numbered footnotes into a Disclaimers block.
 * Each footnote = one row: col1 = footnote number, col2 = disclaimer text.
 * Non-numbered footer lines (Equal Housing Lender, division statement, and the
 * compliance ID) are emitted as single-column rows so they are preserved verbatim.
 *
 * Source structure (Wells Fargo):
 *   .ps-footnote
 *     .ps-footnote-text[id="tcm:84-339561-16"]  -> footnote 1
 *       p.c20Content > span.c20no ("1. ") + span.c20Text (body)
 *     .ps-footnote-text[id="tcm:84-251836-16"]  -> footnote 2
 *     .ps-footnote-footer                        -> Equal Housing Lender line
 *     .ps-footnote-text                          -> "Wells Fargo Home Mortgage is a division…"
 *     .ps-footnote-text                          -> compliance ID "DT1-05142027-12-8929343-1.1"
 *
 * Footnote IDs and the compliance ID are preserved verbatim (Rule 8).
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll(':scope > p, :scope > div'));
  const cells = [];

  items.forEach((item) => {
    // Numbered footnote: has an explicit .c20no number span.
    const numberSpan = item.querySelector('.c20no');
    const textSpan = item.querySelector('.c20Text');

    if (numberSpan && numberSpan.textContent.trim().match(/^\d+\.?/)) {
      const number = numberSpan.textContent.trim().replace(/\s+$/, '');
      const numCell = document.createElement('p');
      numCell.textContent = number;

      const bodyCell = document.createElement('p');
      if (textSpan) {
        bodyCell.innerHTML = textSpan.innerHTML.trim();
      } else {
        // Fallback: clone content minus the number span.
        const clone = item.cloneNode(true);
        const cn = clone.querySelector('.c20no');
        if (cn) cn.remove();
        bodyCell.innerHTML = clone.innerHTML.trim();
      }
      // Preserve the footnote id (compliance) as a data attribute on the row body.
      const fid = item.getAttribute('id');
      if (fid) bodyCell.setAttribute('data-footnote-id', fid);

      cells.push([[numCell], [bodyCell]]);
      return;
    }

    // Try the generic "N. text" pattern (older markup).
    const text = item.textContent.replace(/\s+/g, ' ').trim();
    const match = text.match(/^(\d+)\.\s+(.*)$/);
    if (match) {
      const numCell = document.createElement('p');
      numCell.textContent = match[1] + '.';
      const bodyCell = document.createElement('p');
      bodyCell.textContent = match[2];
      const fid = item.getAttribute('id');
      if (fid) bodyCell.setAttribute('data-footnote-id', fid);
      cells.push([[numCell], [bodyCell]]);
      return;
    }

    // Non-numbered footer line (Equal Housing Lender, division statement,
    // compliance ID). Preserve verbatim as a single-column row (empty number cell).
    if (text) {
      const numCell = document.createElement('p');
      numCell.textContent = '';
      const bodyCell = document.createElement('p');
      bodyCell.textContent = text;
      cells.push([[numCell], [bodyCell]]);
    }
  });

  if (cells.length > 0) {
    const block = WebImporter.Blocks.createBlock(document, { name: 'Disclaimers', cells });
    element.replaceWith(block);
  }
}
