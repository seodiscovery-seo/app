import { z } from "zod";
import { PAGINATION } from "@/config/constants";

export const idSchema = z.string().trim().min(1, "ID is required").max(64);

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGINATION.maxPageSize).default(PAGINATION.defaultPageSize),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
