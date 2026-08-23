# Prototipten Üretime — Deploy Runbook

Bu doküman Claude Code ile sırayla yürütülür. Her adım tamamlanmadan sonrakine geçilmez.

## 0. Ön koşullar
- Node 20+, Git
- Supabase projesi (DATABASE_URL + DIRECT_URL) — kök `.env`'de hazır
- `apps/api` migration + seed tamamlanmış olmalı (bkz. docs/API.md)

## 1. Backend'i yerel doğrula
```bash
cd apps/api
npm install
npm run start:dev
# İkinci terminalde:
curl http://localhost:3000/self-tests?lang=tr   # 12 anket dönmeli (401 ise JWT header gerekir — normal)
```
Auth uçları: POST /auth/register, /auth/login, /auth/refresh, GET /auth/me

## 2. Web'i yerel doğrula (Next.js 15)
```bash
cd apps/web
npm install
cp .env.example .env   # NEXT_PUBLIC_API_URL=http://localhost:3000
npm run dev            # http://localhost:3001 (3000 API'de; Next otomatik 3001'e kayar)
```
Beklenen davranış:
- Kayıt/giriş önce API'yi dener (accessToken alır, sonraki istekler Bearer ile gider)
- API kapalıysa "çevrimdışı deneme" hesapları devreye girer (user/expert/admin @demo.com)
- Test bitişleri POST /sessions'a gider; API yoksa yerel skor (source: local)

## 3. Production build
```bash
cd apps/web && npm run build   # hata yoksa deploy'a hazır
```

## 4. Deploy
**API → Railway (önerilen):**
1. railway.app → New Project → Deploy from GitHub → `apps/api` kök dizini
2. Env: DATABASE_URL, DIRECT_URL, JWT_SECRET, JWT_REFRESH_SECRET
3. Build: `npm install && npx prisma generate && npm run build` · Start: `npm run start:prod`

**Web → Vercel:**
1. vercel.com → Import GitHub repo → Root Directory: `apps/web`
2. Env: `NEXT_PUBLIC_API_URL=https://<railway-api-adresi>`
3. Deploy → verilen adresi test et

## 5. Deploy sonrası kontrol listesi
- [ ] Kayıt → onboarding → test → sonucun `source: "api"` olduğunu doğrula (Network sekmesi: POST /sessions 201)
- [ ] Uzman girişi expert@... gerçek hesapla (seed'deki roller) çalışıyor
- [ ] Landing'de DEMO/PROTOTİP ibaresi YOK; klinik uyarı VAR (değişmez kural)
- [ ] `.env` dosyaları repoda değil

## Bilinen prototip kalıntıları (bilinçli)
- Çevrimdışı mock hesaplar: API varken devreye girmez; tamamen kaldırma = Supabase Auth tam geçişinde
- 3 test "Yakında" kilidiyle katalogda (yol haritası görünümü — lansman kararı size ait)
- PDF raporu window.print (gerçek PDF: lansman sonrası ilk ay)
