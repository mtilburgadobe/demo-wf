import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * Promo block — full-bleed marketing banner.
 * Authored as two rows in one column:
 *   Row 1: the promo image
 *   Row 2: heading + supporting text + CTA
 * The image renders as the banner background; the content sits on top,
 * left-aligned, constrained to the content width.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const imageRow = rows[0];
  const contentRow = rows[1];

  const picture = imageRow?.querySelector('picture');
  const img = picture?.querySelector('img');

  const media = document.createElement('div');
  media.className = 'promo-media';
  if (img) {
    // Data-URI images (embedded pre-DA-ingestion) must not be optimized —
    // createOptimizedPicture would mangle the inline base64. DA rewrites these
    // to media_<hash> URLs on preview/publish, after which optimization applies.
    if (img.src.startsWith('data:')) {
      media.append(picture || img);
    } else {
      const optimized = createOptimizedPicture(
        img.src,
        img.alt,
        true,
        [{ width: '2000' }],
      );
      media.append(optimized);
    }
  }

  const content = document.createElement('div');
  content.className = 'promo-content';
  const inner = contentRow?.firstElementChild;
  if (inner) {
    [...inner.childNodes].forEach((node) => content.append(node));
  }

  block.replaceChildren(media, content);
}
