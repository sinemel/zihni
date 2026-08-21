// Kognita — prisma/seed.ts
// Çalıştırma: npx prisma db seed  (veya package.json'daki "prisma.seed" script'i üzerinden)
// Gerekli paketler: bcryptjs, ts-node (veya tsx)

import { PrismaClient, Role, SessionState, SubscriptionPlan } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_DEFS = [
  { slug: "sustained-attention", name: "Sürdürülebilir Dikkat", description: "Yalnızca mavi daire hedefine dokunun.", difficulty: "Kolay", config: { type: "target-detection", trials: 16 } },
  { slug: "go-nogo", name: "Tepki Hızı (Go / No-Go)", description: "Yeşilde dokunun, kırmızıda dokunmayın.", difficulty: "Orta", config: { type: "go-nogo", trials: 16 } },
  { slug: "stroop", name: "Stroop Benzeri Görev", description: "Kelimeyi değil, yazının rengini seçin.", difficulty: "Orta", config: { type: "stroop", trials: 12 } },
  { slug: "working-memory", name: "Çalışma Belleği", description: "Sayı dizisini hatırlayın.", difficulty: "Orta", config: { type: "digit-span", trials: 8 } },
  { slug: "visual-search", name: "Görsel Dikkat", description: "Hedef sembolü ızgarada bulun.", difficulty: "Orta", config: { type: "visual-search", trials: 10 } },
  { slug: "auditory", name: "İşitsel Dikkat", description: "Yüksek tonda dokunun, kalın tonda dokunmayın.", difficulty: "Zor", config: { type: "auditory", trials: 14 } },
  { slug: "cognitive-flexibility", name: "Bilişsel Esneklik", description: "Değişen kurala uyum sağlayın.", difficulty: "Zor", config: { type: "cognitive-flexibility", trials: 16 } },
];

const FIRST_NAMES = ["Ahmet", "Elif", "Mert", "Zeynep", "Ayşe", "Can", "Deniz", "Ece", "Burak", "Selin", "Emre", "Gizem", "Kerem", "Naz"];
const LAST_NAMES = ["Yıldız", "Demir", "Kaya", "Aksoy", "Şahin", "Çelik", "Aydın", "Koç", "Arslan", "Özdemir", "Polat", "Güneş"];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomName = () => ({ firstName: pick(FIRST_NAMES), lastName: pick(LAST_NAMES) });

async function main() {
  console.log("Seed başlıyor…");

  // Temiz başlangıç (FK sırasına dikkat)
  await prisma.testEvent.deleteMany();
  await prisma.resultMetric.deleteMany();
  await prisma.report.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.testSession.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.client.deleteMany();
  await prisma.expert.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.testVersion.deleteMany();
  await prisma.test.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Demo123!", 10);

  // --- Testler + v1 versiyonları ---
  const tests = [];
  for (const t of TEST_DEFS) {
    const test = await prisma.test.create({
      data: {
        slug: t.slug,
        name: t.name,
        description: t.description,
        difficulty: t.difficulty,
        config: t.config,
        versions: { create: [{ version: 1, config: t.config }] },
      },
      include: { versions: true },
    });
    tests.push(test);
  }

  // --- Admin ---
  await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash,
      role: Role.ADMIN,
      profile: { create: { firstName: "Admin", lastName: "Kognita" } },
    },
  });

  // --- 3 Uzman ---
  const expertUsers = [];
  for (let i = 0; i < 3; i++) {
    const name = randomName();
    const user = await prisma.user.create({
      data: {
        email: i === 0 ? "expert@example.com" : `expert${i + 1}@example.com`,
        passwordHash,
        role: Role.EXPERT,
        profile: { create: { firstName: name.firstName, lastName: name.lastName } },
        expertProfile: { create: { title: "Uzman Psikolog" } },
      },
    });
    expertUsers.push(user);
  }

  // --- Uzman başına 4 danışan ---
  const allClients = [];
  for (const eu of expertUsers) {
    const expert = await prisma.expert.findUniqueOrThrow({ where: { userId: eu.id } });
    for (let i = 0; i < 4; i++) {
      const name = randomName();
      const client = await prisma.client.create({
        data: {
          expertId: expert.id,
          firstName: name.firstName,
          lastName: name.lastName,
          email: `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}@mail.com`,
        },
      });
      allClients.push(client);
    }
  }

  // --- 10 kullanıcı ---
  const users = [];
  for (let i = 0; i < 10; i++) {
    const name = randomName();
    const user = await prisma.user.create({
      data: {
        email: i === 0 ? "user@example.com" : `user${i + 1}@example.com`,
        passwordHash,
        role: Role.USER,
        profile: { create: { firstName: name.firstName, lastName: name.lastName } },
        subscription: { create: { plan: i % 3 === 0 ? SubscriptionPlan.PRO : SubscriptionPlan.FREE } },
        consents: { create: { type: "KVKK_AYDINLATMA", accepted: true, version: "1.0" } },
      },
    });
    users.push(user);
  }

  // --- 20 test session + ~1000 event ---
  let totalEvents = 0;
  for (let i = 0; i < 20; i++) {
    const user = pick(users);
    const test = pick(tests);
    const version = test.versions[0];
    const trialCount = 45 + Math.floor(Math.random() * 10); // 20 session * ~50 ≈ 1000 event

    const session = await prisma.testSession.create({
      data: {
        userId: user.id,
        testVersionId: version.id,
        state: SessionState.COMPLETED,
        startedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30),
        completedAt: new Date(),
      },
    });

    let correctCount = 0;
    const events = Array.from({ length: trialCount }, (_, e) => {
      const correct = Math.random() < 0.78;
      if (correct) correctCount++;
      return {
        sessionId: session.id,
        timestamp: BigInt(Date.now()),
        eventType: "response",
        stimulus: `stim_${e}`,
        response: correct ? "tap" : Math.random() < 0.5 ? "none" : "tap",
        reactionTime: correct ? Math.round(300 + Math.random() * 400) : null,
        correct,
        errorType: correct ? null : Math.random() < 0.5 ? "omission" : "commission",
      };
    });
    await prisma.testEvent.createMany({ data: events });
    totalEvents += events.length;

    const overall = Math.round((correctCount / trialCount) * 100);
    const result = await prisma.testResult.create({
      data: {
        sessionId: session.id,
        overall,
        metrics: {
          create: [
            { key: "attention", value: overall + (Math.random() * 10 - 5) },
            { key: "speed", value: overall + (Math.random() * 10 - 5) },
            { key: "consistency", value: overall + (Math.random() * 10 - 5) },
            { key: "accuracy", value: overall },
          ],
        },
      },
    });

    // Her 3 session'dan birini bir danışan raporuna bağla (uzman paneli demo verisi için)
    if (i % 3 === 0) {
      const client = pick(allClients);
      await prisma.report.create({
        data: {
          resultId: result.id,
          clientId: client.id,
          expertNote: "Demo verilerle üretilmiştir; klinik tanı amacı taşımaz.",
        },
      });
    }
  }

  console.log(
    `Seed tamamlandı: ${users.length} kullanıcı, ${expertUsers.length} uzman, ${allClients.length} danışan, 20 session, ${totalEvents} event.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
