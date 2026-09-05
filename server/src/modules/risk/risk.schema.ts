import { z } from 'zod';

export const riskListQuerySchema = z.object({
  level: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  departmentId: z.string().uuid().optional(),
  sort: z.enum(['score_desc', 'score_asc']).default('score_desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export type RiskListQuery = z.infer<typeof riskListQuerySchema>;
