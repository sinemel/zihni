# Zihni — Bilişsel Performans Değerlendirme Platformu

Bu dosya Claude Code'un proje bağlamını her oturumda otomatik okuması için hazırlanmıştır.
Kod yazmadan önce bu dosyayı ve varsa `kognita-prototype.jsx` dosyasını incele.

## Ürün Özeti

Kullanıcıların dikkat, tepki hızı, dürtü kontrolü, çalışma belleği ve bilişsel esnekliğini
interaktif görevlerle ölçen, Türkçe arayüzlü, KVKK uyumlu bir web + mobil platform.

**Kritik kural:** Bu platform tıbbi tanı koymaz. Hiçbir ekranda "DEHB tanısı" gibi kesin
klinik ifadeler kullanılmaz. Sonuçlar her zaman "demo/prototip skor modeli" olarak
işaretlenir ve "klinik değerlendirmenin yerine geçmez" uyarısı içerir.

## Üç Panel

1. **Kullanıcı Uygulaması** — kayıt, test çözme, sonuç görme, geçmiş
2. **Uzman Paneli** — danışan yönetimi, test atama, PDF rapor
3. **Admin Panel** — kullanıcı/uzman/test/abonelik yönetimi

## Mevcut Durum

- ✅ Mimari doküman tamamlandı (bu dosyanın kaynağı)
- ✅ Tek dosyalık React prototipi tamamlandı: `kognita-prototype.jsx`
  - Landing → Auth (mock) → Dashboard → Test Kataloğu → Test Motoru → Sonuçlar → Uzman/Admin panel demo modları
  - 7 testin tamamı çalışır durumda: Sürdürülebilir Dikkat, Go/No-Go, Stroop, Çalışma Belleği
    (adaptive digit-span), Görsel Dikkat, İşitsel Dikkat (Web Audio API), Bilişsel Esneklik (rule-switch)
  - Gerçek `performance.now()` tabanlı reaction-time ölçümü, omission/commission sınıflandırması
  - Recharts ile radar/donut/bar/line grafikler
- ❌ Gerçek backend, veritabanı, kimlik doğrulama, mobil uygulama henüz yok — bu oturumun hedefi bu.

## Teknoloji Stack (hedef)

- **Web:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Mobil:** React Native + Expo
- **Backend:** NestJS (veya Next.js API routes)
- **DB:** PostgreSQL + Prisma ORM
- **Auth:** JWT + Refresh Token
- **State:** Zustand veya React Query
- **Charts:** Recharts
- **PDF:** React PDF veya server-side generation
- **Monorepo:** `/apps/web`, `/apps/mobile`, `/packages/ui`, `/packages/types`,
  `/packages/test-engine`, `/packages/analytics`, `/packages/database`, `/server`

## Tasarım Sistemi (birebir uygulanmalı)

```
Primary:    #5B5CE2
Secondary:  #00B8A9
Background: #F7F8FC
Text:       #171923
Success:    #22C55E
Warning:    #F59E0B
Danger:     #EF4444
```
Kart: 16px radius, soft shadow, bol whitespace. Font: Inter veya benzeri modern sans-serif.
Marka adı: **Zihni** — başka bir ürünün adı/logosu/birebir tasarımı kopyalanmaz.

## Veritabanı Tabloları (Prisma şeması olarak kurulacak)

`users, profiles, experts, clients, tests, test_versions, test_sessions, test_events,
test_results, result_metrics, reports, assignments, notifications, subscriptions,
audit_logs, consents`

İlişkiler: `test_sessions 1—n test_events`, `test_sessions 1—1 test_results 1—n result_metrics`,
`experts 1—n clients`, `clients 1—n assignments`.

## Roller

`USER`, `EXPERT`, `ADMIN`, `SUPER_ADMIN` — her rolün route authorization'ı olmalı.

## Test Engine Mimarisi

- Her test JSON config'ten türetilir: `{id, type, trials, duration, difficulty}`
- Event şeması: `{timestamp, event, stimulus, response, reactionTime, correct, errorType, sessionId}`
- Zaman ölçümü **client-side**, `performance.now()` ile; network'e güvenilmez
- Event'ler batch-flush ile sunucuya gönderilir (prototipte bu adım yok, eklenmeli)
- 7 test tipi: `target-detection, go-nogo, stroop, digit-span, visual-search, auditory, cognitive-flexibility`
- Skorlama test tipine göre farklı formüller kullanır (bkz. prototipteki `computeSubscores`),
  her zaman "Demo / Prototip Skor Modeli" olarak etiketlenir, gerçek klinik norm kullanılmaz

## API Uç Noktaları (mock'tan gerçeğe geçirilecek)

```
POST /auth/register, /auth/login
GET  /users/me
GET  /tests, /tests/:id
POST /tests/:id/start
POST /sessions/:id/events
POST /sessions/:id/complete
GET  /sessions/:id/result
GET  /results, /reports/:id
POST /experts/clients, /experts/assignments
GET  /experts/clients
```
Standart hata formatı: `{ success: false, error: { code, message } }`

## KVKK / Güvenlik

- Rıza yönetimi, veri silme, veri dışa aktarma
- Audit log, rol bazlı erişim kontrolü
- Rate limiting, server-side validation
- Hassas alanlarda şifreleme

## Öncelik Sırası (bu oturumdan itibaren)

1. Next.js + NestJS + Prisma monorepo iskeleti kur
2. PostgreSQL şemasını migration olarak yaz, seed data ekle
3. Gerçek authentication (JWT + refresh token)
4. Test engine'i backend'e bağla (event ingest + skorlama servisi)
5. Dashboard'u gerçek API'ye bağla
6. Uzman paneli: danışan/atama CRUD
7. PDF rapor servisi
8. Admin panel
9. React Native/Expo mobil uygulama

Her aşamadan sonra: `npm install`, type check, lint, build, test çalıştır; hataları düzelt.
Belirsiz noktalarda makul mühendislik kararı al ve ilerle, gereksiz soru sorma.
