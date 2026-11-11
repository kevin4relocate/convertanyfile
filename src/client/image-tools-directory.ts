/**
 * Progressive enhancement for the server-rendered Image Tools directory.
 *
 * All tool links and category headings are present in static HTML. JavaScript
 * only filters existing entries; it never requests user data or fetches a
 * search index. This keeps both no-JS navigation and SEO intact.
 */
function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('en-US').trim().replace(/\s+/g, ' ');
}

function initializeImageToolsDirectory(root: HTMLElement): void {
  if (root.dataset.directoryReady === 'true') return;

  const input = root.querySelector<HTMLInputElement>('[data-directory-search-input]');
  const clear = root.querySelector<HTMLButtonElement>('[data-directory-clear]');
  const reset = root.querySelector<HTMLButtonElement>('[data-directory-reset]');
  const count = root.querySelector<HTMLElement>('[data-directory-count]');
  const empty = root.querySelector<HTMLElement>('[data-directory-empty]');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-directory-filter]')];
  const sections = [...root.querySelectorAll<HTMLElement>('[data-directory-section]')];
  const cards = [...root.querySelectorAll<HTMLAnchorElement>('[data-directory-tool]')];

  if (!input || !clear || !reset || !count || !empty || !buttons.length || !cards.length) return;
  root.dataset.directoryReady = 'true';
  let activeGroup = 'all';

  const indexed = cards.map((element) => ({
    element,
    section: element.closest<HTMLElement>('[data-directory-section]'),
    search: normalizeSearch(element.dataset.directorySearch ?? element.textContent ?? ''),
  }));

  const applyFilter = (): void => {
    const terms = normalizeSearch(input.value).split(' ').filter(Boolean);
    let visible = 0;

    for (const { element, section, search } of indexed) {
      const belongsToGroup = activeGroup === 'all' || section?.dataset.directorySection === activeGroup;
      const matchesSearch = terms.every((term) => search.includes(term));
      const show = belongsToGroup && matchesSearch;
      element.hidden = !show;
      element.style.display = show ? '' : 'none';
      if (show) visible++;
    }

    for (const section of sections) {
      const hasResults = indexed.some(({ element, section: parent }) => parent === section && !element.hidden);
      section.hidden = !hasResults;
      section.style.display = hasResults ? '' : 'none';
    }

    for (const button of buttons) {
      const selected = button.dataset.directoryFilter === activeGroup;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-active', selected);
    }

    clear.hidden = !input.value;
    empty.hidden = visible !== 0;
    count.textContent = `Showing ${visible} of ${indexed.length} ${indexed.length === 1 ? 'tool' : 'tools'}`;
  };

  const showAll = (): void => {
    input.value = '';
    activeGroup = 'all';
    applyFilter();
    input.focus();
  };

  input.addEventListener('input', applyFilter);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      input.value = '';
      applyFilter();
    }
  });
  clear.addEventListener('click', () => {
    input.value = '';
    applyFilter();
    input.focus();
  });
  reset.addEventListener('click', showAll);

  for (const button of buttons) {
    button.addEventListener('click', () => {
      activeGroup = button.dataset.directoryFilter ?? 'all';
      applyFilter();
    });
  }

  applyFilter();
}

document.querySelectorAll<HTMLElement>('[data-image-tools-directory]').forEach(initializeImageToolsDirectory);
