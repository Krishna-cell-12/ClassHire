import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { AppError } from '../../lib/AppError';
import { LoginInput, RegisterInput } from './auth.schema';

const BCRYPT_ROUNDS = 12;

function signToken(user: { id: string; role: Role; email: string }) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const token = signToken(user);
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: input.email, passwordHash, role: input.role },
    });

    if (input.role === Role.STUDENT) {
      await tx.student.create({
        data: {
          userId: user.id,
          rollNumber: input.rollNumber,
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          phone: input.phone,
          address: input.address,
          departmentId: input.departmentId,
          currentSemester: input.currentSemester,
          batchYear: input.batchYear,
        },
      });
    } else if (input.role === Role.FACULTY) {
      await tx.faculty.create({
        data: {
          userId: user.id,
          employeeCode: input.employeeCode,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          departmentId: input.departmentId,
          designation: input.designation,
        },
      });
    }

    return { id: user.id, email: user.email, role: user.role };
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: { include: { department: true } }, faculty: { include: { department: true } } },
  });
  if (!user) throw AppError.notFound('User not found');

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
