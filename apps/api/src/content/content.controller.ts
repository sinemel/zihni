import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../auth/auth.guards';
import { ContentService } from './content.service';

const asLang = (v?: string): 'tr' | 'en' => (v === 'en' ? 'en' : 'tr');

@UseGuards(JwtAuthGuard)
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('texts')
  listTexts(@Query('lang') lang?: string, @Query('lib') lib?: string) {
    return this.content.listTexts(asLang(lang), lib);
  }

  @Get('texts/:id')
  getText(@Param('id') id: string) {
    return this.content.getText(id);
  }

  /** Anlama sorularını sunucuda puanlar; okuma testi için wpm de döner. */
  @Post('texts/:id/grade')
  grade(@Param('id') id: string, @Body() body: { answers: number[]; elapsedSec?: number }) {
    return this.content.gradeText(id, body.answers, body.elapsedSec);
  }

  @Get('self-tests')
  listSelf(@Query('lang') lang?: string) {
    return this.content.listSelfTests(asLang(lang));
  }

  @Get('self-tests/:id')
  getSelf(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.content.getSelfTest(id, asLang(lang));
  }

  @Post('self-tests/:id/submit')
  submitSelf(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { lang?: string; answers: any[] },
  ) {
    return this.content.submitSelfTest(userId, id, asLang(body.lang), body.answers);
  }

  @Get('self-tests-results/me')
  myResults(@CurrentUser('id') userId: string) {
    return this.content.listSelfResults(userId);
  }
}
