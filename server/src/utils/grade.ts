export function computeGrade(marksObtained: number, maxMarks: number): string {
  const pct = (marksObtained / maxMarks) * 100;
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
}
