import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard, CurrentUser } from '../auth/auth.guards';
import { SessionsService } from './sessions.service';

class RawEventDto {
  correct!: boolean;
  @IsOptional() errorType?: 'omission' | 'commission' | null;
  @IsOptional() reactionTime?: number | null;
  @IsOptional() switchTrial?: boolean;
  @IsOptional() span?: number;
}

class CreateSessionDto {
  @IsString() testId!: string;
  @IsString() ageGroupId!: string;
  @IsOptional() @IsIn(['tr', 'en']) lang?: 'tr' | 'en';
  @IsArray() @ValidateNested({ each: true }) @Type(() => RawEventDto) events!: RawEventDto[];
}

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  /** Ham olayları alır, skoru SUNUCUDA hesaplar, oturumu kaydeder. */
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateSessionDto) {
    return this.sessions.create(userId, dto as any);
  }

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.sessions.list(userId);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.get(userId, id);
  }
}
