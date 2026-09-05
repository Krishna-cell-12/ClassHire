import { z } from 'zod';

export const createCourseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  departmentId: z.string().uuid(),
  semester: z.number().int().min(1).max(8),
  credits: z.number().int().min(1).max(10),
  facultyId: z.string().uuid().optional().nullable(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const listCoursesQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  semester: z.coerce.number().int().optional(),
  facultyId: z.string().uuid().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
