# Görev — Oturum Kalıcılığı ve Çıkışta Temizlik (apps/web)

Bu dosya Claude Code ile yürütülür. Sıra önemli; her bölümün doğrulaması yapılmadan sonrakine geçilmez.
İlgili dosya: `apps/web/src/App.jsx` (tek dosyalık uygulama). Backend: `apps/api` (NestJS, JWT).

**Durum (2026-09-08):** Bölüm 1-4 uygulandı, `next build` temiz. Doğrulama 1-6'nın tamamı yerel API +
PostgreSQL ile tarayıcıda yapıldı ve geçti (ayrıntı Bölüm 5). Bu sırada API'de üç hata bulunup düzeltildi (Bölüm 6).

## Önceki durum (sorun)

- `setApiToken()` token'ı yalnızca modül düzeyindeki `API_TOKEN` değişkeninde tutuyordu; sayfa yenilenince oturum düşüyordu.
- Ana bileşendeki `sessions`, `trainings`, `selfResults`, `streak`, `program`, `notifications` state'leri
  bellekte kalıyor, yenilemede kayboluyordu.
- Çıkış (`onLogout`) yalnızca `setScreen("landing")` çağırıyordu. Token ve kullanıcı verisi bellekte kalıyor;
  aynı sekmede ikinci bir hesapla giriş yapılınca önceki kullanıcının verileri görünmeye devam ediyordu (veri sızıntısı).

## Bölüm 1 — Token'ı kalıcı yap

1. `setApiToken(token, refreshToken)` token'ları belleğe ve `localStorage`'a birlikte yazar:
   `zihni.accessToken` ve `zihni.refreshToken`. `null` gelirse iki anahtar da silinir.
2. Modül yüklenirken (ilk render'dan önce) `API_TOKEN` ve `REFRESH_TOKEN` `localStorage`'dan okunur.
   `localStorage` erişimi `try/catch` ile sarılıdır (özel mod, kapalı depolama).
3. **Karar:** Refresh token da `localStorage`'da tutulur, çünkü API onu `POST /auth/refresh` gövdesindeki
   `refreshToken` alanından okur (`ExtractJwt.fromBodyField`). Access token 15 dk ömürlü olduğundan refresh
   olmadan kalıcılık pratikte işe yaramaz. httpOnly cookie'ye geçiş API tarafında ayrı bir görevdir
   (cookie-parser + strateji değişikliği); o zaman `zihni.refreshToken` anahtarı kaldırılır.

## Bölüm 2 — Yenilemede oturumu geri yükle

1. `restoreSession()`: token varsa `GET /users/me` çağırır. `401` dönerse refresh token ile bir kez
   `POST /auth/refresh` dener, başarılıysa `/users/me`'yi tekrarlar.
2. Yine `401`/`403` ise `setApiToken(null)` çağrılır, uygulama sessizce landing'e düşer (hata toast'ı yok).
3. Ağ hatası / API kapalı (`status 0`) ise token'a **dokunulmaz** ve landing gösterilir; kullanıcı
   bağlantı gelince tekrar giriş yapar. Bu, çevrimdışı prototip akışını korur.
4. Saklı token varsa `booting` durumu landing yerine "Oturumunuz geri yükleniyor…" gösterir; landing'in
   bir an görünüp kaybolması engellenir.
5. `apiFetch` artık durum kodu döndüren `apiRequest()` üzerine kuruludur; 401 ayrımı bu sayede yapılır.

## Bölüm 3 — Kullanıcı verilerini sunucudan yükle

`loadUserData()` tek fonksiyondur; login (`onDone`) ve geri yükleme (Bölüm 2) aynı fonksiyonu çağırır.
Paralel çekilir: `GET /sessions`, `GET /trainings`, `GET /self-tests-results/me`, `GET /program/today`.

- Sunucu kayıtları uygulamanın yerel şekline çevrilir (`testName`, `name`, `icon`, `color` kataloglardan bulunur).
- `program` doğrudan `GET /program/today`'den gelir. Seviye testi bitince `POST /program/level` de çağrılır;
  aksi halde yenilemede program sıfırlanırdı.
- `streak` sunucuda tutulmaz; `deriveStreak()` oturum/antrenman/öz-değerlendirme tarihlerinden türetir
  (bugün ya da dün biten kesintisiz gün sayısı + bu haftanın Pzt..Paz izi).
- Gerçek API girişinde profil `GET /users/me`'den alınır (`toClientUser`); bildirim listesi boş başlar.
  Demo bildirimler (`INITIAL_NOTIFICATIONS`) yalnızca çevrimdışı mock girişte kullanılır.
- Kayıt formu artık `firstName`/`lastName` gönderir (API `RegisterDto` bunları zorunlu tutar; eski tek `name`
  alanı 400 dönüyor ve kayıt sessizce çevrimdışı mock'a düşüyordu).

## Bölüm 4 — Çıkışta temizlik

Çıkış tek bir `handleLogout()` fonksiyonundadır; `ProfileScreen`'e `onLogout={handleLogout}` geçirilir.
Sadece ekran değiştirmek yeterli değildir: bir sonraki kullanıcının önceki kullanıcının verisini görmemesi için
aşağıdaki state'lerin **tamamı** sıfırlanır.

| State / kaynak    | Sıfırlama değeri                                                        |
|-------------------|-------------------------------------------------------------------------|
| API token         | `setApiToken(null)` (bellek + iki `localStorage` anahtarı silinir)      |
| `sessions`        | `[]`                                                                    |
| `selfResults`     | `[]`                                                                    |
| `trainings`       | `[]`                                                                    |
| `currentUser`     | `null`                                                                  |
| `result`          | `null`                                                                  |
| `lastEvents`      | `null`                                                                  |
| `notifications`   | `[]`                                                                    |
| `streak`          | `INITIAL_STREAK()` → `{ count: 0, days: [false×7], last: null }`        |
| `program`         | `INITIAL_PROGRAM()` → `{ level: null, day: 1, completedToday: [], completedDays: 0 }` |

Ek olarak sıfırlananlar: `activeTest`, `activeTraining`, `activeSelfTest`, `libraryText`, `streakShow`,
`trialPromo`, `promoShownRef`, `role` (`"user"`).

Uygulama notları:
- `INITIAL_STREAK` ve `INITIAL_PROGRAM` fonksiyon sabittir; hem `useState(...)` başlangıcında hem çıkışta kullanılır.
  Böylece iki yerde farklı literal olması riski yoktur.
- Sıralama: önce token, sonra veri state'leri, en son `setScreen("landing")`.
- "Hesabımı ve Verilerimi Sil" akışı aynı `handleLogout()`'u çağırır (sunucu tarafı silme ucu henüz yok).
- Sunucuda refresh token iptali (`POST /auth/logout`) henüz yok; eklendiğinde `handleLogout` başında
  fire-and-forget çağrılır, hata dönse bile yerel temizlik yapılır.
- Çapraz sekme: `storage` olayı dinlenir; `zihni.accessToken` başka sekmede silinirse bu sekme de çıkış yapar.
- `screen === "results"` iken `result` null ise bir `useEffect` kataloğa yönlendirir.

## Bölüm 5 — Doğrulama

Her madde tarayıcıda yapılır; web `npm run dev -- -p 3001`, API `npm run start:dev` ve PostgreSQL açık olmalı
(yerel kurulum: Bölüm 7). Test hesapları: `test-a@zihni.local` ve `test-b@zihni.local` (yalnızca yerel veritabanında).

1. **Yenileme:** A ile giriş yap, dashboard'da F5'e bas. Kullanıcı girişte kalmalı, geçmiş oturumlar listelenmeli.
   ✅ Yenilemeden sonra "Merhaba Test", 🔥 1 gün, Test Geçmişi'nde Sürdürülebilir Dikkat 66/100, program Orta Gün 1/21.
2. **Süresi dolmuş token:** `zihni.accessToken` değerini bozuk bir string ile değiştirip yenile.
   API açıkken: 401 → token sessizce silinir, landing görünür. ✅ (`localStorage` boş, konsolda yalnızca 401 kaynak hatası)
   API kapalıyken: landing görünür, token korunur. ✅
3. **Veri yükleme:** Sonuç geçmişi bellekten değil `GET /sessions`'tan gelmeli. ✅ A'nın oturumu, antrenmanı ve
   programı API üzerinden (`POST /sessions`, `/trainings`, `/program/level`) oluşturuldu; yenilemeden sonra
   dashboard ve Hızlı Okuma ekranında sunucudaki değerlerle görünüyor (Schulte ✅ işaretli).
4. **Çıkış:** Çıkış Yap → `localStorage` boş; React state'inde `currentUser` null, listeler boş, `streak`/`program`
   başlangıçta. ✅ (React fiber state'i okunarak doğrulandı)
5. **İkinci hesap (veri sızıntısı kontrolü):** A çıkış yaptıktan sonra aynı sekmede B ile giriş. ✅
   - Geçmiş ve antrenman listeleri boş, A'nın sonuçları yok. ✅
   - Streak sayacı 0, 🔥 rozeti görünmüyor. ✅
   - `program` state'i `{ level: null, day: 1 }`; seviye belirlenmediği için Hızlı Okuma ekranı "Seviyenizi
     Belirleyin" kartını gösteriyor (Gün 1 kartı ancak seviye testinden sonra görünür). ✅
   - Bildirim listesi boş, zil rozeti yok. ✅
   - Sonuç ekranına `result` null iken gidilirse kataloğa yönlendirme kodu var; tarayıcıda ayrıca tetiklenmedi.
6. **Çapraz sekme:** İkinci sekmede aynı adres açıldı, A'nın oturumu geri yüklendi. Birinci sekmede çıkış yapılınca
   ikinci sekme `storage` olayıyla anında landing'e düştü. ✅

## Bölüm 6 — Doğrulama sırasında bulunan API hataları (düzeltildi)

- `auth.guards.ts` — `@CurrentUser('id')` alan adını yok sayıp tüm kullanıcı nesnesini döndürüyordu; `program`,
  `sessions`, `trainings` ve `self-tests` uçları Prisma'ya `userId` olarak nesne verip 500 dönüyordu.
- `billing.service.ts` — iyzico istemcisi sınıf alanında kuruluyordu; `IYZICO_API_KEY` boşken API açılışta
  çöküyordu. İstemci artık tembel kurulur, anahtar yoksa yalnızca ödeme ucu hata verir.
- `prisma/seed-content.ts` — `content.seed.json` yolu yanlıştı (`../content/` → `../src/content/`).

## Bölüm 7 — Yerel API kurulumu (Docker olmadan)

Makinede Docker yok; PostgreSQL 18 ikilileri `C:\Program Files\PostgreSQL\18\bin` altında ama servis kurulu değil.
Sistemi değiştirmeden, kullanıcı alanında bir küme çalıştırılır:

```bash
PG="/c/Program Files/PostgreSQL/18/bin"; D="$LOCALAPPDATA/zihni-pgdata"
printf 'kognita_dev_password' > /tmp/pgpass.txt
"$PG/initdb.exe" -D "$D" -U kognita -A scram-sha-256 --pwfile=/tmp/pgpass.txt -E UTF8 --locale=C
"$PG/pg_ctl.exe" -D "$D" -o "-p 5433 -c listen_addresses=localhost" -l "$D/pg.log" start
PGPASSWORD=kognita_dev_password "$PG/psql.exe" -h localhost -p 5433 -U kognita -d postgres -c "CREATE DATABASE kognita;"
```

`apps/api/.env` (repoya girmez, `.gitignore`'da):
```
DATABASE_URL=postgresql://kognita:kognita_dev_password@localhost:5433/kognita?schema=public
DIRECT_URL=postgresql://kognita:kognita_dev_password@localhost:5433/kognita?schema=public
JWT_SECRET=dev-only-jwt-secret-degistir
JWT_REFRESH_SECRET=dev-only-refresh-secret-degistir
CORS_ORIGINS=http://localhost:3001
PORT=3000
```

```bash
cd apps/api && npm ci && npx prisma generate && npx prisma db push && npm run prisma:seed && npm run start:dev
```
Not: npm 11 kurulum betiklerini engeller; `prisma generate` elle çalıştırılır. Kümeyi durdurmak için
`"$PG/pg_ctl.exe" -D "$D" stop`.

## Bitince

- Değişiklikleri tek commit yap: `web: oturum kalıcılığı + çıkışta tam state temizliği (Görev oturum-kalıcılığı)` ✅
  (`main`'e birleştirildi, repo: https://github.com/sinemel/zihni)
- Bölüm 6 API düzeltmeleri + kayıt formu düzeltmesi: `fix(api): CurrentUser alan seçimi, iyzico tembel kurulum, seed yolu; web: register DTO uyumu`
- `docs/GUVENLIK-GOREVLERI.md`'nin sonuna çapraz referans eklendi. ✅
