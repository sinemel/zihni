import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import seed from '../content/content.seed.json';

const LEVEL_POOLS: Record<string, string[]> = (seed as any).levelPools;
export const PROGRAM_LENGTH = 21;

export const dayPlan = (day: number, level: string): string[] => {
  const pool = LEVEL_POOLS[level] || LEVEL_POOLS['Orta'];
  return [0, 1, 2].map((i) => pool[(day * 3 + i) % pool.length]);
};

/** Seviye ataması — prototipteki kuralın birebir portu. */
export const assignLevel = (wpm: number, comp: number): string => {
  let lvl = wpm < 120 ? 'Başlangıç' : wpm <= 200 ? 'Orta' : 'İleri';
  if (comp < 60 && lvl !== 'Başlangıç') lvl = lvl === 'İleri' ? 'Orta' : 'Başlangıç';
  return lvl;
};

@Injectable()
export class ProgramService {
  constructor(private readonly prisma: PrismaService) {}

  async setLevelFromReading(userId: string, wpm: number, comp: number) {
    if (!Number.isFinite(wpm) || wpm <= 0 || comp < 0 || comp > 100) {
      throw new BadRequestException('invalid wpm/comp');
    }
    const level = assignLevel(wpm, comp);
    const program = await this.prisma.userProgram.upsert({
      where: { userId },
      create: { userId, level, day: 1, completedToday: [], completedDays: 0 },
      update: { level, day: 1, completedToday: [], completedDays: 0 },
    });
    return { ...program, todaysPlan: dayPlan(program.day, program.level) };
  }

  async today(userId: string) {
    const program = await this.prisma.userProgram.findUnique({ where: { userId } });
    if (!program) return { level: null };
    return { ...program, programLength: PROGRAM_LENGTH, todaysPlan: dayPlan(program.day, program.level) };
  }

  /**
   * Bir egzersiz tamamlandığında çağrılır (TrainingSession kaydından sonra).
   * Günün 3 egzersizi bitince günü ilerletir.
   */
  async completeExercise(userId: string, exerciseId: string) {
    const program = await this.prisma.userProgram.findUnique({ where: { userId } });
    if (!program) return { level: null };

    const plan = dayPlan(program.day, program.level);
    if (!plan.includes(exerciseId) || program.completedToday.includes(exerciseId)) {
      return { ...program, todaysPlan: plan, dayAdvanced: false };
    }

    const nextToday = [...program.completedToday, exerciseId];
    const doneCount = nextToday.filter((id) => plan.includes(id)).length;

    if (doneCount >= 3) {
      const updated = await this.prisma.userProgram.update({
        where: { userId },
        data: {
          day: Math.min(PROGRAM_LENGTH, program.day + 1),
          completedToday: [],
          completedDays: program.completedDays + 1,
          lastActivityAt: new Date(),
        },
      });
      return { ...updated, todaysPlan: dayPlan(updated.day, updated.level), dayAdvanced: true, completedDay: program.day };
    }

    const updated = await this.prisma.userProgram.update({
      where: { userId },
      data: { completedToday: nextToday, lastActivityAt: new Date() },
    });
    return { ...updated, todaysPlan: plan, dayAdvanced: false };
  }
}
