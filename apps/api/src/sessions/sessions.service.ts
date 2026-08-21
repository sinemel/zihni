import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { RawEvent, ScoringService } from '../scoring/scoring.service';
import catalogData from '../content/content.seed.json';

const TEST_CATALOG: Array<{ id: string; type: string }> = (catalogData as any).testCatalog;
const AGE_GROUPS: Array<any> = (catalogData as any).ageGroups;

const MAX_EVENTS = 500;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly scoring: ScoringService,
  ) {}

  async create(userId: string, dto: { testId: string; ageGroupId: string; lang?: string; events: RawEvent[] }) {
    const test = TEST_CATALOG.find((t) => t.id === dto.testId);
    if (!test) throw new NotFoundException('Unknown testId');
    const age = AGE_GROUPS.find((a) => a.id === dto.ageGroupId);
    if (!age) throw new BadRequestException('Unknown ageGroupId');

    // Temel bütünlük kontrolleri — istemci skoru asla belirlemez ama
    // olay verisi de makul sınırlarda olmalı.
    if (!Array.isArray(dto.events) || dto.events.length === 0) {
      throw new BadRequestException('events required');
    }
    if (dto.events.length > MAX_EVENTS) {
      throw new BadRequestException('too many events');
    }
    for (const e of dto.events) {
      if (e.reactionTime != null && (e.reactionTime < 0 || e.reactionTime > 60_000)) {
        throw new BadRequestException('reactionTime out of range');
      }
    }

    // Plan hakkı (FREE = 1 test) — billing modülündeki mevcut kuralla.
    await this.billing.assertCanStartTest(userId);

    const result = this.scoring.compute({
      testId: test.id,
      testType: test.type as any,
      age,
      events: dto.events,
    });

    const session = await this.prisma.cognitiveSession.create({
      data: {
        userId,
        testId: test.id,
        testType: test.type,
        ageGroupId: age.id,
        lang: dto.lang === 'en' ? 'en' : 'tr',
        events: dto.events as any,
        overall: result.overall,
        subscores: result.subscores as any,
        stats: { ...result.stats, blockStats: result.blockStats ?? undefined } as any,
      },
      select: { id: true, testId: true, overall: true, subscores: true, stats: true, createdAt: true },
    });

    return session;
  }

  async list(userId: string) {
    return this.prisma.cognitiveSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, testId: true, overall: true, subscores: true, stats: true, createdAt: true },
    });
  }

  async get(userId: string, id: string) {
    const s = await this.prisma.cognitiveSession.findFirst({
      where: { id, userId },
      select: { id: true, testId: true, testType: true, ageGroupId: true, overall: true, subscores: true, stats: true, createdAt: true },
    });
    if (!s) throw new NotFoundException();
    return s;
  }
}
