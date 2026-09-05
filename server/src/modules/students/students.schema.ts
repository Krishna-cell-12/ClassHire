import { z } from 'zod';
import { Gender } from '@prisma/client';

export const createStudentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rollNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.coerce.date(),
  gender: z.nativeEnum(Gender),
  phone: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string().uuid(),
  currentSemester: z.number().int().min(1).max(8),
  batchYear: z.number().int().min(2000).max(2100),
});

export const updateStudentSchema = createStudentSchema
  .omit({ email: true, password: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  departmentId: z.string().uuid().optional(),
  semester: z.coerce.number().int().optional(),
  batchYear: z.coerce.number().int().optional(),
  search: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;
