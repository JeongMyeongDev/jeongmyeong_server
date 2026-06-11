/**
 * 페이지네이션 파라미터를 정규화합니다.
 */
export function normalizePagination(query: { page?: number; limit?: number }) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * 페이지네이션 메타 정보를 생성합니다.
 */
export function paginationMeta(page: number, limit: number, totalCount: number) {
  return { page, limit, totalCount };
}
