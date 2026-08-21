import { Body, Controller, Get, Headers, HttpCode, Post, RawBodyRequest, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { BillingService } from "./billing.service";
import { CheckoutDto } from "./billing.dto";
import { JwtAuthGuard, CurrentUser } from "../auth/auth.guards";

@Controller("billing")
export class BillingController {
  constructor(private billing: BillingService) {}

  /** Abonelik satın alma — iyzico checkout formunu başlatır. */
  @Post("checkout")
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: { id: string }, @Body() dto: CheckoutDto) {
    return this.billing.initCheckout(user.id, dto.plan);
  }

  /** Mevcut abonelik durumu (frontend plan rozetleri/banner için). */
  @Get("subscription")
  @UseGuards(JwtAuthGuard)
  subscription(@CurrentUser() user: { id: string }) {
    return this.billing.getSubscription(user.id);
  }
}

@Controller("webhooks")
export class PaymentWebhookController {
  constructor(private billing: BillingService) {}

  /**
   * iyzico bildirim endpoint'i — public ama HMAC imza doğrulamalı.
   * ÖNEMLİ: main.ts'te raw body açık olmalı:
   *   NestFactory.create(AppModule, { rawBody: true })
   */
  @Post("payment")
  @HttpCode(200)
  handle(
    @Req() req: RawBodyRequest<Request>,
    // Header adını iyzico docs'tan doğrulayın (ör. x-iyz-signature):
    @Headers("x-iyz-signature") signature?: string
  ) {
    return this.billing.handleWebhook(req.rawBody as Buffer, signature);
  }
}
