import { Injectable } from '@nestjs/common';

/**
 * SCORING ENGINE — klinik norm içermeyen skor modeli.
 * Prototipteki computeResult/computeSubscores fonksiyonlarının birebir portu.
 * Ham olay verisi istemciden gelir (performance.now() ile ölçülmüş RT'ler);
 * skorlar YALNIZCA burada hesaplanır — istemci skoru asla belirlemez.
 */

export interface RawEvent {
  correct: boolean;
  errorType?: 'omission' | 'commission' | null;
  reactionTime?: number | null;
  switchTrial?: boolean; // cognitive-flexibility
  block?: number | null; // distractor-cpt (0=temel, 1=görsel, 2=işitsel, 3=kombine)
  span?: number; // digit-span
}

export interface AgeParams {
  id: string;
  trialFactor: number;
  windowFactor: number;
  rtBaselineShift: number;
  spanStart: number;
  spanMax: number;
}

export interface ScoreInput {
  testId: string;
  testType:
    | 'target-detection'
    | 'go-nogo'
    | 'stroop'
    | 'auditory'
    | 'distractor-cpt'
    | 'visual-search'
    | 'cognitive-flexibility'
    | 'digit-span';
  age?: AgeParams | null;
  events: RawEvent[];
}

export interface ScoreResult {
  overall: number;
  subscores: Record<string, number>;
  blockStats?: Array<{ block: number; acc: number; meanRT: number }> | null;
  stats: {
    total: number;
    correct: number;
    omissions: number;
    commissions: number;
    meanRT: number;
    sdRT: number;
  };
}

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const stddev = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};

@Injectable()
export class ScoringService {
  compute(input: ScoreInput): ScoreResult {
    const { events } = input;
    const total = events.length;
    const correct = events.filter((e) => e.correct).length;
    const omissions = events.filter((e) => e.errorType === 'omission').length;
    const commissions = events.filter((e) => e.errorType === 'commission').length;
    const rts = events.filter((e) => e.reactionTime != null).map((e) => e.reactionTime as number);
    const meanRT = mean(rts);
    const sdRT = stddev(rts);
    const accuracy = total ? (correct / total) * 100 : 0;
    const omissionRate = total ? omissions / total : 0;
    const commissionRate = total ? commissions / total : 0;

    const subscores = this.subscores(input, { omissionRate, commissionRate, meanRT, sdRT, accuracy });
    const overall = Math.round(mean(Object.values(subscores)));

    let blockStats: Array<{ block: number; acc: number; meanRT: number }> | null = null;
    if (input.testType === 'distractor-cpt') {
      blockStats = [0, 1, 2, 3].map((b) => {
        const evs = events.filter((e) => e.block === b);
        const rts = evs.filter((e) => e.reactionTime != null).map((e) => e.reactionTime as number);
        return {
          block: b,
          acc: evs.length ? Math.round((evs.filter((e) => e.correct).length / evs.length) * 100) : 0,
          meanRT: Math.round(mean(rts)),
        };
      });
    }

    return {
      overall,
      subscores,
      blockStats,
      stats: {
        total,
        correct,
        omissions,
        commissions,
        meanRT: Math.round(meanRT),
        sdRT: Math.round(sdRT),
      },
    };
  }

  private subscores(
    input: ScoreInput,
    s: { omissionRate: number; commissionRate: number; meanRT: number; sdRT: number; accuracy: number },
  ): Record<string, number> {
    const { omissionRate, commissionRate, meanRT, sdRT, accuracy } = s;
    const shift = input.age?.rtBaselineShift ?? 0;
    const events = input.events;

    switch (input.testType) {
      case 'target-detection':
      case 'go-nogo':
      case 'stroop': {
        return {
          attention: Math.round(clamp(100 - omissionRate * 140)),
          speed: Math.round(clamp(100 - (meanRT - (250 + shift)) / 6)),
          impulseControl: Math.round(clamp(100 - commissionRate * 160)),
          consistency: Math.round(clamp(100 - sdRT / 4.5)),
          accuracy: Math.round(accuracy),
        };
      }
      case 'distractor-cpt': {
        // CPT alt skorları + blok karşılaştırmalı Çeldirici Direnci (prototiple birebir).
        const base = events.filter((e) => e.block === 0);
        const distracted = events.filter((e) => e.block != null && (e.block as number) > 0);
        const accOf = (arr: RawEvent[]) => (arr.length ? (arr.filter((e) => e.correct).length / arr.length) * 100 : 0);
        const rtOf = (arr: RawEvent[]) => mean(arr.filter((e) => e.reactionTime != null).map((e) => e.reactionTime as number));
        const accDrop = Math.max(0, accOf(base) - accOf(distracted));
        const rtRise = Math.max(0, rtOf(distracted) - rtOf(base));
        return {
          attention: Math.round(clamp(100 - omissionRate * 140)),
          distractorResistance: Math.round(clamp(100 - (accDrop * 1.6 + rtRise / 6))),
          impulseControl: Math.round(clamp(100 - commissionRate * 160)),
          consistency: Math.round(clamp(100 - sdRT / 4.5)),
          accuracy: Math.round(accuracy),
        };
      }
      case 'auditory': {
        // Go/No-Go paradigması; tipik olarak daha hızlı işitsel RT'lere göre kalibre.
        return {
          attention: Math.round(clamp(100 - omissionRate * 140)),
          speed: Math.round(clamp(100 - (meanRT - (220 + shift)) / 5)),
          impulseControl: Math.round(clamp(100 - commissionRate * 160)),
          consistency: Math.round(clamp(100 - sdRT / 4)),
          accuracy: Math.round(accuracy),
        };
      }
      case 'visual-search': {
        // Yanlış hücre + zaman aşımı birlikte arama hatası sayılır.
        return {
          attention: Math.round(clamp(100 - (omissionRate + commissionRate) * 90)),
          speed: Math.round(clamp(100 - (meanRT - (900 + shift * 2)) / 18)),
          consistency: Math.round(clamp(100 - sdRT / 7)),
          accuracy: Math.round(accuracy),
        };
      }
      case 'cognitive-flexibility': {
        const switchRTs = events.filter((e) => e.switchTrial && e.reactionTime != null).map((e) => e.reactionTime as number);
        const repeatRTs = events.filter((e) => !e.switchTrial && e.reactionTime != null).map((e) => e.reactionTime as number);
        const switchCost = switchRTs.length && repeatRTs.length ? mean(switchRTs) - mean(repeatRTs) : 0;
        return {
          flexibility: Math.round(clamp(100 - Math.max(0, switchCost) / 4)),
          speed: Math.round(clamp(100 - (meanRT - (350 + shift)) / 6)),
          consistency: Math.round(clamp(100 - sdRT / 5)),
          accuracy: Math.round(accuracy),
        };
      }
      case 'digit-span': {
        const spans = events.filter((e) => e.correct).map((e) => e.span as number);
        const spanStart = input.age?.spanStart ?? 3;
        const spanMax = input.age?.spanMax ?? 9;
        const maxSpan = spans.length ? Math.max(...spans) : spanStart - 1;
        return {
          memory: Math.round(clamp(((maxSpan - (spanStart - 1)) / (spanMax - (spanStart - 1))) * 100)),
          speed: Math.round(clamp(100 - (meanRT - (1500 + shift * 2)) / 40)),
          consistency: Math.round(clamp(100 - sdRT / 60)),
          accuracy: Math.round(accuracy),
        };
      }
      default:
        return { accuracy: Math.round(accuracy) };
    }
  }
}
