import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser = require("cookie-parser");
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /* Refresh token httpOnly cookie'den okunur (auth/auth.strategies.ts) */
  app.use(cookieParser());

  /* Görev 5b — CORS: yalnızca izinli origin'ler; joker (*) ASLA kullanılmaz.
     credentials: true → tarayıcı refresh cookie'sini gönderebilir; web tarafı fetch'e
     credentials: "include" ekler. Geliştirmede varsayılan: Next.js dev sunucusu (3001).
     Üretimde .env: CORS_ORIGINS=https://zihni.com,https://www.zihni.com */
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? "http://localhost:3001").split(","),
    credentials: true,
  });

  /* DTO doğrulaması: tanımsız alanları at, tip dönüşümünü yap */
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Zihni API hazır → http://localhost:${port}`);
}

bootstrap();
