import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import catalogData from '../content/content.seed.json';
import { CreateAssignmentDto, CreateClientDto, UpdateAssignmentDto, UpdateClientDto } from './experts.dto';

type CatalogTest = { id: string; type: string; name: { tr: string; en?: string }; desc?: { tr: string }; difficulty?: string; trials?: number };
const TEST_CATALOG: CatalogTest[] = (catalogData as any).testCatalog;

const CLIENT_SELECT = {
  id: true, firstName: true, lastName: true, email: true, phone: true, birthDate: true, userId: true, createdAt: true,
} as const;

const ASSIGNMENT_INCLUDE = {
  test: { select: { slug: true, name: true } },
  client: { select: { id: true, firstName: true, lastName: true } },
} as const;

const SESSION_SELECT = {
  id: true, testId: true, testType: true, ageGroupId: true, overall: true, subscores: true, stats: true, createdAt: true,
} as const;

/**
 * Uzman paneli — danışan ve atama CRUD'u.
 * Tüm sorgular istekteki kullanıcının Expert profiline (expertId) göre kapsanır;
 * başka uzmanın danışanına erişim 404 döner (varlık sızdırılmaz).
 */
@Injectable()
export class ExpertsService {
  constructor(private readonly prisma: PrismaService) {}

  private async expertFor(userId: string) {
    const expert = await this.prisma.expert.findUnique({ where: { userId }, select: { id: true } });
    if (!expert) {
      throw new ForbiddenException({ code: 'EXPERT_PROFILE_REQUIRED', message: 'Bu hesap için uzman profili tanımlı değil.' });
    }
    return expert;
  }

  private async ownedClient(expertId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({ where: { id: clientId, expertId }, select: CLIENT_SELECT });
    if (!client) throw new NotFoundException('Danışan bulunamadı.');
    return client;
  }

  /** E-posta ile kayıtlı bir uygulama kullanıcısı varsa danışana bağlar. */
  private async findUserIdByEmail(email?: string | null) {
    if (!email) return null;
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  private toDate(value?: string) {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Geçersiz tarih.');
    return d;
  }

  private serializeAssignment(a: any) {
    return {
      id: a.id,
      clientId: a.clientId,
      testId: a.test?.slug ?? null,
      testName: a.test?.name ?? null,
      clientName: a.client ? `${a.client.firstName} ${a.client.lastName}` : undefined,
      dueDate: a.dueDate,
      note: a.note,
      status: a.status,
      createdAt: a.createdAt,
    };
  }

  // ---------- Danışanlar ----------

  async listClients(userId: string) {
    const expert = await this.expertFor(userId);
    const clients = await this.prisma.client.findMany({
      where: { expertId: expert.id },
      orderBy: { createdAt: 'asc' },
      select: { ...CLIENT_SELECT, assignments: { select: { status: true } } },
    });
    // Bağlı kullanıcıların son oturumu (tek sorgu, kullanıcı başına en yeni kayıt)
    const userIds = clients.map((c) => c.userId).filter((v): v is string => !!v);
    const lastByUser = new Map<string, { testId: string; overall: number; createdAt: Date }>();
    if (userIds.length) {
      const sessions = await this.prisma.cognitiveSession.findMany({
        where: { userId: { in: userIds } },
        orderBy: { createdAt: 'desc' },
        select: { userId: true, testId: true, overall: true, createdAt: true },
      });
      for (const s of sessions) if (!lastByUser.has(s.userId)) lastByUser.set(s.userId, s);
    }
    return clients.map(({ assignments, ...c }) => ({
      ...c,
      lastSession: c.userId ? lastByUser.get(c.userId) ?? null : null,
      pendingAssignments: assignments.filter((a) => a.status === 'PENDING').length,
      completedAssignments: assignments.filter((a) => a.status === 'COMPLETED').length,
    }));
  }

  async createClient(userId: string, dto: CreateClientDto) {
    const expert = await this.expertFor(userId);
    const email = dto.email?.trim() || null;
    return this.prisma.client.create({
      data: {
        expertId: expert.id,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        phone: dto.phone?.trim() || null,
        birthDate: this.toDate(dto.birthDate) ?? null,
        userId: await this.findUserIdByEmail(email),
      },
      select: CLIENT_SELECT,
    });
  }

  async getClient(userId: string, clientId: string) {
    const expert = await this.expertFor(userId);
    const client = await this.ownedClient(expert.id, clientId);
    const assignments = await this.prisma.assignment.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      include: ASSIGNMENT_INCLUDE,
    });
    return { ...client, assignments: assignments.map((a) => this.serializeAssignment(a)) };
  }

  async updateClient(userId: string, clientId: string, dto: UpdateClientDto) {
    const expert = await this.expertFor(userId);
    const current = await this.ownedClient(expert.id, clientId);
    const email = dto.email !== undefined ? dto.email.trim() || null : undefined;
    const data: any = {
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
      phone: dto.phone !== undefined ? dto.phone.trim() || null : undefined,
      birthDate: dto.birthDate !== undefined ? this.toDate(dto.birthDate) ?? null : undefined,
    };
    if (email !== undefined) {
      data.email = email;
      // E-posta değişince hesap bağını yeniden kur (bağ yalnızca e-posta eşleşmesine dayanır)
      if (email !== current.email) data.userId = await this.findUserIdByEmail(email);
    }
    return this.prisma.client.update({ where: { id: current.id }, data, select: CLIENT_SELECT });
  }

  async deleteClient(userId: string, clientId: string) {
    const expert = await this.expertFor(userId);
    const client = await this.ownedClient(expert.id, clientId);
    await this.prisma.client.delete({ where: { id: client.id } }); // atamalar cascade ile silinir
    return { id: client.id, deleted: true };
  }

  /** Danışanın uygulamada tamamladığı gerçek test oturumları (hesap bağlıysa). */
  async clientSessions(userId: string, clientId: string) {
    const expert = await this.expertFor(userId);
    const client = await this.ownedClient(expert.id, clientId);
    if (!client.userId) return [];
    return this.prisma.cognitiveSession.findMany({
      where: { userId: client.userId },
      orderBy: { createdAt: 'asc' },
      select: SESSION_SELECT,
    });
  }

  // ---------- Atamalar ----------

  async listAssignments(userId: string, clientId?: string) {
    const expert = await this.expertFor(userId);
    const rows = await this.prisma.assignment.findMany({
      where: { client: { expertId: expert.id, ...(clientId ? { id: clientId } : {}) } },
      orderBy: { createdAt: 'desc' },
      include: ASSIGNMENT_INCLUDE,
    });
    return rows.map((a) => this.serializeAssignment(a));
  }

  /** Test.slug → Test kaydı; katalogda olup tabloda olmayan test ilk atamada oluşturulur. */
  private async resolveTest(slug: string) {
    const existing = await this.prisma.test.findUnique({ where: { slug }, select: { id: true } });
    if (existing) return existing;
    const cat = TEST_CATALOG.find((t) => t.id === slug);
    if (!cat) throw new BadRequestException('Bilinmeyen testId.');
    return this.prisma.test.create({
      data: {
        slug,
        name: cat.name.tr,
        description: cat.desc?.tr ?? '',
        difficulty: cat.difficulty ?? 'Orta',
        config: { type: cat.type, trials: cat.trials ?? 12 },
        versions: { create: [{ version: 1, config: { type: cat.type, trials: cat.trials ?? 12 } }] },
      },
      select: { id: true },
    });
  }

  async createAssignment(userId: string, dto: CreateAssignmentDto) {
    const expert = await this.expertFor(userId);
    const client = await this.ownedClient(expert.id, dto.clientId);
    const test = await this.resolveTest(dto.testId);
    const assignment = await this.prisma.assignment.create({
      data: {
        clientId: client.id,
        testId: test.id,
        dueDate: this.toDate(dto.dueDate) ?? null,
        note: dto.note?.trim() || null,
      },
      include: ASSIGNMENT_INCLUDE,
    });
    // Danışanın uygulama hesabı varsa bildirim bırak ("Testi Ata ve Bildir")
    if (client.userId) {
      await this.prisma.notification.create({
        data: {
          userId: client.userId,
          type: 'ASSIGNMENT',
          message: `Uzmanınız size "${assignment.test.name}" testini atadı.`,
        },
      });
    }
    return this.serializeAssignment(assignment);
  }

  async updateAssignment(userId: string, assignmentId: string, dto: UpdateAssignmentDto) {
    const expert = await this.expertFor(userId);
    const existing = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, client: { expertId: expert.id } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Atama bulunamadı.');
    const updated = await this.prisma.assignment.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
        dueDate: dto.dueDate !== undefined ? this.toDate(dto.dueDate) ?? null : undefined,
        note: dto.note !== undefined ? dto.note.trim() || null : undefined,
      },
      include: ASSIGNMENT_INCLUDE,
    });
    return this.serializeAssignment(updated);
  }

  async deleteAssignment(userId: string, assignmentId: string) {
    const expert = await this.expertFor(userId);
    const existing = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, client: { expertId: expert.id } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Atama bulunamadı.');
    await this.prisma.assignment.delete({ where: { id: existing.id } });
    return { id: existing.id, deleted: true };
  }
}

