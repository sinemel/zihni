# Görev — Oturum Kalıcılığı ve Çıkışta Temizlik (apps/web)

Bu dosya Claude Code ile yürütülür. Sıra önemli; her bölümün doğrulaması yapılmadan sonrakine geçilmez.
İlgili dosya: `apps/web/src/App.jsx` (tek dosyalık uygulama). Backend: `apps/api` (NestJS, JWT).

**Durum (2026-09-08):** Bölüm 1-4 uygulandı, `next build` temiz. Doğrulama 2, 4 ve 6 çevrimdışı ortamda
(API kapalı) tarayıcıda yapıldı. Doğrulama 1, 3 ve 5 çalışan bir API + PostgreSQL gerektirir; henüz yapılmadı.

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

Her madde tarayıcıda yapılır; `npm run dev -- -p 3001` (web) ve `npm run start:dev` (api) açık olmalı.
API olmadan yalnızca 2, 4 ve 6 anlamlıdır.

1. **Yenileme:** Giriş yap, dashboard'da F5'e bas. Kullanıcı girişte kalmalı, geçmiş oturumlar listelenmeli. *(API gerekir — bekliyor)*
2. **Süresi dolmuş token:** `localStorage`'daki `zihni.accessToken` değerini bozuk bir string ile değiştirip yenile.
   API açıkken: token sessizce silinip landing'e düşmeli. API kapalıyken: landing görünmeli, token korunmalı,
   konsolda yalnızca `ERR_CONNECTION_REFUSED` olmalı, yakalanmamış hata olmamalı. ✅ *(API kapalı senaryo yapıldı)*
3. **Veri yükleme:** Bir test tamamla, yenile. Sonuç geçmişte görünmeli (bellekten değil `GET /sessions`'tan). *(API gerekir — bekliyor)*
4. **Çıkış:** Çıkış Yap'a bas. `localStorage`'da `zihni.*` anahtarı kalmamalı; ana bileşenin state'inde
   `currentUser`, `result`, `lastEvents` `null`; `sessions`/`trainings`/`selfResults`/`notifications` boş dizi;
   `streak` ve `program` başlangıç değerinde olmalı. ✅ *(React fiber state'i okunarak doğrulandı)*
5. **İkinci hesap (veri sızıntısı kontrolü):** A hesabıyla giriş yap, bir test ve bir antrenman tamamla, çıkış yap.
   Aynı sekmede yeni bir B hesabıyla giriş yap. B'de: *(API gerekir — bekliyor)*
   - Geçmiş ve antrenman listeleri boş olmalı, A'nın sonuçları görünmemeli.
   - Dashboard'daki streak sayacı **0** olmalı (🔥 rozeti hiç görünmemeli).
   - Günlük antrenman kartı **Gün 1** göstermeli, tamamlanmış egzersiz işareti olmamalı.
   - Bildirim listesi **boş** olmalı; A'ya ait ya da demo bildirim kalmamalı.
   - Sonuç ekranına doğrudan gidilirse (`result` null) uygulama çökmemeli, kataloğa yönlendirmeli.
6. **Çapraz sekme:** İki sekmede aynı hesapla açıkken birinde çıkış yap; diğer sekme anında (storage olayı)
   ya da yenilenince landing'e düşmeli. *(Kod eklendi; iki sekmeli manuel test bekliyor)*

## Bitince

- Değişiklikleri tek commit yap: `web: oturum kalıcılığı + çıkışta tam state temizliği (Görev oturum-kalıcılığı)` ✅
  (dal: `feature/oturum-kaliciligi`, repo: https://github.com/sinemel/zihni)
- `docs/GUVENLIK-GOREVLERI.md`'nin sonuna çapraz referans eklendi: "Çıkışta veri temizliği için bkz. `gorev-oturum-kaliciligi.md` Bölüm 4." ✅
