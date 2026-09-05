import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(10),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
