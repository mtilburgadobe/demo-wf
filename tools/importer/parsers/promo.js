/* eslint-disable */
/* global WebImporter */

/**
 * Parser: promo
 * Base block: Promo (full-bleed marketing banner)
 * Source selector: .ps-large-promo-full-container
 * Source: https://www.wellsfargo.com/mortgage/rates/
 *
 * Promo block structure — 1 column, 3 rows:
 *   | Promo |                      (block name)
 *   | image |                      (row 2: promo image)
 *   | heading + text + CTA |       (row 3: content)
 *
 * Source structure (.ps-large-promo-full-container):
 *   .ps-promo-full-item
 *     picture > img                (banner image)
 *     h2                           (heading)
 *     p                            (supporting text)
 *     a[class*="btn"] / strong>a   (CTA — cleanup transformer may wrap in strong)
 */
export default function parse(element, { document }) {
  const img = element.querySelector('picture img, img');

  const heading = element.querySelector('h2, h1');

  let description = null;
  const paragraphs = element.querySelectorAll('p');
  for (const p of paragraphs) {
    const btnLink = p.querySelector('a[class*="btn"], strong > a, em > a');
    if (btnLink && p.textContent.trim() === btnLink.textContent.trim()) continue;
    if (p.textContent.trim()) { description = p; break; }
  }

  const ctaLink = element.querySelector(
    'a.ps-btn-primary, a.ps-btn-secondary, a[class*="ps-btn"], .ps-padding a, strong > a, em > a'
  );

  // Row 2: image
  const imageCell = [];
  if (img) {
    const picture = img.closest('picture') || img;
    imageCell.push(picture.cloneNode(true));
  }

  // Row 3: heading + description + CTA
  const contentCell = [];
  if (heading) {
    const h2 = document.createElement('h2');
    h2.innerHTML = heading.innerHTML;
    contentCell.push(h2);
  }
  if (description) {
    const p = document.createElement('p');
    p.innerHTML = description.innerHTML;
    contentCell.push(p);
  }
  if (ctaLink) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = ctaLink.href || ctaLink.getAttribute('href') || '#';
    a.textContent = ctaLink.textContent.trim();
    const strong = document.createElement('strong');
    strong.appendChild(a);
    p.appendChild(strong);
    contentCell.push(p);
  }

  const cells = [[imageCell], [contentCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'Promo', cells });
  element.replaceWith(block);
}
