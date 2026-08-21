import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { ScoringService } from '../scoring/scoring.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [SessionsController],
  providers: [SessionsService, ScoringService],
  exports: [SessionsService],
})
export class SessionsModule {}
