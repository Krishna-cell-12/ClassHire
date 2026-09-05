import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { CreateCourseInput, UpdateCourseInput } from './courses.schema';

interface ListFilters {
  departmentId?: string;
  semester?: number;
  facultyId?: string;
}

export function listCourses(filters: ListFilters) {
  const where: Prisma.CourseWhereInput = {
    departmentId: filters.departmentId,
    semester: filters.semester,
    facultyId: filters.facultyId,
  };
  return prisma.course.findMany({
    where,
    include: { department: true, faculty: true },
    orderBy: [{ semester: 'asc' }, { name: 'asc' }],
  });
}

export async function getCourse(id: string) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: { department: true, faculty: true },
  });
  if (!course) throw AppError.notFound('Course not found');
  return course;
}

export function createCourse(input: CreateCourseInput) {
  return prisma.course.create({ data: input });
}

export async function updateCourse(id: string, input: UpdateCourseInput) {
  await getCourse(id);
  return prisma.course.update({ where: { id }, data: input });
}

export async function deleteCourse(id: string) {
  await getCourse(id);
  await prisma.course.delete({ where: { id } });
}

export async function getCourseStudents(id: string) {
  await getCourse(id);
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: id },
    include: { student: true },
    orderBy: { student: { rollNumber: 'asc' } },
  });
  return enrollments.map((e) => e.student);
}
