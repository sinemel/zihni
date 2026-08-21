import { Module } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { BillingController, PaymentWebhookController } from "./billing.controller";
import { PlanGuard } from "./plan.guard";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [BillingController, PaymentWebhookController],
  providers: [BillingService, PlanGuard],
  exports: [BillingService, PlanGuard],
})
export class BillingModule {}
