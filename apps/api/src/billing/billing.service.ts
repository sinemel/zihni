import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { PaidPlan } from "./billing.dto";

// iyzico resmi Node SDK'sı: npm i iyzipay
// SDK callback tabanlıdır; promisify sarmalayıcıyla kullanıyoruz.
// NOT: Subscription API metod adlarını sandbox'ta güncel SDK sürümüyle doğrulayın
// (docs: https://docs.iyzico.com — Abonelik / Subscription bölümü).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Iyzipay = require("iyzipay");

const PLAN_PRICING_REF: Record<PaidPlan, string | undefined> = {
  PRO: process.env.IYZICO_PLAN_PRO_REF,
  EXPERT: process.env.IYZICO_PLAN_EXPERT_REF,
};

@Injectable()
export class BillingService {
  private iyzipay = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
  });

  constructor(private prisma: PrismaService) {}

  private call<T>(fn: (req: any, cb: (err: any, res: T) => void) => void, req: any): Promise<T> {
    return new Promise((resolve, reject) =>
      fn.call(this.iyzipay, req, (err: any, res: any) => {
        if (err || res?.status === "failure") reject(err || new BadRequestException(res?.errorMessage || "Ödeme sağlayıcı hatası"));
        else resolve(res);
      })
    );
  }

  /**
   * Abonelik checkout formu başlatır; frontend dönen formu/URL'i açar.
   * Kart bilgisi hiçbir aşamada bizim sunucumuza uğramaz (3D Secure dahil
   * tüm akış iyzico tarafında, PCI-DSS yükü sağlayıcıda).
   */
  async initCheckout(userId: string, plan: PaidPlan) {
    const pricingPlanReferenceCode = PLAN_PRICING_REF[plan];
    if (!pricingPlanReferenceCode) throw new BadRequestException("Plan yapılandırılmamış.");

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true },
    });

    const request = {
      locale: "tr",
      conversationId: `sub_${userId}_${Date.now()}`,
      pricingPlanReferenceCode,
      subscriptionInitialStatus: "ACTIVE",
      callbackUrl: `${process.env.APP_URL}/billing/callback`,
      customer: {
        name: user.profile?.firstName || "Kullanıcı",
        surname: user.profile?.lastName || "-",
        email: user.email,
        // iyzico zorunlu alanları — gerçek akışta kullanıcıdan/profilden alın:
        gsmNumber: "+900000000000",
        identityNumber: "00000000000",
        billingAddress: { contactName: user.email, city: "İstanbul", country: "Türkiye", address: "-" },
        shippingAddress: { contactName: user.email, city: "İstanbul", country: "Türkiye", address: "-" },
      },
    };

    // TODO(sandbox): metod adını SDK ile doğrulayın:
    // this.iyzipay.subscriptionCheckoutForm.initialize / subscription.initialize
    const result: any = await this.call(this.iyzipay.subscriptionCheckoutForm.initialize.bind(this.iyzipay.subscriptionCheckoutForm), request);

    return { checkoutFormContent: result.checkoutFormContent, token: result.token };
  }

  /** Webhook imzasını doğrular (HMAC). Başarısızsa istek reddedilir. */
  verifySignature(rawBody: Buffer, signatureHeader?: string) {
    if (!signatureHeader) throw new UnauthorizedException("İmza eksik.");
    const expected = crypto
      .createHmac("sha256", process.env.IYZICO_SECRET_KEY || "")
      .update(rawBody)
      .digest("base64");
    // NOT: iyzico'nun güncel imza şemasını (header adı + hash girdisi) docs'tan doğrulayın;
    // timing-safe karşılaştırma kullanıyoruz.
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException("Geçersiz webhook imzası.");
    }
  }

  /** Webhook olayını idempotent şekilde işler. */
  async handleWebhook(rawBody: Buffer, signatureHeader?: string) {
    this.verifySignature(rawBody, signatureHeader);

    const payload = JSON.parse(rawBody.toString("utf8"));
    const eventType: string = payload.iyziEventType || payload.eventType || "unknown";
    const externalId: string | undefined = payload.iyziReferenceCode || payload.subscriptionReferenceCode;

    // Idempotency: aynı olay iki kez gelirse ikincisi işlenmez.
    if (externalId) {
      const existing = await this.prisma.paymentEvent.findUnique({ where: { externalId } });
      if (existing?.processed) return { ok: true, duplicate: true };
    }
    const event = await this.prisma.paymentEvent.upsert({
      where: { externalId: externalId || `noid_${Date.now()}` },
      create: { eventType, externalId, payload },
      update: { payload },
    });

    const subscriptionRef: string | undefined = payload.subscriptionReferenceCode;

    switch (eventType) {
      case "subscription.order.success":
      case "SubscriptionOrderSuccess": {
        // Yenileme/ilk tahsilat başarılı → dönemi uzat
        await this.prisma.subscription.updateMany({
          where: { providerSubscriptionId: subscriptionRef },
          data: {
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        break;
      }
      case "subscription.order.failure":
      case "SubscriptionOrderFailure": {
        await this.prisma.subscription.updateMany({
          where: { providerSubscriptionId: subscriptionRef },
          data: { status: "PAST_DUE" },
        });
        break;
      }
      case "subscription.canceled":
      case "SubscriptionCanceled": {
        await this.prisma.subscription.updateMany({
          where: { providerSubscriptionId: subscriptionRef },
          data: { status: "CANCELED", canceledAt: new Date() },
        });
        break;
      }
      default:
        // Bilinmeyen olaylar saklanır ama işlenmez — logla ve geç.
        break;
    }

    await this.prisma.paymentEvent.update({ where: { id: event.id }, data: { processed: true } });
    return { ok: true };
  }

  async getSubscription(userId: string) {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  /**
   * Plan sınırı örneği — FREE planda yalnızca 1 tamamlanmış test hakkı (spec md. 40).
   * Test başlatma endpoint'inde çağrılır.
   */
  async assertCanStartTest(userId: string) {
    const sub = await this.getSubscription(userId);
    const plan = sub?.status === "ACTIVE" ? sub.plan : "FREE";
    if (plan !== "FREE") return;

    const completedCount = await this.prisma.testSession.count({
      where: { userId, state: "COMPLETED" },
    });
    if (completedCount >= 1) {
      throw new ForbiddenException({
        code: "PLAN_LIMIT_REACHED",
        message: "Ücretsiz planda 1 test hakkınız bulunuyor. Sınırsız test için PRO'ya yükseltin.",
      });
    }
  }
}
