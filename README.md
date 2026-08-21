# Kognita (çalışma adı)

Türkçe bilişsel performans + hızlı okuma platformu. **Klinik tanı koymaz; sonuçlar klinik değerlendirmenin yerine geçmez** — bu, ürünün her katmanında değişmez kuraldır.

> Marka adı henüz kesinleşmedi (adaylar: Zihniva / İdraka / Noeva). TÜRKPATENT + domain + store kontrolleri tamamlanana kadar repo **private** kalmalıdır.

## Yapı
```
apps/
  web/   → React prototip (tek dosya, TR/EN, 8 bilişsel test, 12 öz değerlendirme,
           15 egzersiz, kullanıcı/uzman/admin panelleri)
  api/   → NestJS "değer sunucuda" katmanı (skorlama, oturumlar, içerik, program)
docs/    → API mimarisi ve kurulum sırası
```

## Hızlı başlangıç
1. `cp .env.example .env` → Supabase URL'lerini ve anahtarları doldurun (repo'ya girmez)
2. `docker compose up -d` (yerel PostgreSQL) veya Supabase bağlantısı
3. `docs/API.md` içindeki kurulum sırasını izleyin (schema-additions birleştirme → migrate → seed)

## Güvenlik notları
- Skor formülleri, soru/cevap bankaları ve metin kütüphanesi yalnızca API'de yaşar
- Tepki süreleri istemcide `performance.now()` ile ölçülür, sunucuda skorlanır
- `.env` gitignore'dadır; yalnızca `.env.example` şablonu commit'lenir
