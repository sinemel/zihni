import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { AuthService, REFRESH_COOKIE, refreshCookieOptions, TokenPair } from "./auth.service";
import { RegisterDto, LoginDto } from "./auth.dto";
import { JwtAuthGuard, CurrentUser } from "./auth.guards";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  /* Access token gövdede, refresh token httpOnly cookie'de döner; refresh gövdeye yazılmaz. */
  private reply(res: Response, tokens: TokenPair) {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
    return { accessToken: tokens.accessToken };
  }

  /* Görev 5a — kaba kuvvet önleme: IP başına dakikada 5 kayıt denemesi */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.reply(res, await this.authService.register(dto));
  }

  /* Görev 5a — kaba kuvvet önleme: IP başına dakikada 5 giriş denemesi */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.reply(res, await this.authService.login(dto));
  }

  @Post("refresh")
  @UseGuards(AuthGuard("jwt-refresh"))
  @HttpCode(200)
  async refresh(
    @CurrentUser() user: { id: string; email: string; role: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.reply(res, await this.authService.refresh(user, user.refreshToken));
  }

  /* Guard yok: access token süresi dolmuş olsa da çıkış yapılabilmeli.
     Cookie'deki refresh token sunucuda iptal edilir ve cookie silinir. */
  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);
    const { maxAge, ...clearOpts } = refreshCookieOptions();
    res.clearCookie(REFRESH_COOKIE, clearOpts);
    return { success: true };
  }
}

@Controller("users")
export class UsersController {
  constructor(private authService: AuthService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: string }) {
    return this.authService.me(user.id);
  }
}
