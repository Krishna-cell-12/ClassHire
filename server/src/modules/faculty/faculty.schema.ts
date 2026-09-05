import { z } from 'zod';

export const createFacultySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  employeeCode: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  departmentId: z.string().uuid(),
  designation: z.string().optional(),
});

export const updateFacultySchema = createFacultySchema
  .omit({ email: true, password: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const listFacultyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  departmentId: z.string().uuid().optional(),
});

export type CreateFacultyInput = z.infer<typeof createFacultySchema>;
export type UpdateFacultyInput = z.infer<typeof updateFacultySchema>;
export type ListFacultyQuery = z.infer<typeof listFacultyQuerySchema>;
