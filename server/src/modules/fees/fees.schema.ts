import { z } from 'zod';

export const createFeeSlabSchema = z.object({
  departmentId: z.string().uuid(),
  semester: z.number().int().min(1).max(8),
  batchYear: z.number().int().min(2000).max(2100),
  tuitionFee: z.number().nonnegative(),
  labFee: z.number().nonnegative(),
  libraryFee: z.number().nonnegative(),
  otherFee: z.number().nonnegative(),
  dueDate: z.coerce.date(),
});

export const updateFeeSlabSchema = createFeeSlabSchema.partial();

export const createPaymentSchema = z.object({
  studentId: z.string().uuid(),
  feeSlabId: z.string().uuid(),
  amountPaid: z.number().positive(),
  paymentMode: z.string().optional(),
  transactionRef: z.string().optional(),
});

export type CreateFeeSlabInput = z.infer<typeof createFeeSlabSchema>;
export type UpdateFeeSlabInput = z.infer<typeof updateFeeSlabSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
