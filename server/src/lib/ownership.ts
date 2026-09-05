import { prisma } from './prisma';
import { AppError } from './AppError';

export async function facultyIdForUser(userId: string): Promise<string> {
  const faculty = await prisma.faculty.findUnique({ where: { userId }, select: { id: true } });
  if (!faculty) throw AppError.forbidden('No faculty profile linked to this account');
  return faculty.id;
}

export async function studentIdForUser(userId: string): Promise<string> {
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) throw AppError.forbidden('No student profile linked to this account');
  return student.id;
}

export async function assertCourseOwnedByFaculty(courseId: string, facultyId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { facultyId: true } });
  if (!course) throw AppError.notFound('Course not found');
  if (course.facultyId !== facultyId) {
    throw AppError.forbidden('You do not have access to this course');
  }
}
