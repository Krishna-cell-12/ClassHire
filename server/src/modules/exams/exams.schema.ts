import { z } from 'zod';
import { ExamType } from '@prisma/client';

export const createExamSchema = z.object({
  courseId: z.string().uuid(),
  examType: z.nativeEnum(ExamType),
  title: z.string().min(1),
  examDate: z.coerce.date(),
  maxMarks: z.number().positive(),
});

export const updateExamSchema = createExamSchema.partial();

export const enterMarksSchema = z.object({
  marks: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        marksObtained: z.number().nonnegative(),
        remarks: z.string().optional(),
      }),
    )
    .min(1),
});

export const listExamsQuerySchema = z.object({
  courseId: z.string().uuid().optional(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type EnterMarksInput = z.infer<typeof enterMarksSchema>;
