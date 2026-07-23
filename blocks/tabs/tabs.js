import { toClassName } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import rates from './rates-data.js';

/**
 * Build the rate-panel content (summary + rate table + disclosure) for a
 * segmented rate tab from the JS rate store. Returns null when there is no
 * rate data for the given tab id, leaving the authored content untouched.
 */
function buildRatePanel(id) {
  const data = rates[id];
  if (!data) return null;

  const fragment = document.createDocumentFragment();

  if (data.summary) {
    const summary = document.createElement('p');
    summary.textContent = data.summary;
    fragment.append(summary);
  }

  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  data.rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  fragment.append(table);

  if (data.disclosure) {
    const disclosure = document.createElement('p');
    disclosure.textContent = data.disclosure;
    fragment.append(disclosure);
  }

  return fragment;
}

/**
 * Replace authored rate rows in each segmented rate panel with rows injected
 * from the JS rate store, so the store is the single source of truth.
 */
function injectRates(block) {
  block.querySelectorAll('.tabs-panel').forEach((panel) => {
    const id = panel.id.replace(/^tabpanel-/, '');
    const content = buildRatePanel(id);
    if (content) panel.replaceChildren(content);
  });
}

function decorateStandardTabs(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children];

  const hasIcons = rows.some((row) => row.firstElementChild?.querySelector('img'));
  if (hasIcons) block.classList.add('icons');

  rows.forEach((row, i) => {
    const tabCell = row.firstElementChild;
    const id = toClassName(tabCell.textContent.trim());

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tabCell.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');

    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      row.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);

    row.className = 'tabs-panel';
    row.id = `tabpanel-${id}`;
    row.setAttribute('aria-hidden', !!i);
    row.setAttribute('aria-labelledby', `tab-${id}`);
    row.setAttribute('role', 'tabpanel');
    tabCell.remove();
  });

  block.prepend(tablist);
}

async function decorateReferenceTabs(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children];

  const hasIcons = rows.some((row) => row.firstElementChild?.querySelector('img'));
  if (hasIcons) block.classList.add('icons');

  rows.forEach((row, i) => {
    const tabCell = row.firstElementChild;
    const contentCell = row.lastElementChild;
    const label = tabCell.textContent.trim();
    const id = toClassName(label);
    const fragmentPath = contentCell.querySelector('a')
      ? new URL(contentCell.querySelector('a').href).pathname
      : contentCell.textContent.trim();

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tabCell.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.dataset.fragment = fragmentPath;

    button.addEventListener('click', async () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      row.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);

      if (!contentCell.dataset.loaded) {
        const fragment = await loadFragment(fragmentPath);
        if (fragment) {
          contentCell.replaceChildren(...fragment.childNodes);
          contentCell.dataset.loaded = 'true';
        }
      }
    });
    tablist.append(button);

    row.className = 'tabs-panel';
    row.id = `tabpanel-${id}`;
    row.setAttribute('aria-hidden', !!i);
    row.setAttribute('aria-labelledby', `tab-${id}`);
    row.setAttribute('role', 'tabpanel');
    tabCell.remove();
    contentCell.className = 'reference-content';
  });

  block.prepend(tablist);

  const firstPanel = block.querySelector('.reference-content');
  const firstPath = tablist.querySelector('button').dataset.fragment;
  if (firstPanel && firstPath) {
    const fragment = await loadFragment(firstPath);
    if (fragment) {
      firstPanel.replaceChildren(...fragment.childNodes);
      firstPanel.dataset.loaded = 'true';
    }
  }
}

export default async function decorate(block) {
  if (block.classList.contains('reference')) {
    await decorateReferenceTabs(block);
    return;
  }

  decorateStandardTabs(block);

  if (block.classList.contains('segmented')) {
    injectRates(block);
  }
}
