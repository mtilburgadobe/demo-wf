/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Wells Fargo section breaks (product-landing + homepage).
 *
 * afterTransform only. Inserts an EDS section break (<hr>) before each element
 * that starts a new authorable section, so parsers can locate each block within
 * its own section.
 *
 * Why selector-driven instead of "hr before every non-first child of main":
 * the Wells Fargo product-landing DOM is deeply and irregularly nested (malformed
 * closing tags), so the section-starting elements are NOT uniform direct children
 * of <main>. Counting main's direct children yields the wrong boundaries. Instead
 * we anchor on the section-start selectors verified in migration-work/cleaned.html.
 *
 * Section starts for /mortgage/rates/ (product-landing), in document order:
 *   1. Page intro + rate widget .... first content block (no <hr> before it)
 *      - .ps-page-title            (cleaned.html line 232)
 *   2. Customized-rate promo (hero)
 *      - .ps-large-promo-full-container (cleaned.html line 453)
 *   3. FAQs accordion (title + <details>)
 *      - the .card-background-white whose <h2> is the "Mortgage rates FAQs" title
 *        (cleaned.html line 473) — sits immediately before details.first-show-hide
 *   4. 2x2 feature grid
 *      - .ps-marketing-small-promo-items (cleaned.html line 571)
 *   5. Talk to a mortgage consultant (fragment)
 *      - the .card-background-white whose <h2> is "Talk to a mortgage consultant"
 *        (cleaned.html line 685) — sits immediately before .card-container.three-card
 *   6. Legal text + footnote disclaimers
 *      - the .enhanced-txt-cm.text-aligned-left legal block (cleaned.html line 731)
 *        that precedes .ps-footnote
 *
 * The FAQ title and consultant title share the .card-background-white class, so we
 * disambiguate them by the section-start selectors that follow them (a details.
 * show-hide-content-wrapper for FAQs, a .card-container.three-card for the
 * consultant) rather than by the shared class alone.
 *
 * A break is inserted only when a matched section-start element exists and is not
 * already immediately preceded by an <hr>, and only for sections after the first,
 * making the transformer idempotent and safe when a section is absent on a page.
 */
export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;

  const doc = element.ownerDocument || element.getRootNode();
  const main = element.querySelector('main') || element.querySelector('.ps-body-wrapper') || element;

  // Resolve the FAQ-title / consultant-title cards by the block that follows them,
  // since both use .card-background-white. Returns the title card element or null.
  const cardTitleBefore = (followingSelector) => {
    const follower = main.querySelector(followingSelector);
    if (!follower) return null;
    // Walk previous siblings/ancestors to find the nearest preceding title card.
    const cards = Array.from(main.querySelectorAll('.card-background-white'));
    // Choose the last title card that appears before the follower in document order.
    let chosen = null;
    for (const card of cards) {
      const pos = card.compareDocumentPosition(follower);
      // follower is FOLLOWING the card => card precedes follower
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) chosen = card;
    }
    return chosen;
  };

  // Ordered list of section-start elements (resolved lazily; nulls skipped).
  const starts = [
    main.querySelector('.ps-page-title'),                       // 1 (first section, no <hr>)
    main.querySelector('.ps-large-promo-full-container'),       // 2
    cardTitleBefore('details.show-hide-content-wrapper'),       // 3 FAQ title card
    main.querySelector('.ps-marketing-small-promo-items'),      // 4
    cardTitleBefore('.card-container.three-card'),              // 5 consultant title card
    // 6 legal text block that precedes the footnote disclaimers
    (() => {
      const footnote = main.querySelector('.ps-footnote');
      if (!footnote) return null;
      const legals = Array.from(main.querySelectorAll('.enhanced-txt-cm.text-aligned-left'));
      let chosen = null;
      for (const legal of legals) {
        const pos = legal.compareDocumentPosition(footnote);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) chosen = legal;
      }
      // Fall back to the footnote block itself if no preceding legal text exists.
      return chosen || footnote;
    })(),
  ].filter(Boolean);

  // Insert <hr> before every section start except the first, avoiding duplicates.
  for (let i = 1; i < starts.length; i++) {
    const start = starts[i];
    const prev = start.previousElementSibling;
    if (prev && prev.tagName === 'HR') continue; // idempotent
    const hr = doc.createElement('hr');
    start.before(hr);
  }
}
