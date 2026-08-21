import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Lang = 'tr' | 'en';
const L = (v: any, lang: Lang) => (v && typeof v === 'object' && !Array.isArray(v) ? v[lang] ?? v.tr : v);

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- OKUMA METİNLERİ ----------

  async listTexts(lang: Lang, lib?: string) {
    const where: any = { isActive: true, lang };
    if (lib) where.lib = lib;
    let texts = await this.prisma.readingText.findMany({
      where,
      select: { id: true, title: true, category: true, level: true, lib: true, lang: true, wordCount: true },
      orderBy: { id: 'asc' },
    });
    // Seçili dil/kütüphanede metin yoksa TR'ye düş (prototipteki davranış)
    if (texts.length === 0) {
      texts = await this.prisma.readingText.findMany({
        where: { isActive: true, lang: 'tr', ...(lib ? { lib } : {}) },
        select: { id: true, title: true, category: true, level: true, lib: true, lang: true, wordCount: true },
        orderBy: { id: 'asc' },
      });
    }
    return texts;
  }

  /** Metin gövdesi + sorular (cevap indexleri OLMADAN — cevaplar sunucuda kalır). */
  async getText(id: string) {
    const t = await this.prisma.readingText.findFirst({ where: { id, isActive: true } });
    if (!t) throw new NotFoundException();
    const questions = (t.questions as any[]).map((q, i) => ({ i, q: q.q, options: q.options }));
    return { id: t.id, title: t.title, category: t.category, level: t.level, lib: t.lib, lang: t.lang, body: t.body, wordCount: t.wordCount, questions };
  }

  /** Anlama cevaplarını sunucuda değerlendirir; k/dk hesabını da burada yapar. */
  async gradeText(id: string, answers: number[], elapsedSec?: number) {
    const t = await this.prisma.readingText.findFirst({ where: { id, isActive: true } });
    if (!t) throw new NotFoundException();
    const qs = t.questions as any[];
    if (!Array.isArray(answers) || answers.length !== qs.length) {
      throw new BadRequestException('answers length mismatch');
    }
    const correct = qs.filter((q, i) => answers[i] === q.answer).length;
    const comp = Math.round((correct / qs.length) * 100);
    const wpm = elapsedSec && elapsedSec > 0 ? Math.round(t.wordCount / (elapsedSec / 60)) : null;
    return { correct, total: qs.length, comp, wpm };
  }

  // ---------- ÖZ DEĞERLENDİRME ----------

  async listSelfTests(lang: Lang) {
    const defs = await this.prisma.selfTestDef.findMany({ where: { isActive: true } });
    return defs.map((d) => {
      const c = d.config as any;
      return {
        id: d.id,
        name: L(c.name, lang),
        desc: L(c.desc, lang),
        icon: c.icon,
        color: c.color,
        duration: c.duration,
        type: c.type,
        questionCount: c.questions.length,
        discover: L(c.discover, lang),
      };
    });
  }

  /** Çalıştırma için soru seti — quiz'lerde doğru cevap indexi GÖNDERİLMEZ. */
  async getSelfTest(id: string, lang: Lang) {
    const d = await this.prisma.selfTestDef.findFirst({ where: { id, isActive: true } });
    if (!d) throw new NotFoundException();
    const c = d.config as any;
    const scale = c.scale ? L(c.scale, lang) : null;
    const questions = c.questions.map((q: any, i: number) => {
      if (c.type === 'binary') return { i, t: L(q.t, lang), a: L(q.a, lang), b: L(q.b, lang) };
      if (c.type === 'quiz') return { i, t: L(q.t, lang), options: L(q.options, lang) };
      if (c.type === 'likert-dims') return { i, t: L(q.t, lang) };
      return { i, t: L(q, lang) };
    });
    return { id: d.id, name: L(c.name, lang), type: c.type, icon: c.icon, color: c.color, scale, questions };
  }

  /** Sonuç motoru — prototipteki computeOutcome'un sunucu portu. */
  async submitSelfTest(userId: string, id: string, lang: Lang, answers: any[]) {
    const d = await this.prisma.selfTestDef.findFirst({ where: { id, isActive: true } });
    if (!d) throw new NotFoundException();
    const c = d.config as any;
    const total = c.questions.length;
    if (!Array.isArray(answers) || answers.length !== total) {
      throw new BadRequestException('answers length mismatch');
    }

    let outcome: any;
    let summaryText: string;

    if (c.type === 'binary') {
      const counts: Record<string, { a: number; b: number }> = {};
      Object.keys(c.dims).forEach((k) => (counts[k] = { a: 0, b: 0 }));
      c.questions.forEach((q: any, i: number) => {
        counts[q.dim][answers[i] === 'a' ? 'a' : 'b']++;
      });
      const sides = Object.entries(c.dims).map(([k, dim]: any) =>
        counts[k].a >= counts[k].b ? dim.a : dim.b,
      );
      outcome = { sides: sides.map((s: any) => ({ tr: L(s, 'tr'), en: L(s, 'en') })) };
      summaryText = sides.map((s: any) => L(s, lang)).join(' · ');
    } else if (c.type === 'quiz') {
      const correct = c.questions.filter((q: any, i: number) => answers[i] === q.answer).length;
      const acc = Math.round((correct / total) * 100);
      outcome = { correct, wrong: total - correct, acc };
      summaryText = lang === 'en' ? `${acc}% accuracy (${correct}/${total})` : `%${acc} doğruluk (${correct}/${total})`;
    } else if (c.type === 'likert-dims') {
      const dims = Object.entries(c.dims).map(([k, dim]: any) => {
        const idxs = c.questions.map((q: any, i: number) => ({ q, i })).filter((x: any) => x.q.dim === k);
        const avg = idxs.reduce((a: number, x: any) => a + answers[x.i], 0) / idxs.length;
        const pct = Math.round(((avg - 1) / 4) * 100);
        const blurb = pct >= 70 ? dim.high : pct <= 40 ? dim.low : null;
        return { key: k, label: dim.label, pct, blurb };
      });
      const top = [...dims].sort((a, b) => b.pct - a.pct)[0];
      outcome = { dims };
      summaryText = lang === 'en'
        ? `Most prominent: ${L(top.label, 'en')} (${top.pct}%)`
        : `En belirgin: ${L(top.label, 'tr')} (%${top.pct})`;
    } else {
      // likert
      const sum = answers.reduce((a: number, v: number) => a + v, 0);
      const band = c.bands.find((b: any) => sum >= b.min && sum <= b.max) || c.bands[c.bands.length - 1];
      outcome = { sum, band };
      summaryText = L(band.label, lang);
    }

    const saved = await this.prisma.selfTestResult.create({
      data: { userId, selfTestId: id, lang, answers: answers as any, outcome, summaryText },
      select: { id: true, selfTestId: true, summaryText: true, outcome: true, createdAt: true },
    });
    return saved;
  }

  async listSelfResults(userId: string) {
    return this.prisma.selfTestResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, selfTestId: true, summaryText: true, outcome: true, createdAt: true },
    });
  }
}
