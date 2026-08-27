# Güvenlik Görevleri 4-5 — Claude Code Talimatı

Bu dosya Claude Code ile yürütülür. Sıra önemli; her adımın doğrulaması yapılmadan sonrakine geçilmez.

## Görev 4 — Üretim source map'lerini kapat (apps/web)

1. `apps/web/next.config.mjs` dosyasına şu ayarı ekle:
```js
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false, // formüllerin/yapının haritasını üretime sızdırma
};
```
2. Üretim build'i al ve iki doğrulama yap:
```bash
cd apps/web && npm run build
# (a) .map dosyası üretilmemiş olmalı:
find .next/static -name "*.js.map" | wc -l   # beklenen: 0
# (b) Karar 1-A doğrulaması — skor formülleri bundle'da OLMAMALI:
grep -rl "computeSubscores" .next/static/chunks/ | wc -l   # beklenen: 0
grep -rl "Demo123" .next/static/chunks/ | wc -l            # beklenen: 0 (MOCK_USERS silinmiş)
```
İkisi de 0 değilse dur ve nedenini raporla (tree-shaking'i bozan bir referans olabilir).

## Görev 5 — API rate limiting + CORS kısıtlaması (apps/api)

### 5a. Rate limiting
1. `npm i @nestjs/throttler`
2. `app.module.ts`'e global throttle ekle:
```ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
// imports dizisine:
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),   // dakikada 60 istek/IP
// providers dizisine:
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```
3. Hassas uçlara daha sıkı limit (`@Throttle`) ekle:
   - `POST /auth/login` ve `POST /auth/register`: dakikada 5 (kaba kuvvet önleme)
   - `GET /texts`: dakikada 10 (kütüphane kazımayı yavaşlatır)

### 5b. CORS
`main.ts`'de CORS'u ortam değişkenine bağla; joker (*) KULLANMA:
```ts
app.enableCors({
  origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3001').split(','),
  credentials: true,
});
```
`.env.example`'a ekle:
```
CORS_ORIGINS=http://localhost:3001
# Üretimde: CORS_ORIGINS=https://zihni.com,https://www.zihni.com
```

### 5c. Doğrulama
```bash
npm run start:dev
# Rate limit: 6 hızlı login denemesi → 6.sı 429 dönmeli
for i in $(seq 1 6); do curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"x@x.com","password":"y"}'; done
# CORS: izinsiz origin'den istek → Access-Control-Allow-Origin başlığı DÖNMEMELİ
curl -s -i -H "Origin: https://kotu-site.example" localhost:3000/texts | grep -i "access-control-allow-origin"
```

## Bitince
- Değişiklikleri tek commit yap: `security: prod source map kapalı + throttle + CORS kısıtlı (Görev 4-5)`
- `docs/DEPLOY.md`'deki deploy sonrası kontrol listesine şu iki maddeyi ekle:
  - [ ] Canlıda `*.js.map` erişilemiyor
  - [ ] Canlı API başka origin'den çağrılamıyor (tarayıcı konsolunda CORS hatası)
