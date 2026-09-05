import { z } from 'zod';
import { Role, Gender } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const baseRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
});

export const registerStudentSchema = baseRegisterSchema.extend({
  role: z.literal(Role.STUDENT),
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

export const registerFacultySchema = baseRegisterSchema.extend({
  role: z.literal(Role.FACULTY),
  employeeCode: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  departmentId: z.string().uuid(),
  designation: z.string().optional(),
});

export const registerAdminSchema = baseRegisterSchema.extend({
  role: z.literal(Role.ADMIN),
});

export const registerSchema = z.discriminatedUnion('role', [
  registerStudentSchema,
  registerFacultySchema,
  registerAdminSchema,
]);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
