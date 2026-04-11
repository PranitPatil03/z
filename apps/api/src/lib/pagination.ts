import { type SQL, asc, desc, gt, lt } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";

/**
 * Reusable pagination query schema.
 * Use with z.intersection() or z.merge() to extend per-endpoint query schemas.
 */
export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  direction: z.enum(["forward", "backward"]).default("forward"),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Build cursor-based pagination SQL conditions and ordering.
 *
 * @param column - The column to paginate on (typically `createdAt` or `id`)
 * @param pagination - Parsed pagination query params
 * @returns { cursorCondition, orderBy, limit } to spread into your query
 */
export function buildCursorPagination(
  column: PgColumn,
  pagination: PaginationQuery,
): {
  cursorCondition: SQL | undefined;
  orderBy: SQL;
  limit: number;
} {
  const { cursor, limit, direction } = pagination;

  let cursorCondition: SQL | undefined;
  if (cursor) {
    cursorCondition =
      direction === "forward" ? lt(column, cursor) : gt(column, cursor);
  }

  const orderBy = direction === "forward" ? desc(column) : asc(column);

  return { cursorCondition, orderBy, limit };
}

/**
 * Format paginated response with cursor metadata.
 */
export function paginatedResponse<T extends { id: string }>(
  items: T[],
  limit: number,
) {
  const hasMore = items.length === limit;
  const nextCursor =
    hasMore && items.length > 0 ? items[items.length - 1].id : null;

  return {
    data: items,
    pagination: {
      hasMore,
      nextCursor,
      count: items.length,
    },
  };
}
