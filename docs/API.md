# API Katmanı — "Değer sunucuda" mimarisi

## Neden
Tarayıcıya giden JS her zaman kopyalanabilir. Bu modüller, kopyalanabilir OLMAYAN
katmanı kurar: skorlama formülleri, soru/cevap bankaları, metin kütüphanesi ve
program mantığı yalnızca sunucuda yaşar. İstemci ham olay ölçer, sunucu karar verir.
Yan kazanım: skor sahteciliği imkânsızlaşır (uzman/B2B güvenilirliği).

## Yeni modüller
| Modül | Endpoint | Görev |
|---|---|---|
| scoring | — (servis) | computeResult/subscores birebir portu (yaş kayması dahil) |
| sessions | POST/GET /sessions | Ham events → sunucuda skor; FREE=1 test hakkı `assertCanStartTest` ile |
| content | GET /texts, /texts/:id, POST /texts/:id/grade | Metinler DB'den; **cevap indexleri istemciye gitmez**, puanlama sunucuda |
| content | GET/POST /self-tests… | 9 anket DB'den (dil parametresiyle çözülmüş); outcome+summary sunucuda |
| program | GET /program/today, POST /program/level, POST/GET /trainings | Seviye ataması, 21 günlük plan, gün ilerletme |

## Kurulum sırası (Claude Code)
1. `schema-additions.prisma` içeriğini `schema.prisma`'ya ekle (+ User ters ilişkileri)
2. `npx prisma migrate dev -n content_sessions_program` (DIRECT_URL)
3. `npx ts-node prisma/seed-content.ts`
4. AppModule imports: `SessionsModule, ContentModule, ProgramModule`
5. `tsconfig.json`: `"resolveJsonModule": true` (seed.json importları için)

## Güvenlik notları
- Tüm endpointler JwtAuthGuard arkasında
- Event doğrulama: max 500 olay, RT 0–60sn aralığı (kaba sahtecilik filtresi)
- Quiz/anlama sorularının `answer` alanı hiçbir GET yanıtında yer almaz
- Faz 2: events üstünde anomali tespiti (imkânsız RT dağılımları) eklenebilir

## Frontend değişimi (sonraki adım)
Prototipte `computeResult(...)` çağrısı → `POST /sessions`; TextPicker →
`GET /texts`; SelfTestRunner submit → `POST /self-tests/:id/submit`;
egzersiz finish → `POST /trainings` (program yanıtı toast'ları besler).
