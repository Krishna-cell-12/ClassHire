import 'dotenv/config';
import { randomUUID } from 'crypto';
import { PrismaClient, Gender, AttendanceStatus, ExamType, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

faker.seed(42);

const DEV_PASSWORD = 'Password123!';
const BCRYPT_ROUNDS = 10; // lower rounds for seed speed; production auth uses 12

const DEPARTMENTS = [
  { name: 'Computer Science and Engineering', code: 'CSE' },
  { name: 'Electronics and Communication Engineering', code: 'ECE' },
  { name: 'Mechanical Engineering', code: 'ME' },
  { name: 'Civil Engineering', code: 'CIVIL' },
  { name: 'Information Technology', code: 'IT' },
];

// semester -> list of [code-suffix, name, credits] per department code
const CURRICULUM: Record<string, Record<number, Array<[string, string, number]>>> = {
  CSE: {
    1: [['101', 'Programming Fundamentals', 4], ['102', 'Engineering Mathematics I', 4], ['103', 'Basic Electrical Engineering', 3]],
    2: [['201', 'Data Structures', 4], ['202', 'Engineering Mathematics II', 4], ['203', 'Digital Logic Design', 3]],
    3: [['301', 'Object Oriented Programming', 4], ['302', 'Discrete Mathematics', 3], ['303', 'Computer Organization', 4]],
    4: [['401', 'Database Management Systems', 4], ['402', 'Operating Systems', 4], ['403', 'Design and Analysis of Algorithms', 4]],
    5: [['501', 'Computer Networks', 4], ['502', 'Software Engineering', 3], ['503', 'Theory of Computation', 3]],
    6: [['601', 'Web Technologies', 3], ['602', 'Compiler Design', 4], ['603', 'Artificial Intelligence', 3]],
    7: [['701', 'Machine Learning', 4], ['702', 'Distributed Systems', 3], ['703', 'Cloud Computing', 3]],
    8: [['801', 'Cyber Security', 3], ['802', 'Major Project', 6], ['803', 'Elective: Blockchain', 3]],
  },
  ECE: {
    1: [['101', 'Basic Electronics', 4], ['102', 'Engineering Mathematics I', 4], ['103', 'Engineering Graphics', 3]],
    2: [['201', 'Circuit Theory', 4], ['202', 'Engineering Mathematics II', 4], ['203', 'Electronic Devices', 3]],
    3: [['301', 'Signals and Systems', 4], ['302', 'Digital Electronics', 4], ['303', 'Network Analysis', 3]],
    4: [['401', 'Analog Communication', 4], ['402', 'Microprocessors', 4], ['403', 'Electromagnetic Theory', 3]],
    5: [['501', 'Digital Communication', 4], ['502', 'Control Systems', 3], ['503', 'VLSI Design', 3]],
    6: [['601', 'Antenna Theory', 3], ['602', 'Embedded Systems', 4], ['603', 'Wireless Communication', 3]],
    7: [['701', 'Satellite Communication', 3], ['702', 'Optical Communication', 3], ['703', 'Robotics', 3]],
    8: [['801', 'IoT Systems', 3], ['802', 'Major Project', 6], ['803', 'Elective: 5G Networks', 3]],
  },
  ME: {
    1: [['101', 'Engineering Mechanics', 4], ['102', 'Engineering Mathematics I', 4], ['103', 'Workshop Practice', 2]],
    2: [['201', 'Thermodynamics', 4], ['202', 'Engineering Mathematics II', 4], ['203', 'Material Science', 3]],
    3: [['301', 'Fluid Mechanics', 4], ['302', 'Strength of Materials', 4], ['303', 'Manufacturing Processes', 3]],
    4: [['401', 'Machine Design I', 4], ['402', 'Heat Transfer', 4], ['403', 'Kinematics of Machines', 3]],
    5: [['501', 'Machine Design II', 4], ['502', 'Dynamics of Machines', 3], ['503', 'Industrial Engineering', 3]],
    6: [['601', 'CAD/CAM', 3], ['602', 'Refrigeration and AC', 3], ['603', 'Automobile Engineering', 3]],
    7: [['701', 'Robotics and Automation', 3], ['702', 'Power Plant Engineering', 3], ['703', 'Operations Research', 3]],
    8: [['801', 'Mechatronics', 3], ['802', 'Major Project', 6], ['803', 'Elective: Renewable Energy', 3]],
  },
  CIVIL: {
    1: [['101', 'Engineering Mechanics', 4], ['102', 'Engineering Mathematics I', 4], ['103', 'Surveying I', 3]],
    2: [['201', 'Building Materials', 3], ['202', 'Engineering Mathematics II', 4], ['203', 'Surveying II', 3]],
    3: [['301', 'Strength of Materials', 4], ['302', 'Fluid Mechanics', 4], ['303', 'Concrete Technology', 3]],
    4: [['401', 'Structural Analysis I', 4], ['402', 'Geotechnical Engineering I', 4], ['403', 'Hydraulics', 3]],
    5: [['501', 'Structural Analysis II', 4], ['502', 'Geotechnical Engineering II', 3], ['503', 'Transportation Engineering', 3]],
    6: [['601', 'Design of RCC Structures', 4], ['602', 'Environmental Engineering', 3], ['603', 'Estimation and Costing', 3]],
    7: [['701', 'Design of Steel Structures', 3], ['702', 'Construction Management', 3], ['703', 'Earthquake Engineering', 3]],
    8: [['801', 'Sustainable Engineering', 3], ['802', 'Major Project', 6], ['803', 'Elective: Urban Planning', 3]],
  },
  IT: {
    1: [['101', 'Programming Fundamentals', 4], ['102', 'Engineering Mathematics I', 4], ['103', 'IT Essentials', 3]],
    2: [['201', 'Data Structures', 4], ['202', 'Engineering Mathematics II', 4], ['203', 'Digital Logic Design', 3]],
    3: [['301', 'Object Oriented Programming', 4], ['302', 'Computer Networks I', 3], ['303', 'Database Systems', 4]],
    4: [['401', 'Web Development', 4], ['402', 'Operating Systems', 4], ['403', 'Computer Networks II', 3]],
    5: [['501', 'Software Engineering', 3], ['502', 'Information Security', 3], ['503', 'Mobile App Development', 3]],
    6: [['601', 'Data Mining', 3], ['602', 'Cloud Computing', 3], ['603', 'DevOps', 3]],
    7: [['701', 'Machine Learning', 4], ['702', 'Big Data Analytics', 3], ['703', 'Enterprise Systems', 3]],
    8: [['801', 'IT Project Management', 3], ['802', 'Major Project', 6], ['803', 'Elective: Blockchain', 3]],
  },
};

const CURRENT_ACADEMIC_YEAR = '2025-26';
const BATCH_YEARS = [2022, 2023, 2024, 2025];
const STUDENTS_PER_DEPARTMENT = 80;
const FACULTY_PER_DEPARTMENT = 4;
const SESSIONS_PER_COURSE = 30;

function batchYearToSemester(batchYear: number): number {
  const yearsElapsed = 2025 - batchYear;
  const semester = yearsElapsed * 2 + 1;
  return Math.min(8, Math.max(1, semester));
}

function computeGrade(marksObtained: number, maxMarks: number): string {
  const pct = (marksObtained / maxMarks) * 100;
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
}

async function resetDatabase() {
  console.log('SEED_RESET=true -> wiping existing data...');
  await prisma.resultMark.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.feeSlab.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.student.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
}

async function main() {
  if (process.env.SEED_RESET === 'true') {
    await resetDatabase();
  }

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS);

  // 1. Departments
  const departments = await Promise.all(DEPARTMENTS.map((d) => prisma.department.create({ data: d })));
  console.log(`Created ${departments.length} departments`);

  // 2. Admin
  await prisma.user.create({ data: { email: 'admin@college.edu', passwordHash, role: 'ADMIN' } });
  console.log('Created 1 admin user (admin@college.edu)');

  // 3. Faculty
  const facultyByDept: Record<string, { id: string }[]> = {};
  let facultyCount = 0;
  for (const dept of departments) {
    facultyByDept[dept.code] = [];
    for (let i = 0; i < FACULTY_PER_DEPARTMENT; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email({ firstName, lastName, provider: 'college.edu' }).toLowerCase();
      const user = await prisma.user.create({ data: { email, passwordHash, role: 'FACULTY' } });
      const faculty = await prisma.faculty.create({
        data: {
          userId: user.id,
          employeeCode: `${dept.code}-EMP-${String(i + 1).padStart(3, '0')}`,
          firstName,
          lastName,
          phone: faker.phone.number(),
          departmentId: dept.id,
          designation: faker.helpers.arrayElement(['Assistant Professor', 'Associate Professor', 'Professor']),
        },
      });
      facultyByDept[dept.code].push(faculty);
      facultyCount += 1;
    }
  }
  console.log(`Created ${facultyCount} faculty`);

  // 4. Courses
  const coursesByDeptSemester: Record<string, Record<number, { id: string }[]>> = {};
  let courseCount = 0;
  for (const dept of departments) {
    coursesByDeptSemester[dept.code] = {};
    const facultyPool = facultyByDept[dept.code];
    let facultyIdx = 0;
    for (let semester = 1; semester <= 8; semester++) {
      coursesByDeptSemester[dept.code][semester] = [];
      const subjects = CURRICULUM[dept.code][semester];
      for (const [suffix, name, credits] of subjects) {
        const faculty = facultyPool[facultyIdx % facultyPool.length];
        facultyIdx += 1;
        const course = await prisma.course.create({
          data: { code: `${dept.code}${suffix}`, name, departmentId: dept.id, semester, credits, facultyId: faculty.id },
        });
        coursesByDeptSemester[dept.code][semester].push(course);
        courseCount += 1;
      }
    }
  }
  console.log(`Created ${courseCount} courses`);

  // 5. Fee slabs
  let feeSlabCount = 0;
  const feeSlabsByKey: Record<string, { id: string; totalAmount: number }> = {};
  for (const dept of departments) {
    for (const batchYear of BATCH_YEARS) {
      const semester = batchYearToSemester(batchYear);
      const tuitionFee = 45000 + Math.floor(Math.random() * 15000);
      const labFee = 4000 + Math.floor(Math.random() * 2000);
      const libraryFee = 1500 + Math.floor(Math.random() * 1000);
      const otherFee = 2500 + Math.floor(Math.random() * 1500);
      const totalAmount = tuitionFee + labFee + libraryFee + otherFee;
      const slab = await prisma.feeSlab.create({
        data: { departmentId: dept.id, semester, batchYear, tuitionFee, labFee, libraryFee, otherFee, totalAmount, dueDate: new Date('2026-01-15') },
      });
      feeSlabsByKey[`${dept.id}:${semester}:${batchYear}`] = { id: slab.id, totalAmount };
      feeSlabCount += 1;
    }
  }
  console.log(`Created ${feeSlabCount} fee slabs`);

  // 6. Students + per-student biases; enrollments and fee payments batched via createMany
  const studentBiases = new Map<string, { attendanceTendency: number; abilityBias: number }>();
  const enrollmentRows: Prisma.EnrollmentCreateManyInput[] = [];
  const feePaymentRows: Prisma.FeePaymentCreateManyInput[] = [];
  // courseId -> list of enrolled studentIds, built while creating enrollments (avoids re-querying)
  const enrolledStudentsByCourse: Record<string, string[]> = {};

  // The very first seeded student is deliberately pushed into High risk after the fact (poor
  // attendance, zero fee payment, sharp recent-exam decline) so the Risk Radar always has one
  // clean, reproducible High-risk example to demo -- see the override block below.
  let demoRiskStudentId: string | null = null;

  let studentCount = 0;
  for (const dept of departments) {
    let rollSeq = 1;
    for (let i = 0; i < STUDENTS_PER_DEPARTMENT; i++) {
      const batchYear = BATCH_YEARS[i % BATCH_YEARS.length];
      const currentSemester = batchYearToSemester(batchYear);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email({ firstName, lastName, provider: 'college.edu' }).toLowerCase();
      const rollNumber = `${dept.code}${batchYear}${String(rollSeq).padStart(3, '0')}`;
      rollSeq += 1;

      const user = await prisma.user.create({ data: { email, passwordHash, role: 'STUDENT' } });
      const student = await prisma.student.create({
        data: {
          userId: user.id,
          rollNumber,
          firstName,
          lastName,
          dateOfBirth: faker.date.birthdate({ min: 18, max: 24, mode: 'age' }),
          gender: faker.helpers.arrayElement([Gender.MALE, Gender.FEMALE, Gender.OTHER]),
          phone: faker.phone.number(),
          address: faker.location.streetAddress(),
          departmentId: dept.id,
          currentSemester,
          batchYear,
        },
      });
      studentCount += 1;

      if (dept === departments[0] && i === 0) {
        demoRiskStudentId = student.id;
      }

      studentBiases.set(student.id, {
        attendanceTendency: 0.6 + Math.random() * 0.38,
        abilityBias: 0.4 + Math.random() * 0.55,
      });

      const courses = coursesByDeptSemester[dept.code][currentSemester];
      for (const course of courses) {
        enrollmentRows.push({ studentId: student.id, courseId: course.id, academicYear: CURRENT_ACADEMIC_YEAR });
        (enrolledStudentsByCourse[course.id] ??= []).push(student.id);
      }

      const slabInfo = feeSlabsByKey[`${dept.id}:${currentSemester}:${batchYear}`];
      if (slabInfo && student.id !== demoRiskStudentId) {
        const roll = Math.random();
        let amountPaid = 0;
        let status: 'PAID' | 'PARTIAL' = 'PARTIAL';
        if (roll < 0.7) {
          amountPaid = slabInfo.totalAmount;
          status = 'PAID';
        } else if (roll < 0.9) {
          amountPaid = Math.round(slabInfo.totalAmount * (0.3 + Math.random() * 0.4));
          status = 'PARTIAL';
        }
        if (amountPaid > 0) {
          feePaymentRows.push({
            studentId: student.id,
            feeSlabId: slabInfo.id,
            amountPaid,
            paymentMode: faker.helpers.arrayElement(['CASH', 'ONLINE', 'CHEQUE']),
            transactionRef: faker.string.alphanumeric(10).toUpperCase(),
            status,
            paymentDate: faker.date.recent({ days: 60 }),
          });
        }
      }
    }
  }
  console.log(`Created ${studentCount} students`);

  await prisma.enrollment.createMany({ data: enrollmentRows });
  console.log(`Created ${enrollmentRows.length} enrollments`);

  await prisma.feePayment.createMany({ data: feePaymentRows });
  console.log(`Created ${feePaymentRows.length} fee payments`);

  // 7. Attendance sessions/records + exams/results, batched per course via createMany with client-generated UUIDs
  const sessionRows: Prisma.AttendanceSessionCreateManyInput[] = [];
  const attendanceRecordRows: Prisma.AttendanceRecordCreateManyInput[] = [];
  const examRows: Prisma.ExamCreateManyInput[] = [];
  const resultRows: Prisma.ResultMarkCreateManyInput[] = [];

  const EXAM_DEFS: Array<[ExamType, string, number]> = [
    [ExamType.QUIZ, 'Quiz 1', 20],
    [ExamType.MIDTERM, 'Midterm', 50],
    [ExamType.FINAL, 'Final Exam', 100],
  ];

  for (const dept of departments) {
    for (let semester = 1; semester <= 8; semester++) {
      for (const course of coursesByDeptSemester[dept.code][semester]) {
        const studentIds = enrolledStudentsByCourse[course.id] ?? [];
        if (studentIds.length === 0) continue;

        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() - 70);

        for (let s = 0; s < SESSIONS_PER_COURSE; s++) {
          const sessionId = randomUUID();
          const date = new Date(baseDate);
          date.setDate(date.getDate() + s * 2);
          sessionRows.push({ id: sessionId, courseId: course.id, date, topic: faker.lorem.words(3) });

          for (const studentId of studentIds) {
            const bias = studentBiases.get(studentId)?.attendanceTendency ?? 0.8;
            const roll = Math.random();
            let status: AttendanceStatus;
            if (roll < bias) status = AttendanceStatus.PRESENT;
            else if (roll < bias + 0.05) status = AttendanceStatus.LATE;
            else if (roll < bias + 0.08) status = AttendanceStatus.EXCUSED;
            else status = AttendanceStatus.ABSENT;

            attendanceRecordRows.push({ sessionId, studentId, status });
          }
        }

        for (const [examType, title, maxMarks] of EXAM_DEFS) {
          const examId = randomUUID();
          examRows.push({ id: examId, courseId: course.id, examType, title, examDate: faker.date.recent({ days: 90 }), maxMarks });

          for (const studentId of studentIds) {
            const ability = studentBiases.get(studentId)?.abilityBias ?? 0.7;
            const noise = (Math.random() - 0.5) * 0.2;
            const pct = Math.min(1, Math.max(0.1, ability + noise));
            const marksObtained = Math.round(pct * maxMarks * 10) / 10;
            resultRows.push({ examId, studentId, marksObtained, grade: computeGrade(marksObtained, maxMarks) });
          }
        }
      }
    }
  }

  // Override the demo student's attendance to mostly-absent and crash their most recent exam
  // per course (vs. their earlier ones), so they land in High risk under the fixed 70+ bucket:
  // poor attendance + zero fee payment (forced above) + a sharp grade decline.
  if (demoRiskStudentId) {
    for (const row of attendanceRecordRows) {
      if (row.studentId === demoRiskStudentId) {
        row.status = Math.random() < 0.85 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
      }
    }

    const examById = new Map(examRows.map((e) => [e.id, e]));
    const demoResultsByCourse = new Map<string, Prisma.ResultMarkCreateManyInput[]>();
    for (const row of resultRows) {
      if (row.studentId !== demoRiskStudentId) continue;
      const exam = examById.get(row.examId as string);
      if (!exam) continue;
      const list = demoResultsByCourse.get(exam.courseId as string) ?? [];
      list.push(row);
      demoResultsByCourse.set(exam.courseId as string, list);
    }
    for (const results of demoResultsByCourse.values()) {
      results.sort((a, b) => {
        const dateA = examById.get(a.examId as string)!.examDate as Date;
        const dateB = examById.get(b.examId as string)!.examDate as Date;
        return dateA.getTime() - dateB.getTime();
      });
      const mostRecent = results[results.length - 1];
      const exam = examById.get(mostRecent.examId as string)!;
      const maxMarks = Number(exam.maxMarks);
      mostRecent.marksObtained = Math.round(maxMarks * 0.15 * 10) / 10;
      mostRecent.grade = computeGrade(Number(mostRecent.marksObtained), maxMarks);
    }
    console.log('Applied High-risk demo override to student', demoRiskStudentId);
  }

  await prisma.attendanceSession.createMany({ data: sessionRows });
  console.log(`Created ${sessionRows.length} attendance sessions`);
  await prisma.attendanceRecord.createMany({ data: attendanceRecordRows });
  console.log(`Created ${attendanceRecordRows.length} attendance records`);
  await prisma.exam.createMany({ data: examRows });
  console.log(`Created ${examRows.length} exams`);
  await prisma.resultMark.createMany({ data: resultRows });
  console.log(`Created ${resultRows.length} result marks`);

  console.log('\nSeed complete. Summary:');
  console.log(`  Departments: ${departments.length}`);
  console.log(`  Faculty: ${facultyCount}`);
  console.log(`  Courses: ${courseCount}`);
  console.log(`  Fee slabs: ${feeSlabCount}`);
  console.log(`  Students: ${studentCount}`);
  console.log(`  Enrollments: ${enrollmentRows.length}`);
  console.log(`  Fee payments: ${feePaymentRows.length}`);
  console.log(`  Attendance sessions: ${sessionRows.length} (${attendanceRecordRows.length} records)`);
  console.log(`  Exams: ${examRows.length} (${resultRows.length} results)`);
  console.log(`\nLogin as admin: admin@college.edu / ${DEV_PASSWORD}`);
  console.log(`All seeded faculty/student accounts share the password: ${DEV_PASSWORD}`);
  if (demoRiskStudentId) {
    console.log(`Guaranteed High-risk demo student id: ${demoRiskStudentId}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
