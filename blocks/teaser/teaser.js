import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * Teaser block — "Other articles that might interest you".
 * Each authored row is one card with three cells:
 *   1) image  2) title text  3) link (CTA label is the link text, e.g. "Read article")
 * The card title and the CTA both point to the link's href.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const imageCell = cells[0];
    const titleCell = cells[1];
    const ctaCell = cells[2];

    const link = ctaCell?.querySelector('a');
    const href = link?.getAttribute('href') || '#';
    const ctaText = (link?.textContent || 'Read article').trim();
    const titleText = (titleCell?.textContent || '').trim();
    const picture = imageCell?.querySelector('picture');

    const li = document.createElement('li');
    li.className = 'teaser-card';

    // top row: title (left, linked) + image (right)
    const info = document.createElement('div');
    info.className = 'teaser-card-info';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'teaser-card-title';
    const titleLink = document.createElement('a');
    titleLink.href = href;
    const h3 = document.createElement('h3');
    h3.textContent = titleText;
    titleLink.append(h3);
    titleWrap.append(titleLink);

    const imageWrap = document.createElement('div');
    imageWrap.className = 'teaser-card-image';
    if (picture) imageWrap.append(picture);

    info.append(titleWrap, imageWrap);

    // bottom: CTA button
    const ctaWrap = document.createElement('div');
    ctaWrap.className = 'teaser-card-cta';
    const cta = document.createElement('a');
    cta.href = href;
    cta.className = 'button';
    cta.textContent = ctaText;
    cta.setAttribute('aria-label', `${ctaText}: ${titleText}`);
    ctaWrap.append(cta);

    li.append(info, ctaWrap);
    ul.append(li);
  });

  // optimize authored images
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '350' }]);
    img.closest('picture').replaceWith(optimized);
  });

  block.replaceChildren(ul);
}
