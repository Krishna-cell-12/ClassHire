import { z } from 'zod';

// The ONLY fields/operators the LLM is allowed to produce. This is the actual security
// boundary for the feature: .strict() rejects any object carrying a key outside this list
// (e.g. a prompt-injection attempt to smuggle in `isActive`, `role`, or a raw filter/query
// field), and every value is independently type/range/enum-checked regardless of what the
// LLM claims. Nothing here is ever interpolated into SQL -- see nlSearch.service.ts.
export const nlFilterSchema = z
  .object({
    department: z.string().min(1).max(50).optional(),
    attendanceBelow: z.number().min(0).max(100).optional(),
    attendanceAbove: z.number().min(0).max(100).optional(),
    feeStatus: z.enum(['paid', 'partial', 'overdue']).optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    semester: z.number().int().min(1).max(8).optional(),
    batchYear: z.number().int().min(2000).max(2100).optional(),
    name: z.string().min(1).max(100).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'No recognizable filter in that query',
  });

export type NlFilter = z.infer<typeof nlFilterSchema>;

export const nlSearchBodySchema = z.object({
  query: z.string().min(1).max(300),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type NlSearchBody = z.infer<typeof nlSearchBodySchema>;
