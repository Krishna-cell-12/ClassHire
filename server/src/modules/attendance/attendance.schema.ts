import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const createSessionSchema = z.object({
  courseId: z.string().uuid(),
  date: z.coerce.date(),
  topic: z.string().optional(),
});

export const markAttendanceSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.nativeEnum(AttendanceStatus),
      }),
    )
    .min(1),
});

export const listSessionsQuerySchema = z.object({
  courseId: z.string().uuid(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
