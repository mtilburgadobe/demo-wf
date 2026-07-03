/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-feature
 * Base block: cards (Block Collection)
 * Source: https://www.wellsfargo.com/mortgage/rates/ (2x2 feature grid) and
 *         https://www.wellsfargo.com/ (small-promo cards)
 *
 * Cards convention: 2 columns. First row = block name (+ variant in parens).
 * Each subsequent row = one card: [ image/icon cell | content cell (heading + text + CTA) ].
 *
 * Source A — 2x2 feature grid (.ps-marketing-small-promo-items):
 *   .ps-marketing-small-promo-item
 *     .mark-small-promo-icon > img            (decorative spacer/gradient — IGNORED)
 *     .ps-marketing-icon-container .ps-marketing-icon > img   -> col1 icon image (<=100px)
 *     .ps-marketing-text
 *       h2                                    -> col2 heading
 *       p.ps-marketing-text-content (may contain footnote <sup>) -> col2 description
 *       p.learn-more-mobile > span > a  /  .ps-marketing-promo-link .learn-more a (DUP) -> col2 CTA
 *
 * Source B — legacy promo cards:
 *   .enhanced-txt-cm.mid-size-promo / [class*="card-content"] with img + h3 + text + p>a
 *
 * Variant: icon-sized images (<=100px or marketing icons) => "Cards (icons)".
 */
export default function parse(element, { document }) {
  const isFeatureGrid = element.matches('.ps-marketing-small-promo-items')
    || !!element.querySelector('.ps-marketing-small-promo-item');

  let cardItems;
  if (isFeatureGrid) {
    cardItems = Array.from(element.querySelectorAll('.ps-marketing-small-promo-item'));
  } else {
    cardItems = Array.from(element.querySelectorAll(
      '.enhanced-txt-cm.mid-size-promo, .ps-promo-full-item, [class*="card-content"]:not(.card-container)'
    ));
    if (cardItems.length === 0) {
      const container = element.querySelector('.card-container, [class*="promo-full-items"]');
      if (container) cardItems = Array.from(container.children);
    }
    if (cardItems.length === 0) {
      cardItems = Array.from(element.querySelectorAll(':scope > div'));
    }
  }

  const cells = [];

  cardItems.forEach((card) => {
    // --- Col 1: icon/image ---
    // For the feature grid the real icon is the .ps-marketing-icon img; the
    // .mark-small-promo-icon img is a decorative spacer that must be skipped.
    let image = null;
    if (isFeatureGrid) {
      image = card.querySelector('.ps-marketing-icon img');
    }
    if (!image) {
      image = card.querySelector('img');
    }

    // --- Col 2: content (heading + description + single CTA) ---
    const textBody = card.querySelector('.ps-marketing-text, .enhanced-txt-body') || card;

    const heading = textBody.querySelector('h2, h3, h4') || card.querySelector('h2, h3, h4');

    // Description: prefer the dedicated marketing-text paragraph (keeps footnote <sup>).
    let description = textBody.querySelector('p.ps-marketing-text-content');
    if (!description) {
      const candidates = textBody.querySelectorAll(':scope > div, :scope > p');
      for (const child of candidates) {
        if (child.querySelector('h2, h3, h4')) continue;
        const link = child.querySelector('a');
        if (link && child.textContent.trim() === link.textContent.trim()) continue;
        if (child.textContent.trim()) { description = child; break; }
      }
    }

    // CTA: source duplicates the link (mobile + desktop). Take the first one only.
    const ctaLink = textBody.querySelector('.learn-more-mobile a, .learn-more a, p > a, a.cta, a.button')
      || card.querySelector('.ps-marketing-promo-link a, p > a');

    const contentCell = [];

    if (heading) {
      const h3 = document.createElement('h3');
      h3.innerHTML = heading.innerHTML;
      contentCell.push(h3);
    }

    if (description) {
      const p = document.createElement('p');
      // Preserve inner markup so footnote-ref superscripts (<sup>) survive.
      p.innerHTML = description.innerHTML;
      contentCell.push(p);
    }

    if (ctaLink) {
      const p = document.createElement('p');
      const link = document.createElement('a');
      link.href = ctaLink.href || ctaLink.getAttribute('href') || '';
      link.textContent = ctaLink.textContent.replace(/\s*>\s*$/, '').trim();
      p.appendChild(link);
      contentCell.push(p);
    }

    if (image || contentCell.length > 0) {
      cells.push([image || '', contentCell]);
    }
  });

  // Determine variant: icons if images are icon-sized (marketing icons or <=100px).
  let variant = 'Cards (separator)';
  if (isFeatureGrid) {
    variant = 'Cards (icons)';
  } else {
    const firstImg = element.querySelector('img');
    if (firstImg) {
      const src = (firstImg.src || firstImg.getAttribute('src') || '').toLowerCase();
      const w = parseInt(firstImg.getAttribute('width') || '0', 10);
      if ((w > 0 && w <= 100) || src.includes('64x64') || src.includes('icon') || src.includes('-64x') || src.includes('gradient-64')) {
        variant = 'Cards (icons)';
      }
    }
  }

  const block = WebImporter.Blocks.createBlock(document, { name: variant, cells });
  element.replaceWith(block);
}
