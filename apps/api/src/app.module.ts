import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ContentModule } from "./content/content.module";
import { SessionsModule } from "./sessions/sessions.module";
import { ScoringModule } from "./scoring/scoring.module";
import { ProgramModule } from "./program/program.module";
import { BillingModule } from "./billing/billing.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    /* Görev 5a — Global hız sınırı: IP başına dakikada 60 istek.
       Hassas uçlarda (auth, texts) controller'larda @Throttle ile daha sıkı
       limitler tanımlıdır; global değer diğer tüm uçları kapsar. */
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    ContentModule,
    SessionsModule,
    ScoringModule,
    ProgramModule,
    BillingModule,
  ],
  providers: [
    /* ThrottlerGuard'ı global guard yap: her uç otomatik korunur */
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
