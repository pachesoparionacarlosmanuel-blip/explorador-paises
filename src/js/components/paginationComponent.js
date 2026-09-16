export function getTotalPages(items, pageSize) {
  return Math.max(1, Math.ceil(items.length / pageSize));
}

export function getPageItems(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function renderPagination(container, { currentPage, totalPages }, onPageChange) {
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const createButton = (label, page, opts = {}) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pagination__btn';
    btn.textContent = label;
    btn.disabled = !!opts.disabled;
    if (opts.active) btn.classList.add('pagination__btn--active');
    btn.addEventListener('click', () => onPageChange(page));
    return btn;
  };

  const maxButtons = 5;
  let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  const end = Math.min(totalPages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);

  const pageNumbers = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  container.appendChild(createButton('«', currentPage - 1, { disabled: currentPage === 1 }));

  pageNumbers.forEach((page) => {
    container.appendChild(createButton(String(page), page, { active: page === currentPage }));
  });

  container.appendChild(createButton('»', currentPage + 1, { disabled: currentPage === totalPages }));
}
