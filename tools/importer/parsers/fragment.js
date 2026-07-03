/* eslint-disable */
/* global WebImporter */

/**
 * Parser for fragment variant.
 * Base block: fragment
 * Source: https://www.wellsfargo.com/
 * Generated: 2026-05-17T00:00:00Z
 *
 * Maps source containers to fragment paths:
 *   .ps-native-app-container    → /fragments/app-promo
 *   .contact-bar-container      → /fragments/help-cta-default
 *   .card-container.three-card  → /fragments/mortgage/talk-to-mortgage-consultant
 *
 * The consultant fragment holds the "Talk to a mortgage consultant" contact cards
 * (phone number, sign-on/tool URLs). Per AGENTS.md Rule 5 & Rule 7 those dynamic
 * values live in the fragment (resolved from placeholders.json) and are NEVER
 * inlined here — this parser only emits the fragment reference link.
 *
 * Target table structure (from library example):
 *   | Fragment |
 *   | [/fragments/...](/fragments/...) |
 */
export default function parse(element, { document }) {
  // Map source selectors to fragment paths. Order matters: most-specific first.
  const fragmentMapping = [
    { selector: '.card-container.three-card', path: '/fragments/mortgage/talk-to-mortgage-consultant' },
    { selector: '.ps-native-app-container', path: '/fragments/app-promo' },
    { selector: '.contact-bar-container', path: '/fragments/help-cta-default' },
  ];

  // Determine the fragment path based on which container this element is or is within
  let fragmentPath = null;

  for (const mapping of fragmentMapping) {
    if (element.matches(mapping.selector) || element.closest(mapping.selector) || element.querySelector(mapping.selector)) {
      fragmentPath = mapping.path;
      break;
    }
  }

  // Fallback: if no mapping matched, skip replacement
  if (!fragmentPath) {
    return;
  }

  // Create a link element pointing to the fragment path
  const link = document.createElement('a');
  link.href = fragmentPath;
  link.textContent = fragmentPath;

  // Build cells array matching the library example:
  // Single row with the fragment path link
  const cells = [
    [link],
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'fragment', cells });
  element.replaceWith(block);
}
