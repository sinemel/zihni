/**
 * İçerik seed'i — content.seed.json'dan ReadingText + SelfTestDef upsert eder.
 * Çalıştırma: npx ts-node prisma/seed-content.ts  (DIRECT_URL ile)
 */
import { PrismaClient } from '@prisma/client';
import * as seed from '../content/content.seed.json';

const prisma = new PrismaClient();

async function main() {
  for (const t of (seed as any).texts) {
    await prisma.readingText.upsert({
      where: { id: t.id },
      create: t,
      update: { ...t },
    });
  }
  console.log(`✓ ${(seed as any).texts.length} okuma metni`);

  for (const st of (seed as any).selfTests) {
    await prisma.selfTestDef.upsert({
      where: { id: st.id },
      create: { id: st.id, config: st },
      update: { config: st },
    });
  }
  console.log(`✓ ${(seed as any).selfTests.length} öz değerlendirme testi`);
}

main().finally(() => prisma.$disconnect());
