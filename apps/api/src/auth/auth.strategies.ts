import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { REFRESH_COOKIE } from "./auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return null;
    return { id: user.id, email: user.email, role: user.role };
  }
}

/* Refresh token yalnızca httpOnly cookie'den okunur (gövde/başlık kabul edilmez). */
export const refreshTokenFromCookie = (req: Request): string | null =>
  (req?.cookies && req.cookies[REFRESH_COOKIE]) || null;

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor() {
    super({
      jwtFromRequest: refreshTokenFromCookie,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET,
      passReqToCallback: true,
    });
  }

  /* Ham token da döndürülür; AuthService.refresh DB özetiyle karşılaştırır (iptal desteği). */
  async validate(req: Request, payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role, refreshToken: refreshTokenFromCookie(req) };
  }
}
