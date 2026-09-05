import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { paginationMeta, skipTake } from '../../utils/pagination';
import * as authService from '../auth/auth.service';
import { CreateFacultyInput, ListFacultyQuery, UpdateFacultyInput } from './faculty.schema';

export async function listFaculty(query: ListFacultyQuery) {
  const { page, limit, departmentId } = query;
  const where = { departmentId };

  const [data, total] = await Promise.all([
    prisma.faculty.findMany({
      where,
      include: { department: true },
      orderBy: { lastName: 'asc' },
      ...skipTake(page, limit),
    }),
    prisma.faculty.count({ where }),
  ]);

  return { data, meta: paginationMeta(page, limit, total) };
}

export async function getFaculty(id: string) {
  const faculty = await prisma.faculty.findUnique({
    where: { id },
    include: { department: true, courses: true, user: { select: { email: true, isActive: true } } },
  });
  if (!faculty) throw AppError.notFound('Faculty not found');
  return faculty;
}

export function createFaculty(input: CreateFacultyInput) {
  return authService.register({ ...input, role: Role.FACULTY });
}

export async function updateFaculty(id: string, input: UpdateFacultyInput) {
  await getFaculty(id);
  const { isActive, departmentId, ...rest } = input;
  return prisma.faculty.update({
    where: { id },
    data: {
      ...rest,
      ...(departmentId ? { department: { connect: { id: departmentId } } } : {}),
      ...(isActive !== undefined ? { isActive, user: { update: { isActive } } } : {}),
    },
  });
}

export async function deactivateFaculty(id: string) {
  const faculty = await getFaculty(id);
  await prisma.$transaction([
    prisma.faculty.update({ where: { id }, data: { isActive: false } }),
    prisma.user.update({ where: { id: faculty.userId }, data: { isActive: false } }),
  ]);
}
