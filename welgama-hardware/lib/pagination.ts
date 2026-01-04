// Pagination utilities and types

export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export function calculatePagination(params: PaginationParams) {
  const page = Math.max(1, params.page);
  const limit = Math.min(Math.max(1, params.limit), 100); // Max 100 items per page
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function createPaginatedResponse<T>(
  data: T[],
  totalCount: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const { page, limit } = calculatePagination(params);
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
