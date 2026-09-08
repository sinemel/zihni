import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto, LoginDto } from "./auth.dto";

/* Refresh token httpOnly cookie'de taşınır (docs/gorev-oturum-kaliciligi.md, Bölüm 1 kararı).
   Tarayıcı JS'i bu cookie'yi okuyamaz; yalnızca /auth/* isteklerine eklenir. */
export const REFRESH_COOKIE = "zihni_refresh";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === "production";

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: IS_PROD, // üretimde yalnızca HTTPS
  sameSite: (IS_PROD ? "none" : "lax") as "none" | "lax", // Vercel ↔ Railway ayrı site → none
  path: "/auth",
  maxAge: REFRESH_TTL_MS,
});

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export type TokenPair = { accessToken: string; refreshToken: string };
type JwtUser = { id: string; email: string; role: string };

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  /* Her çift üretiminde refresh token'ın özeti DB'ye yazılır: tek aktif refresh oturumu.
     Yeni giriş eski cihazın refresh token'ını geçersiz kılar (access token süresi dolunca yeniden giriş). */
  private async issueTokens(user: JwtUser): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwt.sign(payload, { secret: process.env.JWT_SECRET, expiresIn: "15m" });
    const refreshToken = this.jwt.sign(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: "30d" });
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: hashToken(refreshToken) } });
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Bu e-posta ile kayıtlı bir hesap zaten var.");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: "USER",
        profile: { create: { firstName: dto.firstName, lastName: dto.lastName } },
        consents: { create: { type: "KVKK_AYDINLATMA", accepted: true, version: "1.0" } },
      },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("E-posta veya şifre hatalı.");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("E-posta veya şifre hatalı.");

    return this.issueTokens(user);
  }

  /* Rotasyon: sunulan refresh token DB'deki özetle eşleşmeli (iptal edilmiş/eski token reddedilir),
     ardından yeni çift üretilir ve eski token geçersiz olur. */
  async refresh(user: JwtUser, presentedToken: string) {
    const db = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, role: true, refreshTokenHash: true },
    });
    if (!db || !db.refreshTokenHash || db.refreshTokenHash !== hashToken(presentedToken)) {
      throw new UnauthorizedException("Oturum geçersiz; yeniden giriş yapın.");
    }
    return this.issueTokens(db);
  }

  /* Sunucu tarafı iptal: cookie'deki token bu kullanıcının aktif token'ıysa özet silinir.
     Token yoksa/bozuksa sessizce geçilir; istemci yerel temizliği her durumda yapar. */
  async logout(presentedToken?: string) {
    if (!presentedToken) return;
    try {
      const payload = this.jwt.verify<{ sub: string }>(presentedToken, {
        secret: process.env.JWT_REFRESH_SECRET,
        ignoreExpiration: true,
      });
      await this.prisma.user.updateMany({
        where: { id: payload.sub, refreshTokenHash: hashToken(presentedToken) },
        data: { refreshTokenHash: null },
      });
    } catch {
      /* geçersiz token: iptal edilecek bir şey yok */
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, refreshTokenHash, ...safeUser } = user;
    return safeUser;
  }
}
