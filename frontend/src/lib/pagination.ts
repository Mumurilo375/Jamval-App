export function getTotalPages(totalItems: number, pageSize: number) {
  if (pageSize <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = getTotalPages(items.length, pageSize);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    page: safePage,
    totalPages,
    pageItems: items.slice(startIndex, startIndex + pageSize)
  };
}
