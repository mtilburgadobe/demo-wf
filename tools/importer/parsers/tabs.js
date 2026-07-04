/* eslint-disable */
/* global WebImporter */

/**
 * Parser: tabs
 * Base block: Tabs (Block Collection)
 * Emits an inner Table block (Loan / Interest / APR / Points) for rate rows.
 *
 * Tabs library convention: 2-column table. First row = block name.
 * Each subsequent row = [ tab label | tab content ].
 *
 * Source selectors: .index__segmentedContainer___JQRgw, [class*='segmentedContainer'],
 *   plus legacy anchor-based tab patterns (a[href="#anchor"]).
 * Source: https://www.wellsfargo.com/mortgage/rates/ (and mortgage tab pages)
 *
 * Two supported source shapes:
 *
 * A) Rate widget (mortgage rates page):
 *    .index__segmentedContainer___JQRgw
 *      ul.WFSegmentedControl__segments... > li > a (tab labels: "Home Purchase", "Refinance")
 *      panel(s): .index__rateInputContainer (inputs summary), .index__basecard (rate rows),
 *                .index__ratesdisclosure (disclaimer paragraph)
 *    Each tab panel's rate rows are emitted as an INNER "table" block
 *    (columns: Loan / Interest / APR / Points) via buildRateTable(), placed in the
 *    tab content cell (2nd column). This keeps the Tabs 2-column convention.
 *    NOTE: The scraped DOM only contains the initially-rendered (first) tab panel;
 *    additional panels are JS-hydrated.
 *
 * B) Legacy anchor tabs (a[href="#id"] label + following panel) → standard Tabs block.
 */

// ---------------------------------------------------------------------------
// Legacy anchor-based tabs (kept for other mortgage pages)
// ---------------------------------------------------------------------------
const KNOWN_REFERENCE_TABS = [
  { id: 'nationalbanks', label: 'National banks', slug: 'tab-national-banks' },
  { id: 'regionalandcommunitybanks', label: 'Regional and community banks', slug: 'tab-regional-and-community-banks' },
  { id: 'creditunions', label: 'Credit unions', slug: 'tab-credit-unions' },
  { id: 'mortgagebrokers', label: 'Mortgage brokers', slug: 'tab-mortgage-brokers' },
  { id: 'onlineonlymortgagelenders', label: 'Online-only mortgage lenders', slug: 'tab-online-only-mortgage-lenders' },
];

function isKnownReferenceTab(anchorId) {
  return KNOWN_REFERENCE_TABS.find((t) => t.id === anchorId);
}

// ---------------------------------------------------------------------------
// Rate widget helpers
// ---------------------------------------------------------------------------

/**
 * Build an inner "table" block from the rate cards in a panel.
 * Each rate row → Loan name + Interest + APR + Points.
 * Returns the table block element, or null if no rate rows found.
 */
function buildRateTable(panel, document) {
  // Rate rows are keyed by the loan-name link wrapper. Using that avoids the
  // duplicate counting caused by the source's nested .index__basecard markup.
  const loanWrappers = Array.from(panel.querySelectorAll('.index__loanwrapper___ki3Um'))
    .filter((w) => w.querySelector('.index__link___lRnLV, .index__linkwrapper___pJne8'));

  const rows = [];
  loanWrappers.forEach((wrapper) => {
    const loanNameEl = wrapper.querySelector('.index__link___lRnLV .WFLink__text___Ia8fg, .index__linkwrapper___pJne8 a');
    const loanName = loanNameEl ? loanNameEl.textContent.trim() : '';
    if (!loanName) return;

    // The metric columns live in the sibling .index__right container.
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

  if (rows.length === 0) return null;

  // The rate table lives INSIDE a tab panel (2nd column of the Tabs block).
  // No <thead> — column labels (Loan/Interest/APR/Points) are rendered per
  // cell via CSS ::before, so an explicit header row would show as a stray
  // extra card after DA's markdown round-trip flattens <thead> into <tbody>.
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    r.forEach((val) => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

/**
 * Build panel content elements for a rate tab: inputs summary + rate table + disclaimer.
 */
function buildRatePanelContent(container, document) {
  const content = [];

  const inputsSummary = container.querySelector('.index__content___sJYBT');
  if (inputsSummary && inputsSummary.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = inputsSummary.textContent.trim();
    content.push(p);
  }

  const table = buildRateTable(container, document);
  if (table) content.push(table);

  const disclosure = container.querySelector('.index__ratesdisclosure___y56vs p, .index__ratesdisclosure___y56vs');
  if (disclosure && disclosure.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = disclosure.textContent.trim();
    content.push(p);
  }

  return content;
}

function parseRateWidget(element, document) {
  const container = element.matches('.index__segmentedContainer___JQRgw, [class*="segmentedContainer"]')
    ? element
    : element.querySelector('.index__segmentedContainer___JQRgw, [class*="segmentedContainer"]');
  if (!container) return false;

  // Tab labels come from the segmented control (a inside li).
  const labelEls = Array.from(container.querySelectorAll(
    '[class*="WFSegmentedControl__segments"] li > a, [class*="segments"] li > a'
  ));
  const labels = labelEls
    .map((a) => a.textContent.trim())
    .filter((t) => t.length > 0);

  if (labels.length < 2) return false;

  // Shared panel content (scraped DOM only has the first tab's panel rendered).
  const panelContent = buildRatePanelContent(container, document);
  if (panelContent.length === 0) return false;

  // Tabs convention: 2 columns, one row per tab: [label | content].
  const cells = [];
  labels.forEach((label, idx) => {
    const contentEl = document.createElement('div');
    if (idx === 0) {
      panelContent.forEach((node) => contentEl.appendChild(node));
    } else {
      const note = document.createElement('p');
      note.textContent = 'Rate rows for this tab are loaded dynamically.';
      contentEl.appendChild(note);
    }
    cells.push([[label], [contentEl]]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'Tabs (segmented)', cells });
  element.replaceWith(block);
  return true;
}

// ---------------------------------------------------------------------------
// Legacy anchor tab parsers
// ---------------------------------------------------------------------------
function parseReferenceTabs(container, document, url) {
  let pagePath = '';
  try {
    const urlObj = new URL(url);
    pagePath = urlObj.pathname.replace(/\/$/, '').replace(/^\//, '');
  } catch (e) {
    pagePath = url.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '').replace(/^\//, '');
  }
  const fragmentBase = '/fragments/' + pagePath;

  const tabData = [];
  const elementsToRemove = new Set();
  let firstTabLabelEl = null;

  for (const tab of KNOWN_REFERENCE_TABS) {
    const anchor = container.querySelector(`a[href="#${tab.id}"]`);
    if (!anchor) continue;
    const labelEl = anchor.closest('p') || anchor.closest('div');
    if (!labelEl) continue;
    if (!firstTabLabelEl) firstTabLabelEl = labelEl;

    const panelEl = labelEl.nextElementSibling;
    if (panelEl) elementsToRemove.add(panelEl);
    elementsToRemove.add(labelEl);

    tabData.push({ label: tab.label, fragmentPath: fragmentBase + '/' + tab.slug });
  }

  if (tabData.length < 3) return false;

  const allParagraphs = container.querySelectorAll('p');
  for (const p of allParagraphs) {
    const anchor = p.querySelector('a[href^="#"]');
    if (!anchor) continue;
    const href = (anchor.getAttribute('href') || '').replace('#', '');
    if (isKnownReferenceTab(href)) {
      elementsToRemove.add(p);
      const next = p.nextElementSibling;
      if (next && (next.querySelector('h3') || (next.className || '').includes('cards'))) {
        elementsToRemove.add(next);
      }
    }
  }
  for (const p of allParagraphs) {
    const anchors = p.querySelectorAll('a[href^="#"]');
    if (anchors.length >= 3) {
      const matchCount = Array.from(anchors)
        .filter((a) => isKnownReferenceTab((a.getAttribute('href') || '').replace('#', '')))
        .length;
      if (matchCount >= 3) elementsToRemove.add(p);
    }
  }

  const cells = tabData.map((tab) => [[tab.label], [tab.fragmentPath]]);
  const block = WebImporter.Blocks.createBlock(document, { name: 'Tabs (reference)', cells });

  if (firstTabLabelEl && firstTabLabelEl.parentNode) {
    firstTabLabelEl.parentNode.insertBefore(block, firstTabLabelEl);
  }
  elementsToRemove.forEach((el) => { if (el.parentNode) el.remove(); });
  return true;
}

function parseGenericTabs(container, document, tabAnchors) {
  const tabData = [];
  const elementsToRemove = new Set();
  let firstTabLabelEl = null;

  for (const { label, anchorEl } of tabAnchors) {
    const labelEl = anchorEl.closest('p') || anchorEl.parentElement;
    if (!labelEl) continue;
    if (!firstTabLabelEl) firstTabLabelEl = labelEl;

    const panelEl = labelEl.nextElementSibling;
    if (!panelEl) continue;

    tabData.push({ label, content: panelEl.innerHTML || '' });
    elementsToRemove.add(labelEl);
    elementsToRemove.add(panelEl);
  }

  if (tabData.length < 2) return false;

  const allParagraphs = container.querySelectorAll('p');
  const knownIds = tabAnchors.map((t) => t.id);
  for (const p of allParagraphs) {
    const anchors = p.querySelectorAll('a[href^="#"]');
    if (anchors.length >= tabAnchors.length) {
      const matchCount = Array.from(anchors)
        .filter((a) => knownIds.includes((a.getAttribute('href') || '').replace('#', '')))
        .length;
      if (matchCount >= tabAnchors.length) elementsToRemove.add(p);
    }
  }
  for (const p of allParagraphs) {
    if (elementsToRemove.has(p)) continue;
    const anchor = p.querySelector('a[href^="#"]');
    if (!anchor) continue;
    const href = (anchor.getAttribute('href') || '').replace('#', '');
    if (knownIds.includes(href)) {
      elementsToRemove.add(p);
      const next = p.nextElementSibling;
      if (next && (next.querySelector('h3') || next.querySelector('p'))) {
        elementsToRemove.add(next);
      }
    }
  }

  const cells = tabData.map((tab) => {
    const contentEl = document.createElement('div');
    contentEl.innerHTML = tab.content;
    return [[tab.label], [contentEl]];
  });
  const block = WebImporter.Blocks.createBlock(document, { name: 'Tabs', cells });

  if (firstTabLabelEl && firstTabLabelEl.parentNode) {
    firstTabLabelEl.parentNode.insertBefore(block, firstTabLabelEl);
  }
  elementsToRemove.forEach((el) => { if (el.parentNode) el.remove(); });
  return true;
}

export default function parse(element, { document, url }) {
  if (!element) return false;

  // Strategy A: rate widget (segmented control + rate cards).
  if (element.matches('.index__segmentedContainer___JQRgw, [class*="segmentedContainer"]')
    || element.querySelector('.index__segmentedContainer___JQRgw, [class*="segmentedContainer"]')) {
    if (parseRateWidget(element, document)) return true;
  }

  // Strategy B: legacy anchor tabs.
  const allAnchors = element.querySelectorAll('a[href^="#"]');
  const tabAnchors = [];
  const seenIds = new Set();

  for (const a of allAnchors) {
    const href = (a.getAttribute('href') || '').replace('#', '');
    if (!href || href === 'skip' || seenIds.has(href)) continue;
    if (/^[a-z][a-z0-9]*$/.test(href) || /^[a-z]+[a-z!]*$/.test(href)) {
      const label = a.textContent.trim();
      if (label && label.length > 2 && label.length < 80) {
        seenIds.add(href);
        tabAnchors.push({ id: href, label, anchorEl: a });
      }
    }
  }

  if (tabAnchors.length < 2) return false;

  const knownCount = tabAnchors.filter((t) => isKnownReferenceTab(t.id)).length;
  if (knownCount >= 3) {
    return parseReferenceTabs(element, document, url || '');
  }

  return parseGenericTabs(element, document, tabAnchors);
}
