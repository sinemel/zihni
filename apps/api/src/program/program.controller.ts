import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../auth/auth.guards';
import { ProgramService } from './program.service';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ProgramController {
  constructor(
    private readonly program: ProgramService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('program/today')
  today(@CurrentUser('id') userId: string) {
    return this.program.today(userId);
  }

  /** Seviye Belirleme Testi sonucundan seviye atar (wpm/comp sunucu grade'inden gelmeli). */
  @Post('program/level')
  setLevel(@CurrentUser('id') userId: string, @Body() body: { wpm: number; comp: number }) {
    return this.program.setLevelFromReading(userId, body.wpm, body.comp);
  }

  /** Egzersiz oturumu kaydı + program ilerlemesi tek çağrıda. */
  @Post('trainings')
  async recordTraining(
    @CurrentUser('id') userId: string,
    @Body() body: { exerciseId: string; score: number; detail?: string; wpm?: number; comp?: number },
  ) {
    const session = await this.prisma.trainingSession.create({
      data: {
        userId,
        exerciseId: body.exerciseId,
        score: Math.min(100, Math.max(0, Math.round(body.score))),
        detail: body.detail?.slice(0, 120),
        wpm: body.wpm ?? null,
        comp: body.comp ?? null,
      },
      select: { id: true, exerciseId: true, score: true, detail: true, wpm: true, createdAt: true },
    });
    const program = await this.program.completeExercise(userId, body.exerciseId);
    return { session, program };
  }

  @Get('trainings')
  listTrainings(@CurrentUser('id') userId: string) {
    return this.prisma.trainingSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, exerciseId: true, score: true, detail: true, wpm: true, comp: true, createdAt: true },
    });
  }
}
