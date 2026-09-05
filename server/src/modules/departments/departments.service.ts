import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { CreateDepartmentInput, UpdateDepartmentInput } from './departments.schema';

export function listDepartments() {
  return prisma.department.findMany({ orderBy: { name: 'asc' } });
}

export async function getDepartment(id: string) {
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) throw AppError.notFound('Department not found');
  return dept;
}

export function createDepartment(input: CreateDepartmentInput) {
  return prisma.department.create({ data: input });
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput) {
  await getDepartment(id);
  return prisma.department.update({ where: { id }, data: input });
}

export async function deleteDepartment(id: string) {
  await getDepartment(id);
  await prisma.department.delete({ where: { id } });
}
