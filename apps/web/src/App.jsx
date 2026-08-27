import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import {
  Home, ClipboardList, BarChart3, User, ChevronRight, Check, X, Clock,
  Shield, Sparkles, Users, FileText, Settings, TrendingUp, AlertCircle,
  Lock, Play, ArrowLeft, Menu, Bell, Download, LogOut, Trash2, BookOpen,
} from "lucide-react";

/* ============================================================
   DESIGN TOKENS
   ============================================================ */
const C = {
  primary: "#5B5CE2",
  primaryDark: "#4749C4",
  secondary: "#00B8A9",
  accent1: "#8B5CF6",
  accent2: "#EC4899",
  accent3: "#06B6D4",
  bg: "#F7F8FC",
  surface: "#FFFFFF",
  text: "#171923",
  textMuted: "#6B7280",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  border: "#E5E7EB",
};

const BRAND = "Zihni";

/* Marka amblemi — tek yerden yönetilir; harf BRAND'in ilk karakteridir */
const LogoMark = ({ size = 32, radius = 10, fontSize = 16 }) => (
  <div style={{ width: size, height: size, borderRadius: radius, background: `linear-gradient(135deg, ${C.primary}, ${C.accent1})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <span style={{ color: "#fff", fontSize, fontWeight: 700 }}>{BRAND.charAt(0)}</span>
  </div>
);

/* Lansman kararı: planlar/abonelik kapalı — açmak için true yapın */
const BILLING_ENABLED = false;

/* ============================================================
   API İSTEMCİSİ — "değer sunucuda" bağlantı katmanı
   API erişilebilirse sunucu sonuçları kullanılır; erişilemezse
   prototip yerel hesaplamayla kesintisiz çalışmaya devam eder.
   ============================================================ */
const API_BASE = (typeof window !== "undefined" && window.KOGNITA_API_URL) || "http://localhost:3000";
let API_TOKEN = null; // Üretimde: Supabase Auth oturumundan JWT

async function apiFetch(path, options = {}) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        ...(options.headers || {}),
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null; // Ağ yok / API kapalı → yerel akış devam eder
  }
}

const api = {
  // Bilişsel test: ham event'leri gönder, sunucu skorunu al
  submitSession: (testId, testType, age, events) =>
    apiFetch("/sessions", { method: "POST", body: JSON.stringify({ testId, testType, age, events }) }),
  // Egzersiz sonucu kaydet (fire-and-forget)
  submitTraining: (exerciseId, score, detail, wpm) =>
    apiFetch("/trainings", { method: "POST", body: JSON.stringify({ exerciseId, score, detail, wpm }) }),
  // Öz değerlendirme yanıtlarını gönder
  submitSelfTest: (id, answers) =>
    apiFetch(`/self-tests/${id}/submit`, { method: "POST", body: JSON.stringify({ answers }) }),
  // Metin kütüphanesi (varsa sunucudan)
  getTexts: (lang) => apiFetch(`/texts?lang=${lang}`),
  // Kimlik doğrulama (NestJS auth modülü)
  login: (email, password) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email, password, name) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),
};

function setApiToken(token) { API_TOKEN = token || null; }

/* ============================================================
   KVKK METİNLERİ — TASLAK
   ⚠️ Bu metinler hukuki bilgi amaçlı hazırlanmış TASLAKTIR;
   yayına alınmadan önce KVKK alanında uzman bir avukat tarafından
   incelenmeli ve [KÖŞELİ PARANTEZLİ] alanlar doldurulmalıdır.
   ============================================================ */
const LEGAL_TEXTS = {
  disclosure: {
    title: { tr: "Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni", en: "Privacy Notice on the Processing of Personal Data" },
    sections: [
      { h: { tr: "1. Veri Sorumlusu", en: "1. Data Controller" },
        p: { tr: "İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (\"KVKK\") uyarınca, veri sorumlusu sıfatıyla [ŞİRKET UNVANI] (\"Platform\") tarafından hazırlanmıştır. Adres: [ADRES] · E-posta: [KVKK E-POSTA ADRESİ]",
           en: "This notice is issued under Turkish Data Protection Law No. 6698 (\"KVKK\") by [COMPANY NAME] (\"Platform\") acting as data controller. Address: [ADDRESS] · E-mail: [DPO E-MAIL]" } },
      { h: { tr: "2. İşlenen Kişisel Veriler", en: "2. Personal Data Processed" },
        p: { tr: "Kimlik ve iletişim bilgileri (ad, soyad, e-posta); hesap bilgileri; yaş grubu; uygulama kullanım verileri; bilişsel değerlendirme ve egzersiz oturumlarına ait performans verileri (tepki süreleri, doğruluk oranları, skorlar) ve öz değerlendirme yanıtları. Bu veriler tıbbi tanı amacı taşımaz; ancak niteliği gereği sağlıkla ilişkilendirilebilecek özel nitelikli kişisel veri kapsamında değerlendirilebilir ve yalnızca açık rızanızla işlenir.",
           en: "Identity and contact details (name, e-mail); account details; age group; app usage data; performance data from cognitive assessment and exercise sessions (reaction times, accuracy, scores) and self-assessment answers. These are not used for medical diagnosis; however, given their nature they may qualify as special-category data related to health and are processed only with your explicit consent." } },
      { h: { tr: "3. İşleme Amaçları", en: "3. Purposes of Processing" },
        p: { tr: "Hesabınızın oluşturulması ve yönetilmesi; değerlendirme ve egzersiz sonuçlarınızın hesaplanması, saklanması ve size raporlanması; gelişim takibinizin sunulması; talebiniz hâlinde sonuçlarınızın yetkilendirdiğiniz uzmanla paylaşılması; hizmet güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi.",
           en: "Creating and managing your account; computing, storing and reporting your assessment and exercise results; providing progress tracking; sharing results with an expert you authorise upon your request; ensuring service security and meeting legal obligations." } },
      { h: { tr: "4. Hukuki Sebepler", en: "4. Legal Bases" },
        p: { tr: "KVKK m.5/2 uyarınca sözleşmenin kurulması ve ifası, hukuki yükümlülük ve meşru menfaat; performans ve öz değerlendirme verileri bakımından KVKK m.6 uyarınca açık rızanız.",
           en: "Under KVKK Art. 5/2: performance of a contract, legal obligation and legitimate interest; for performance and self-assessment data, your explicit consent under KVKK Art. 6." } },
      { h: { tr: "5. Aktarım", en: "5. Transfers" },
        p: { tr: "Verileriniz, barındırma ve altyapı hizmeti alınan iş ortaklarına (ör. bulut veri tabanı sağlayıcısı) yalnızca hizmetin sunulması amacıyla ve gerekli güvenlik tedbirleriyle aktarılabilir. Sunucuların yurt dışında bulunması hâlinde aktarım, KVKK m.9'daki şartlara uygun olarak yapılır. Verileriniz üçüncü kişilere pazarlama amacıyla satılmaz.",
           en: "Data may be transferred to infrastructure partners (e.g. cloud database provider) solely to deliver the service, with appropriate safeguards. Where servers are located abroad, transfers comply with KVKK Art. 9. Your data is never sold for marketing purposes." } },
      { h: { tr: "6. Saklama Süresi", en: "6. Retention" },
        p: { tr: "Verileriniz üyeliğiniz süresince ve ilgili mevzuattaki zamanaşımı süreleri boyunca saklanır. Hesabınızı sildiğinizde kişisel verileriniz, yasal saklama yükümlülükleri saklı kalmak üzere silinir veya anonim hâle getirilir.",
           en: "Data is retained for the duration of your membership and statutory limitation periods. Upon account deletion, personal data is erased or anonymised, subject to legal retention duties." } },
      { h: { tr: "7. KVKK m.11 Kapsamındaki Haklarınız", en: "7. Your Rights under KVKK Art. 11" },
        p: { tr: "Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, işlenme amacını öğrenme, aktarıldığı üçüncü kişileri bilme, düzeltilmesini veya silinmesini isteme, otomatik sistemlerle analiz sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz. Uygulama içindeki \"Verilerimi İndir\" ve \"Hesabımı Sil\" araçlarını da her zaman kullanabilirsiniz.",
           en: "You may learn whether your data is processed, request information, learn the purpose, know third-party recipients, request rectification or erasure, object to outcomes produced solely by automated analysis, and claim damages. In-app \"Download My Data\" and \"Delete My Account\" tools are always available." } },
      { h: { tr: "8. Başvuru", en: "8. Applications" },
        p: { tr: "Taleplerinizi [KVKK E-POSTA ADRESİ] adresine veya [ADRES] adresine yazılı olarak iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz sonuçlandırılır.",
           en: "Requests may be sent to [DPO E-MAIL] or in writing to [ADDRESS]. Applications are resolved free of charge within 30 days at the latest." } },
    ],
  },
  consent: {
    title: { tr: "Açık Rıza Metni", en: "Explicit Consent Statement" },
    sections: [
      { h: { tr: "Performans ve Öz Değerlendirme Verileri", en: "Performance & Self-Assessment Data" },
        p: { tr: "Bilişsel değerlendirme, egzersiz ve öz değerlendirme oturumlarımda üretilen performans verilerimin (tepki süreleri, doğruluk, skorlar, yanıtlar) Aydınlatma Metni'nde açıklanan amaçlarla işlenmesine; bu verilerin sağlıkla ilişkilendirilebilecek özel nitelikli veri sayılabileceği bilgisiyle, KVKK m.6 uyarınca AÇIK RIZA veriyorum. Bu rızayı dilediğim zaman, hiçbir gerekçe göstermeksizin geri alabileceğimi biliyorum.",
           en: "I give my EXPLICIT CONSENT under KVKK Art. 6 to the processing of performance data generated in my cognitive assessment, exercise and self-assessment sessions (reaction times, accuracy, scores, answers) for the purposes described in the Privacy Notice, acknowledging such data may qualify as special-category data related to health. I know I may withdraw this consent at any time without giving any reason." } },
      { h: { tr: "Önemli Not", en: "Important Note" },
        p: { tr: "Platform tıbbi tanı koymaz; sonuçlar klinik değerlendirmenin yerine geçmez ve yalnızca öz-farkındalık amaçlıdır.",
           en: "The Platform does not provide medical diagnosis; results do not replace clinical evaluation and are for self-awareness only." } },
    ],
  },
};

const LegalModal = ({ doc = "disclosure", onClose }) => {
  const { lang } = useT();
  const [active, setActive] = useState(doc);
  const data = LEGAL_TEXTS[active];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(23,25,35,0.55)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl flex flex-col" style={{ background: C.surface, maxHeight: "84vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex gap-2">
            {[["disclosure", { tr: "Aydınlatma", en: "Notice" }], ["consent", { tr: "Açık Rıza", en: "Consent" }]].map(([k, lbl]) => (
              <button key={k} onClick={() => setActive(k)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={active === k ? { background: C.primary, color: "#fff" } : { background: "#F3F4F6", color: C.textMuted }}>
                {L(lbl, lang)}
              </button>
            ))}
          </div>
          <button onClick={onClose} aria-label="Kapat"><X size={18} style={{ color: C.textMuted }} /></button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">
          <h2 className="text-sm font-semibold mb-3" style={{ color: C.text }}>{L(data.title, lang)}</h2>
          {data.sections.map((sec, i) => (
            <div key={i} className="mb-3">
              <p className="text-xs font-semibold mb-1" style={{ color: C.primary }}>{L(sec.h, lang)}</p>
              <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{L(sec.p, lang)}</p>
            </div>
          ))}
          <p className="text-[10px] mt-2 italic" style={{ color: C.textMuted }}>
            {lang === "en" ? "Draft — subject to legal review. Last updated: 2026." : "Taslak — hukuki incelemeye tabidir. Son güncelleme: 2026."}
          </p>
        </div>
      </div>
    </div>
  );
};

/* Üretim tespiti: Next.js/webpack build sırasında process.env.NODE_ENV'i metin
   olarak değiştirip ölü kod elemesi yapar — üretim paketinde bu blok tamamen silinir.
   typeof koruması, build'siz tarayıcı önizlemesinde ("process tanımsız") hata vermeden
   IS_PROD=false sonucu üretir, geliştirme/demo deneyimi bozulmaz. */
const IS_PROD = (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production");

/* Demo kullanıcılar — yalnızca geliştirme/demo ortamında var olur.
   Üretimde: gerçek kimlik doğrulama zorunludur, sahte hesap girişi mümkün değildir. */
let MOCK_USERS = IS_PROD ? [] : [
  { email: "user@demo.com",   password: "Demo123!", role: "user",   name: "Sinem Kullanıcı" },
  { email: "expert@demo.com", password: "Demo123!", role: "expert", name: "Dr. Ayşe Uzman" },
  { email: "admin@demo.com",  password: "Demo123!", role: "admin",  name: "Admin" },
];

/* ============================================================
   i18n — dil altyapısı (TR/EN)
   ============================================================ */
const LangContext = React.createContext("tr");
const useLang = () => React.useContext(LangContext);
// Veri alanları için: L({tr:"...", en:"..."}, lang) — düz string ise aynen döner
const L = (v, lang) => (v && typeof v === "object" && !Array.isArray(v) ? (v[lang] ?? v.tr) : v);

const UI = {
  tr: {
    home: "Ana Sayfa", tests: "Testler", reading: "Hızlı Okuma", trainingTab: "Eğitim", results: "Sonuçlar", profile: "Profil",
    start: "Başlat", startTest: "Teste Başla", back: "Geri", cancel: "Vazgeç", cont: "Devam", next: "İleri", letsgo: "Başlayalım", begin: "Başla",
    hello: "Merhaba", dailyPlan: "Günlük Plan",
    g1t: "3 egzersiz tamamla", g1d: "Günlük antrenman programındaki egzersizleri bitirin.",
    g2t: "1 bilişsel test çöz", g2d: "Dikkat ve tepki testlerinden birini tamamlayın.",
    g3t: "1 okuma çalışması yap", g3d: "Kütüphaneden bir metinle okuma çalışması yapın.",
    lastTest: "Son Test", progressChart: "Gelişim Grafiği", testHistory: "Test Geçmişi", completedBadge: "Tamamlandı", noRecords: "Henüz kayıt yok.",
    noTestsYet: "Henüz tamamlanmış testiniz bulunmuyor.", startFirst: "İlk Testinizi Başlatın",
    catalogTitle: "Test Kataloğu", change: "Değiştir", soon: "Yakında",
    selfTitle: "Öz Değerlendirme Testleri", selfNote: "Anket tipi öz-farkındalık araçları — tanı veya klinik değerlendirme amaçlı değildir.",
    q: "soru", discover: "Keşfedecekleriniz", prevQ: "Önceki soru", backToCatalog: "Kataloğa Dön",
    trainingTitle: "Hızlı Okuma Eğitimi", trainingDesc: "Okuma hızınızı ve algı sürenizi geliştiren interaktif egzersizler. Düzenli pratik önerilir.",
    techniques: "Teknikler", libraryTitle: "Metin Kütüphanesi", browse: "Göz At",
    libraryBanner: "özgün metin · Genel ve Çocuk kütüphaneleri · Oku, sonra dilediğin egzersizle çalış",
    pickText: "Okumak istediğiniz metni seçin", totalTexts: "toplam", words: "kelime", compQ: "anlama sorusu",
    levelCardTitle: "Seviyenizi Belirleyin", levelCardDesc: "Kısa bir okuma testiyle seviyeniz ölçülsün; size özel 21 günlük antrenman programınız oluşturulsun.",
    dailyTraining: "Günlük Antrenman", dayWord: "Gün", programHint: "Günün 3 egzersizini tamamlayın (~15 dk) — program her gün yenilenir, seviyenize göre çeşitlenir.",
    wpmChart: "Okuma Hızı Gelişimi (k/dk)", trainingHistory: "Eğitim Geçmişi", noExercises: "Henüz egzersiz tamamlamadınız.",
    exDone: "tamamlandı", backToTraining: "Eğitime Dön",
    overallScore: "Genel Skor", backToPanel: "Panele Dön", perfProfile: "Performans Profili", respDist: "Tepki Dağılımı", errAnalysis: "Hata Analizi",
    resultDisclaimer: "Bu değerlendirme bir klinik tanı veya tıbbi değerlendirme değildir; sonuçlar klinik norm içermeyen bir skor modeliyle hesaplanmıştır ve klinik değerlendirmenin yerine geçmez.",
    selfDisclaimer: "Bu değerlendirme bir öz-farkındalık aracıdır; klinik tanı, tarama veya tıbbi değerlendirme değildir ve bunların yerine geçmez.",
    heroA: "Bilişsel Performansınızı Ölçün,", heroB: "Gelişiminizi Takip Edin.",
    heroDesc: "Dikkat, tepki hızı, dürtü kontrolü ve çalışma belleğinizi interaktif görevlerle değerlendirin; anlaşılır ve görsel bir performans raporu alın.",
    expertBtn: "Uzman Paneline Gir", faqTitle: "Sık Sorulan Sorular", footer: "Bu sonuçlar klinik değerlendirme yerine geçmez.",
    subTitle: "Abonelik Planları", subDesc: "İhtiyacınıza uygun planı seçin; dilediğiniz zaman değiştirebilirsiniz.",
    currentPlan: "Mevcut Plan", choosePlan: "Planı Seç", contactUs: "Bize Ulaşın", seePlans: "Planları Gör", yourSub: "Aboneliğiniz", backToProfile: "Profile Dön",
    dataPrivacy: "Veri ve Gizlilik (KVKK)", downloadData: "Verilerimi İndir (JSON)", privacyText: "KVKK Aydınlatma Metni", deleteAcc: "Hesabımı ve Verilerimi Sil", logout: "Çıkış Yap",
    totalTests: "Toplam Test", avg: "Ortalama", best: "En İyi", avgScore: "Ortalama Skor", bestScore: "En Yüksek Skor", allTests: "Tüm Testler", myResults: "Sonuçlarım",
    selfHistory: "Öz Değerlendirme Geçmişi", ageSelectTitle: "Yaş grubunu seçin",
    ageSelectDesc: "Testler; görev sayısı, hız ve zorluk açısından seçilen yaş grubuna göre uyarlanır.",
    ageNote: "Yaş grubunu dilediğiniz zaman Test Kataloğu'ndan değiştirebilirsiniz. Sonuçlar hiçbir yaş grubunda klinik değerlendirme yerine geçmez.",
    selected: "Seçili", version: "sürümü", duration: "Test yaklaşık", willTake: "sürecektir.",
    inst1: "Rahatsız edilmeyeceğiniz sessiz bir ortamda olun.", inst2: "Bildirimlerinizi kapatmanız önerilir.", inst3: "Test başladıktan sonra ekrandan ayrılmayın.",
    testCompleted: "Test tamamlandı", strengths: "Güçlü Alanlar", growth: "Geliştirilebilecek Alanlar", compareOthers: "Diğerleriyle Karşılaştırma",
    meanRT: "Ort. Tepki Süresi", rtVar: "Tepki Değişkenliği", correctResp: "Doğru Yanıt", genPerf: "Genel Performans",
  },
  en: {
    home: "Home", tests: "Tests", reading: "Speed Reading", trainingTab: "Training", results: "Results", profile: "Profile",
    start: "Start", startTest: "Start Test", back: "Back", cancel: "Cancel", cont: "Continue", next: "Next", letsgo: "Let's go", begin: "Begin",
    hello: "Hello", dailyPlan: "Daily Plan",
    g1t: "Complete 3 exercises", g1d: "Finish today's exercises from your training program.",
    g2t: "Solve 1 cognitive test", g2d: "Complete one of the attention and reaction tests.",
    g3t: "Do 1 reading practice", g3d: "Practice with a text from the library.",
    lastTest: "Last Test", progressChart: "Progress Chart", testHistory: "Test History", completedBadge: "Completed", noRecords: "No records yet.",
    noTestsYet: "You haven't completed any tests yet.", startFirst: "Start Your First Test",
    catalogTitle: "Test Catalog", change: "Change", soon: "Soon",
    selfTitle: "Self-Assessment Tests", selfNote: "Questionnaire-style self-awareness tools — not intended for diagnosis or clinical evaluation.",
    q: "questions", discover: "What you'll discover", prevQ: "Previous question", backToCatalog: "Back to Catalog",
    trainingTitle: "Speed Reading Training", trainingDesc: "Interactive exercises that improve your reading speed and perception. Regular practice is recommended.",
    techniques: "Techniques", libraryTitle: "Text Library", browse: "Browse",
    libraryBanner: "original texts · General and Kids libraries · Read, then practice with any exercise",
    pickText: "Choose a text to read", totalTexts: "total", words: "words", compQ: "comprehension questions",
    levelCardTitle: "Determine Your Level", levelCardDesc: "Take a short reading test to measure your level and generate your personal 21-day training program.",
    dailyTraining: "Daily Training", dayWord: "Day", programHint: "Complete today's 3 exercises (~15 min) — the plan refreshes daily and adapts to your level.",
    wpmChart: "Reading Speed Progress (wpm)", trainingHistory: "Training History", noExercises: "You haven't completed any exercises yet.",
    exDone: "completed", backToTraining: "Back to Training",
    overallScore: "Overall Score", backToPanel: "Back to Dashboard", perfProfile: "Performance Profile", respDist: "Response Distribution", errAnalysis: "Error Analysis",
    resultDisclaimer: "This assessment is not a clinical diagnosis or medical evaluation; results are calculated with a scoring model that contains no clinical norms and do not replace clinical evaluation.",
    selfDisclaimer: "This assessment is a self-awareness tool; it is not a clinical diagnosis, screening or medical evaluation and does not replace them.",
    heroA: "Measure Your Cognitive Performance,", heroB: "Track Your Progress.",
    heroDesc: "Evaluate your attention, reaction speed, impulse control and working memory with interactive tasks; get a clear, visual performance report.",
    expertBtn: "Expert Panel", faqTitle: "Frequently Asked Questions", footer: "These results do not replace clinical evaluation.",
    subTitle: "Subscription Plans", subDesc: "Choose the plan that fits your needs; you can change it anytime.",
    currentPlan: "Current Plan", choosePlan: "Choose Plan", contactUs: "Contact Us", seePlans: "See Plans", yourSub: "Your Subscription", backToProfile: "Back to Profile",
    dataPrivacy: "Data & Privacy", downloadData: "Download My Data (JSON)", privacyText: "Privacy Notice", deleteAcc: "Delete My Account & Data", logout: "Log Out",
    totalTests: "Total Tests", avg: "Average", best: "Best", avgScore: "Average Score", bestScore: "Best Score", allTests: "All Tests", myResults: "My Results",
    selfHistory: "Self-Assessment History", ageSelectTitle: "Select age group",
    ageSelectDesc: "Tests adapt in task count, speed and difficulty to the selected age group.",
    ageNote: "You can change the age group anytime from the Test Catalog. Results do not replace clinical evaluation for any age group.",
    selected: "Selected", version: "version", duration: "The test takes about", willTake: ".",
    inst1: "Find a quiet place where you won't be disturbed.", inst2: "Turning off notifications is recommended.", inst3: "Don't leave the screen once the test starts.",
    testCompleted: "Test completed", strengths: "Strengths", growth: "Areas to Improve", compareOthers: "Compare with Others",
    meanRT: "Mean Reaction Time", rtVar: "Reaction Variability", correctResp: "Correct Responses", genPerf: "Overall Performance",
  },
};
const useT = () => {
  const lang = useLang();
  return { lang, t: (k) => (UI[lang] && UI[lang][k]) || UI.tr[k] || k };
};

/* ============================================================
   HELPERS
   ============================================================ */
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const stddev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)));
};
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const uid = () => Math.random().toString(36).slice(2, 10);

/* ============================================================
   MOTION / GLOBAL STYLE (deliberate, not scattered — used at:
   hero blobs, countdown pop, card hover-lift, result confetti)
   ============================================================ */
const GlobalMotionStyles = () => (
  <style>{`
    @keyframes kg-float { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(18px,-26px) scale(1.08); } 66% { transform: translate(-14px,14px) scale(0.94); } }
    @keyframes kg-float-slow { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-22px,-18px) scale(1.06); } }
    @keyframes kg-pop { 0% { transform: scale(0.55); opacity: 0; } 65% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
    @keyframes kg-countup { from { opacity: 0; transform: translateY(10px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes kg-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(91,92,226,0.38); } 50% { box-shadow: 0 0 0 16px rgba(91,92,226,0); } }
    @keyframes kg-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes kg-confetti { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(280px) rotate(360deg); opacity: 0; } }
    @keyframes kg-shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
    @keyframes core-pulse { 0%,100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 4px rgba(124,111,240,0.55)); } 50% { transform: scale(1.12) rotate(45deg); filter: drop-shadow(0 0 14px rgba(124,111,240,0.95)); } }
    @keyframes core-orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes pengu-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
    @keyframes pengu-waddle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }
    @keyframes pengu-bounce { 0%,100% { transform: translateY(0) scale(1); } 30% { transform: translateY(-15px) scale(1.05); } 55% { transform: translateY(0) scale(0.96); } 72% { transform: translateY(-6px) scale(1.02); } }
    @keyframes pengu-tilt { 0%,100% { transform: rotate(0deg); } 45% { transform: rotate(-7deg); } }
    @keyframes pengu-wave { 0%,100% { transform: rotate(0deg); } 30% { transform: rotate(-32deg); } 60% { transform: rotate(-8deg); } 80% { transform: rotate(-26deg); } }
    @keyframes pengu-blink { 0%, 91%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
    @keyframes pengu-spark { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-20px) scale(0.4); opacity: 0; } }
    @keyframes pengu-scarf { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(5deg); } }
    @keyframes kg-grow { 0% { transform: scale(0.12); opacity: 1; } 100% { transform: scale(1); opacity: 0.12; } }
    .kg-card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease; }
    .kg-card-hover:hover { transform: translateY(-4px); box-shadow: 0 14px 28px rgba(91,92,226,0.16), 0 4px 10px rgba(23,25,35,0.06); }
    .kg-btn-pop { transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .kg-btn-pop:hover { transform: scale(1.045); }
    .kg-btn-pop:active { transform: scale(0.96); }
    .kg-blob { position: absolute; border-radius: 9999px; filter: blur(40px); opacity: 0.55; pointer-events: none; }
    .kg-gradient-anim { background-size: 200% 200%; animation: kg-gradient 8s ease infinite; }
    .kg-print-only { display: none; }
    @media print {
      body * { visibility: hidden; }
      .kg-print-area, .kg-print-area * { visibility: visible; }
      .kg-print-area { position: absolute; left: 0; top: 0; width: 100%; }
      .kg-print-area .kg-no-print { display: none !important; }
      .kg-print-area .kg-print-only { display: block !important; }
    }
  `}</style>
);

/* ============================================================
   TEST CATALOG (config-driven — section 43 of spec)
   ============================================================ */
const TEST_CATALOG = [
  {
    id: "sustained-attention",
    name: { tr: "Sürdürülebilir Dikkat", en: "Sustained Attention" },
    desc: { tr: "Yalnızca mavi daire hedefine dokunun.", en: "Tap only the blue circle target." },
    duration: "~1 dk",
    measures: ["Dikkat", "Tutarlılık"],
    difficulty: "Kolay",
    type: "target-detection",
    trials: 16,
    implemented: true,
  },
  {
    id: "go-nogo",
    name: { tr: "Tepki Hızı (Go / No-Go)", en: "Reaction Speed (Go / No-Go)" },
    desc: { tr: "Yeşilde dokunun, kırmızıda dokunmayın.", en: "Tap on green, don't tap on red." },
    duration: "~1 dk",
    measures: ["Dürtü Kontrolü", "Hız"],
    difficulty: "Orta",
    type: "go-nogo",
    trials: 16,
    implemented: true,
  },
  {
    id: "stroop",
    name: { tr: "Stroop Benzeri Görev", en: "Stroop-like Task" },
    desc: { tr: "Kelimeyi değil, yazının rengini seçin.", en: "Choose the ink color, not the word." },
    duration: "~1 dk",
    measures: ["Bilişsel Esneklik", "Dikkat"],
    difficulty: "Orta",
    type: "stroop",
    trials: 12,
    implemented: true,
  },
  {
    id: "working-memory",
    name: { tr: "Çalışma Belleği", en: "Working Memory" },
    desc: { tr: "Sayı dizisini hatırlayın ve sırasıyla girin.", en: "Remember the growing digit sequence." },
    duration: "~2 dk",
    measures: ["Bellek"],
    difficulty: "Orta",
    type: "digit-span",
    trials: 8,
    implemented: true,
  },
  {
    id: "visual-search",
    name: { tr: "Görsel Dikkat", en: "Visual Attention" },
    desc: { tr: "Işaretlenen hedef sembolü ızgara içinde bulun.", en: "Find the target symbol in the grid." },
    duration: "~2 dk",
    measures: ["Görsel Dikkat", "Hız"],
    difficulty: "Orta",
    type: "visual-search",
    trials: 10,
    implemented: true,
  },
  {
    id: "auditory",
    name: { tr: "İşitsel Dikkat", en: "Auditory Attention" },
    desc: { tr: "Yüksek tonda dokunun, kalın tonda dokunmayın.", en: "React to the target sound." },
    duration: "~2 dk",
    measures: ["İşitsel Dikkat", "Dürtü Kontrolü"],
    difficulty: "Zor",
    type: "auditory",
    trials: 14,
    implemented: true,
  },
  {
    id: "distractor-cpt",
    name: { tr: "Çeldiricili Dikkat Testi", en: "Distractor Attention Test" },
    desc: { tr: "Görsel ve işitsel çeldiriciler altında hedefe odaklanın; 4 bloklu akış.", en: "Stay on target under visual and auditory distractors; a 4-block flow." },
    duration: "~3 dk",
    measures: ["Dikkat", "Çeldirici Direnci"],
    difficulty: "Zor",
    type: "distractor-cpt",
    trials: 32,
    implemented: true,
  },
  {
    id: "cognitive-flexibility",
    name: { tr: "Bilişsel Esneklik", en: "Cognitive Flexibility" },
    desc: { tr: "Değişen kurala (renk / şekil) uyum sağlayın.", en: "Adapt to the changing rule." },
    duration: "~3 dk",
    measures: ["Esneklik", "Hız"],
    difficulty: "Zor",
    type: "cognitive-flexibility",
    trials: 16,
    implemented: true,
  },
];

/* Kapsamlı rapor düzey bantları — klinik dil bilinçli olarak kullanılmaz:
   "RİSKLİ" yerine "Öncelikli Gelişim Alanı" (aynı bilgi, damgasız) */
const LEVEL_BANDS = [
  { min: 85, label: { tr: "Çok İyi", en: "Very Good" }, color: "#22C55E", bg: "#22C55E22" },
  { min: 70, label: { tr: "Ortalama Üstü", en: "Above Average" }, color: "#0EA5E9", bg: "#0EA5E922" },
  { min: 55, label: { tr: "Ortalama", en: "Average" }, color: "#6B7280", bg: "#6B728022" },
  { min: 40, label: { tr: "Gelişime Açık", en: "Developing" }, color: "#F59E0B", bg: "#F59E0B22" },
  { min: 0,  label: { tr: "Öncelikli Gelişim Alanı", en: "Priority Development Area" }, color: "#F97316", bg: "#F9731622" },
];
const bandFor = (score) => LEVEL_BANDS.find((b) => score >= b.min) || LEVEL_BANDS[LEVEL_BANDS.length - 1];

const SUBSCORE_LABELS = {
  attention: { tr: "Dikkat", en: "Attention" },
  speed: { tr: "Hız", en: "Speed" },
  accuracy: { tr: "Doğruluk", en: "Accuracy" },
  impulseControl: { tr: "Dürtü Kontrolü", en: "Impulse Control" },
  consistency: { tr: "Tutarlılık", en: "Consistency" },
  memory: { tr: "Bellek", en: "Memory" },
  flexibility: { tr: "Bilişsel Esneklik", en: "Cognitive Flexibility" },
  distractorResistance: { tr: "Çeldirici Direnci", en: "Distractor Resistance" },
};

const DISTRACTOR_BLOCKS = [
  { key: "base", icon: "🎯", label: { tr: "Temel", en: "Baseline" }, hint: { tr: "Çeldirici yok — kendi taban çizgeniz ölçülür.", en: "No distractors — your personal baseline is measured." } },
  { key: "visual", icon: "👁️", label: { tr: "Görsel", en: "Visual" }, hint: { tr: "Kenarlarda hareketli ögeler belirecek. Onlara değil, hedefe odaklanın.", en: "Moving items will appear at the edges. Focus on the target, not them." } },
  { key: "auditory", icon: "🔊", label: { tr: "İşitsel", en: "Auditory" }, hint: { tr: "Ara ara sesler duyacaksınız. Görevi aynı hızda sürdürün.", en: "You will hear occasional sounds. Keep the same pace." } },
  { key: "combined", icon: "🌀", label: { tr: "Kombine", en: "Combined" }, hint: { tr: "Görsel + işitsel çeldiriciler birlikte. Son blok!", en: "Visual + auditory distractors together. Final block!" } },
];
const DISTRACTOR_GLYPHS = ["✦", "◆", "●", "▲", "✿", "★"];
const DISTRACTOR_COLORS = ["#F59E0B", "#EC4899", "#22C55E", "#06B6D4", "#8B5CF6", "#EF4444"];

const SUSTAINED_STIMULI = [
  { shape: "circle", color: "blue", target: true },
  { shape: "circle", color: "red", target: false },
  { shape: "triangle", color: "blue", target: false },
  { shape: "square", color: "green", target: false },
  { shape: "star", color: "yellow", target: false },
  { shape: "circle", color: "green", target: false },
];
const SHAPE_GLYPH = { circle: "●", triangle: "▲", square: "■", star: "★" };
const COLOR_HEX = { blue: "#3B82F6", red: "#EF4444", green: "#22C55E", yellow: "#F59E0B" };
const STROOP_WORDS = [
  { label: "KIRMIZI", color: "red" },
  { label: "MAVİ", color: "blue" },
  { label: "YEŞİL", color: "green" },
  { label: "SARI", color: "yellow" },
];

function buildTrials(test) {
  if (test.type === "target-detection") {
    const arr = [];
    for (let i = 0; i < test.trials; i++) {
      const forceTarget = i % 3 === 0;
      const pool = forceTarget ? [SUSTAINED_STIMULI[0]] : SUSTAINED_STIMULI.slice(1);
      const s = pool[Math.floor(Math.random() * pool.length)];
      arr.push({ id: uid(), stimulusId: `${s.shape}_${s.color}`, ...s });
    }
    return arr;
  }
  if (test.type === "distractor-cpt") {
    const perBlock = Math.max(6, Math.round(test.trials / 4));
    const arr = [];
    for (let b = 0; b < 4; b++) {
      for (let i = 0; i < perBlock; i++) {
        const forceTarget = i % 3 === 0;
        const pool = forceTarget ? [SUSTAINED_STIMULI[0]] : SUSTAINED_STIMULI.slice(1);
        const st = pool[Math.floor(Math.random() * pool.length)];
        const visualDistract = b === 1 || b === 3;
        const audioDistract = b === 2 || b === 3;
        arr.push({
          id: uid(),
          stimulusId: `${st.shape}_${st.color}_b${b}`,
          ...st,
          block: b,
          blockStart: i === 0,
          visualDistract,
          audioDistract,
          distractors: visualDistract
            ? Array.from({ length: 2 }, () => ({
                glyph: DISTRACTOR_GLYPHS[Math.floor(Math.random() * DISTRACTOR_GLYPHS.length)],
                color: DISTRACTOR_COLORS[Math.floor(Math.random() * DISTRACTOR_COLORS.length)],
                top: 8 + Math.random() * 70,
                left: Math.random() < 0.5 ? 4 + Math.random() * 14 : 78 + Math.random() * 14,
                size: 26 + Math.random() * 22,
                anim: Math.random() < 0.5 ? "kg-float 2.2s ease-in-out infinite" : "kg-float-slow 1.8s ease-in-out infinite",
              }))
            : [],
        });
      }
    }
    return arr;
  }
  if (test.type === "go-nogo") {
    const arr = [];
    for (let i = 0; i < test.trials; i++) {
      const isGo = Math.random() < 0.7;
      arr.push({ id: uid(), stimulusId: isGo ? "green_go" : "red_nogo", go: isGo });
    }
    return arr;
  }
  if (test.type === "stroop") {
    const arr = [];
    for (let i = 0; i < test.trials; i++) {
      const word = STROOP_WORDS[Math.floor(Math.random() * STROOP_WORDS.length)];
      let ink = STROOP_WORDS[Math.floor(Math.random() * STROOP_WORDS.length)];
      if (Math.random() < 0.75 && ink.color === word.color) {
        ink = STROOP_WORDS.find((c) => c.color !== word.color);
      }
      arr.push({ id: uid(), stimulusId: `${word.label}_${ink.color}`, word: word.label, ink: ink.color });
    }
    return arr;
  }
  if (test.type === "visual-search") {
    const GRID_SIZE = 12;
    const SHAPES = ["circle", "triangle", "square", "star"];
    const COLORS = ["blue", "red", "green", "yellow"];
    const arr = [];
    for (let i = 0; i < test.trials; i++) {
      const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      const targetIndex = Math.floor(Math.random() * GRID_SIZE);
      const cells = Array.from({ length: GRID_SIZE }, (_, idx) => {
        if (idx === targetIndex) return { shape: targetShape, color: targetColor };
        let shape, color;
        do {
          shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
          color = COLORS[Math.floor(Math.random() * COLORS.length)];
        } while (shape === targetShape && color === targetColor);
        return { shape, color };
      });
      arr.push({ id: uid(), stimulusId: `search_${targetShape}_${targetColor}`, cells, targetIndex, targetShape, targetColor });
    }
    return arr;
  }
  if (test.type === "auditory") {
    const arr = [];
    for (let i = 0; i < test.trials; i++) {
      const isGo = Math.random() < 0.7;
      arr.push({ id: uid(), stimulusId: isGo ? "tone_high" : "tone_low", go: isGo, freq: isGo ? 880 : 330 });
    }
    return arr;
  }
  if (test.type === "cognitive-flexibility") {
    const SHAPES2 = ["circle", "square"];
    const COLORS2 = ["red", "blue"];
    const arr = [];
    let prevRule = null;
    for (let i = 0; i < test.trials; i++) {
      const rule = Math.random() < 0.5 ? "color" : "shape";
      const shape = SHAPES2[Math.floor(Math.random() * SHAPES2.length)];
      const color = COLORS2[Math.floor(Math.random() * COLORS2.length)];
      const correctCategory = rule === "color" ? color : shape;
      const switchTrial = prevRule !== null && rule !== prevRule;
      prevRule = rule;
      arr.push({ id: uid(), stimulusId: `${shape}_${color}_${rule}`, shape, color, rule, correctCategory, switchTrial });
    }
    return arr;
  }
  return [];
}

/* ============================================================
   AGE GROUPS — yaş grubuna göre test uyarlaması
   (görev sayısı, yanıt penceresi, span aralığı ve RT tabanı)
   ============================================================ */
const AGE_GROUPS = [
  { id: "6-9", label: { tr: "6-9 yaş", en: "Ages 6-9" }, emoji: "🧒", color: "#FF6B35", desc: { tr: "Basitleştirilmiş görevler, daha uzun yanıt süreleri", en: "Simplified tasks, longer response windows" }, trialFactor: 0.7, windowFactor: 1.6, rtBaselineShift: 250, spanStart: 2, spanMax: 6 },
  { id: "10-13", label: { tr: "10-13 yaş", en: "Ages 10-13" }, emoji: "🧑", color: "#06B6D4", desc: { tr: "Orta yoğunlukta görevler, geniş yanıt penceresi", en: "Moderate task load, wide response window" }, trialFactor: 0.85, windowFactor: 1.3, rtBaselineShift: 150, spanStart: 3, spanMax: 7 },
  { id: "14-17", label: { tr: "14-17 yaş", en: "Ages 14-17" }, emoji: "🧑‍🎓", color: "#F59E0B", desc: { tr: "Standarda yakın görev yapısı", en: "Near-standard task structure" }, trialFactor: 1, windowFactor: 1.15, rtBaselineShift: 60, spanStart: 3, spanMax: 8 },
  { id: "adult", label: { tr: "Yetişkin", en: "Adult" }, emoji: "🧠", color: "#8B5CF6", desc: { tr: "Tam kapsamlı standart testler", en: "Full standard tests" }, trialFactor: 1, windowFactor: 1, rtBaselineShift: 0, spanStart: 3, spanMax: 9 },
];

const AgeSelect = ({ current, onSelect }) => {
  const { lang, t } = useT();
  return (
  <div className="min-h-full flex flex-col items-center justify-center p-6" style={{ background: C.bg }}>
    <h1 className="text-2xl font-semibold mb-1 text-center" style={{ color: C.text }}>{t("ageSelectTitle")}</h1>
    <p className="text-sm mb-6 text-center" style={{ color: C.textMuted }}>
      {t("ageSelectDesc")}
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
      {AGE_GROUPS.map((g, i) => {
        const selected = current?.id === g.id;
        return (
          <button
            key={g.id}
            onClick={() => onSelect(g)}
            className="rounded-2xl p-6 flex flex-col items-center gap-2 kg-btn-pop text-center"
            style={{
              background: `linear-gradient(145deg, ${g.color}, ${g.color}CC)`,
              boxShadow: selected ? `0 0 0 3px #fff, 0 0 0 6px ${g.color}` : `0 10px 24px ${g.color}44`,
              animation: `kg-countup 0.4s ease ${i * 0.08}s backwards`,
            }}
          >
            <span style={{ fontSize: 40 }}>{g.emoji}</span>
            <span className="text-white font-bold text-lg">{L(g.label, lang)}</span>
            <span className="text-white text-xs" style={{ opacity: 0.9 }}>{L(g.desc, lang)}</span>
            {selected && <Badge tone="success">Seçili</Badge>}
          </button>
        );
      })}
    </div>
    <p className="text-xs mt-6 text-center max-w-md" style={{ color: C.textMuted }}>
      {t("ageNote")}
    </p>
  </div>
  );
};

/* ============================================================
   SCORING ENGINE (klinik norm içermeyen skor modeli)
   ============================================================ */
function computeSubscores(test, s, events) {
  const { omissionRate, commissionRate, meanRT, sdRT, accuracy } = s;
  const shift = (test.age && test.age.rtBaselineShift) || 0;
  switch (test.type) {
    case "target-detection":
    case "go-nogo":
    case "stroop": {
      const attention = clamp(100 - omissionRate * 140);
      const speed = clamp(100 - (meanRT - (250 + shift)) / 6);
      const impulseControl = clamp(100 - commissionRate * 160);
      const consistency = clamp(100 - sdRT / 4.5);
      return {
        attention: Math.round(attention),
        speed: Math.round(speed),
        impulseControl: Math.round(impulseControl),
        consistency: Math.round(consistency),
        accuracy: Math.round(accuracy),
      };
    }
    case "distractor-cpt": {
      // CPT alt skorları + blok karşılaştırmalı Çeldirici Direnci.
      const base = events.filter((e) => e.block === 0);
      const distracted = events.filter((e) => e.block != null && e.block > 0);
      const accOf = (arr) => (arr.length ? (arr.filter((e) => e.correct).length / arr.length) * 100 : 0);
      const rtOf = (arr) => mean(arr.filter((e) => e.reactionTime != null).map((e) => e.reactionTime));
      const accDrop = Math.max(0, accOf(base) - accOf(distracted));
      const rtRise = Math.max(0, rtOf(distracted) - rtOf(base));
      const distractorResistance = clamp(100 - (accDrop * 1.6 + rtRise / 6));
      const attention = clamp(100 - omissionRate * 140);
      const impulseControl = clamp(100 - commissionRate * 160);
      const consistency = clamp(100 - sdRT / 4.5);
      return {
        attention: Math.round(attention),
        distractorResistance: Math.round(distractorResistance),
        impulseControl: Math.round(impulseControl),
        consistency: Math.round(consistency),
        accuracy: Math.round(accuracy),
      };
    }
    case "auditory": {
      // Same paradigm as go/no-go, calibrated for typically faster auditory RTs.
      const attention = clamp(100 - omissionRate * 140);
      const speed = clamp(100 - (meanRT - (220 + shift)) / 5);
      const impulseControl = clamp(100 - commissionRate * 160);
      const consistency = clamp(100 - sdRT / 4);
      return {
        attention: Math.round(attention),
        speed: Math.round(speed),
        impulseControl: Math.round(impulseControl),
        consistency: Math.round(consistency),
        accuracy: Math.round(accuracy),
      };
    }
    case "visual-search": {
      // Wrong-cell taps and timeouts are both treated as search errors.
      const attention = clamp(100 - (omissionRate + commissionRate) * 90);
      const speed = clamp(100 - (meanRT - (900 + shift * 2)) / 18);
      const consistency = clamp(100 - sdRT / 7);
      return {
        attention: Math.round(attention),
        speed: Math.round(speed),
        consistency: Math.round(consistency),
        accuracy: Math.round(accuracy),
      };
    }
    case "cognitive-flexibility": {
      const switchRTs = events.filter((e) => e.switchTrial && e.reactionTime != null).map((e) => e.reactionTime);
      const repeatRTs = events.filter((e) => !e.switchTrial && e.reactionTime != null).map((e) => e.reactionTime);
      const switchCost = switchRTs.length && repeatRTs.length ? mean(switchRTs) - mean(repeatRTs) : 0;
      const flexibility = clamp(100 - Math.max(0, switchCost) / 4);
      const speed = clamp(100 - (meanRT - (350 + shift)) / 6);
      const consistency = clamp(100 - sdRT / 5);
      return {
        flexibility: Math.round(flexibility),
        speed: Math.round(speed),
        consistency: Math.round(consistency),
        accuracy: Math.round(accuracy),
      };
    }
    case "digit-span": {
      const spans = events.filter((e) => e.correct).map((e) => e.span);
      const spanStart = (test.age && test.age.spanStart) || 3;
      const spanMax = (test.age && test.age.spanMax) || 9;
      const maxSpan = spans.length ? Math.max(...spans) : spanStart - 1;
      const memory = clamp(((maxSpan - (spanStart - 1)) / (spanMax - (spanStart - 1))) * 100);
      const speed = clamp(100 - (meanRT - (1500 + shift * 2)) / 40);
      const consistency = clamp(100 - sdRT / 60);
      return {
        memory: Math.round(memory),
        speed: Math.round(speed),
        consistency: Math.round(consistency),
        accuracy: Math.round(accuracy),
      };
    }
    default:
      return { accuracy: Math.round(accuracy) };
  }
}

function computeResult(test, events) {
  const total = events.length;
  const correct = events.filter((e) => e.correct).length;
  const omissions = events.filter((e) => e.errorType === "omission").length;
  const commissions = events.filter((e) => e.errorType === "commission").length;
  const rts = events.filter((e) => e.reactionTime != null).map((e) => e.reactionTime);
  const meanRT = mean(rts);
  const sdRT = stddev(rts);
  const accuracy = total ? (correct / total) * 100 : 0;
  const omissionRate = total ? omissions / total : 0;
  const commissionRate = total ? commissions / total : 0;

  const subscores = computeSubscores(test, { omissionRate, commissionRate, meanRT, sdRT, accuracy }, events);
  const overall = Math.round(mean(Object.values(subscores)));

  let blockStats = null;
  if (test.type === "distractor-cpt") {
    blockStats = [0, 1, 2, 3].map((b) => {
      const evs = events.filter((e) => e.block === b);
      const rts = evs.filter((e) => e.reactionTime != null).map((e) => e.reactionTime);
      return {
        block: b,
        acc: evs.length ? Math.round((evs.filter((e) => e.correct).length / evs.length) * 100) : 0,
        meanRT: Math.round(mean(rts)),
      };
    });
  }

  return {
    blockStats,
    id: uid(),
    testId: test.id,
    testName: test.name,
    date: new Date().toISOString(),
    overall,
    subscores,
    stats: { total, correct, omissions, commissions, meanRT: Math.round(meanRT), sdRT: Math.round(sdRT) },
  };
}

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
const Card = ({ children, className = "", style = {} }) => (
  <div
    className={`rounded-2xl p-5 kg-card-hover ${className}`}
    style={{ background: C.surface, boxShadow: "0 1px 3px rgba(23,25,35,0.06), 0 1px 2px rgba(23,25,35,0.04)", ...style }}
  >
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled, style: styleOverride }) => {
  const styles = {
    primary: { background: `linear-gradient(135deg, ${C.primary}, ${C.accent1})`, color: "#fff" },
    secondary: { background: `linear-gradient(135deg, ${C.secondary}, ${C.accent3})`, color: "#fff" },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-xl font-medium text-sm kg-btn-pop ${disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-95"} ${className}`}
      style={{ ...styles[variant], ...styleOverride }}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, tone = "default" }) => {
  const tones = {
    default: { background: "#EEF0FF", color: C.primary },
    success: { background: "#DCFCE7", color: "#15803D" },
    warning: { background: "#FEF3C7", color: "#B45309" },
    muted: { background: "#F3F4F6", color: C.textMuted },
  };
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={tones[tone]}>
      {children}
    </span>
  );
};

const MetricCard = ({ label, value, suffix = "", tone }) => (
  <Card className="flex flex-col gap-1">
    <span className="text-xs" style={{ color: C.textMuted }}>{label}</span>
    <span className="text-2xl font-semibold" style={{ color: tone || C.text }}>{value}{suffix}</span>
  </Card>
);

const AVATAR_COLORS = ["#5B5CE2", "#00B8A9", "#8B5CF6", "#EC4899", "#06B6D4", "#F59E0B", "#22C55E", "#EF4444"];
const Avatar = ({ name, size = 34 }) => {
  const initials = (name || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const hash = [...(name || "")].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold flex-shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}33, ${color}1A)`, color, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
};

/* ============================================================
   CHART VIEWS
   ============================================================ */
const RadarView = ({ subscores }) => {
  const { lang } = useT();
  const data = Object.entries(subscores).map(([k, v]) => ({ metric: L(SUBSCORE_LABELS[k], lang) || k, value: v }));
  const gradId = useMemo(() => `radarFill-${Math.random().toString(36).slice(2)}`, []);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="75%">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.primary} />
            <stop offset="55%" stopColor={C.accent1} />
            <stop offset="100%" stopColor={C.accent2} />
          </linearGradient>
        </defs>
        <PolarGrid stroke={C.border} />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: C.textMuted }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke={C.accent1} strokeWidth={2} fill={`url(#${gradId})`} fillOpacity={0.6} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

const DonutView = ({ stats }) => {
  const data = [
    { name: "Doğru", value: stats.correct, color: C.success },
    { name: "Es Geçilen (Omission)", value: stats.omissions, color: C.warning },
    { name: "Hatalı Tepki (Commission)", value: stats.commissions, color: C.danger },
  ].filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

const HistoryLineChart = ({ sessions }) => {
  const data = sessions.map((s, i) => ({ name: `Test ${i + 1}`, skor: s.overall }));
  const gradId = useMemo(() => `lineGrad-${Math.random().toString(36).slice(2)}`, []);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.primary} />
            <stop offset="100%" stopColor={C.accent2} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.textMuted }} />
        <Tooltip />
        <Line type="monotone" dataKey="skor" stroke={`url(#${gradId})`} strokeWidth={3} dot={{ r: 5, fill: C.accent1, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const ErrorBarChart = ({ stats }) => {
  const data = [
    { name: "Omission", value: stats.omissions, color: C.warning },
    { name: "Commission", value: stats.commissions, color: C.danger },
  ];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data}>
        <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.textMuted }} />
        <Tooltip />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/* ============================================================
   LANDING PAGE
   ============================================================ */
const FAQ_ITEMS = [
  { q: { tr: `${BRAND} tıbbi tanı koyar mı?`, en: `Does ${BRAND} provide medical diagnosis?` }, a: { tr: "Hayır. Platform bilişsel performansınızı interaktif görevlerle ölçer; sonuçlar bilgilendirme amaçlıdır ve hiçbir şekilde klinik tanı veya tıbbi değerlendirmenin yerine geçmez.", en: "No. The platform measures your cognitive performance with interactive tasks; results are informational and never replace clinical diagnosis or medical evaluation." } },
  { q: { tr: "Testler ne kadar sürüyor?", en: "How long do the tests take?" }, a: { tr: "Her test yaklaşık 1-3 dakika sürer. Dilediğiniz zaman, dilediğiniz testi çözebilir ve gelişiminizi takip edebilirsiniz.", en: "Each test takes about 1-3 minutes. You can take any test anytime and track your progress." } },
  { q: { tr: "Verilerim güvende mi?", en: "Is my data safe?" }, a: { tr: "KVKK uyumlu veri yönetimi uygulanır. Verilerinizi profil sayfanızdan dilediğinizde indirebilir veya kalıcı olarak silebilirsiniz.", en: "GDPR/KVKK-compliant data management is applied. You can download or permanently delete your data anytime from your profile page." } },
  { q: { tr: "Sonuçlarımı uzmanımla paylaşabilir miyim?", en: "Can I share my results with my specialist?" }, a: { tr: "Evet. Uzman paneli üzerinden psikolog ve eğitimciler size test atayabilir, sonuçlarınızı inceleyip PDF rapor oluşturabilir.", en: "Yes. Through the expert panel, psychologists and educators can assign tests, review your results and create PDF reports." } },
  { q: { tr: "Hangi cihazlarda çalışır?", en: "Which devices does it work on?" }, a: { tr: "Web tarayıcınızda tüm cihazlarda çalışır; iOS ve Android uygulamaları yol haritamızdadır.", en: "It works in your web browser on all devices; iOS and Android apps are on our roadmap." } },
];

const Landing = ({ onStart, onExpert }) => {
  const { lang, t } = useT();
  const [openFaq, setOpenFaq] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [legalDoc, setLegalDoc] = useState(null);

  const STATS = [
    { n: "8", label: { tr: "Bilişsel Test", en: "Cognitive Tests" } },
    { n: "12", label: { tr: "Öz Değerlendirme", en: "Self Assessments" } },
    { n: "15", label: { tr: "Zihinsel Egzersiz", en: "Mental Exercises" } },
    { n: "3", label: { tr: "Dakika Ortalama Süre", en: "Min. Avg. Duration" } },
  ];

  const FEATURES = [
    { icon: "🎯", title: { tr: "Hedefli Ölçüm", en: "Targeted Measurement" }, text: { tr: "Dikkat, tepki hızı, dürtü kontrolü ve bilişsel esnekliği ayrı ayrı ölçen bilimsel paradigmalara dayalı görevler.", en: "Tasks based on scientific paradigms that separately measure attention, reaction speed, impulse control and cognitive flexibility." }, color: C.primary },
    { icon: "📈", title: { tr: "Kişisel Gelişim Takibi", en: "Personal Progress Tracking" }, text: { tr: "Her testten sonra radar, zaman çizgisi ve hata analizi grafikleriyle görsel performans raporu.", en: "Visual performance report with radar, timeline and error analysis charts after every test." }, color: C.secondary },
    { icon: "🧠", title: { tr: "Adaptif Antrenman", en: "Adaptive Training" }, text: { tr: "Okuma hızınıza göre belirlenen seviyede 21 günlük egzersiz programı; zorlandıkça hız otomatik ayarlanır.", en: "21-day exercise program at a level calibrated to your reading speed; pacing adjusts as you improve." }, color: C.accent1 },
    { icon: "🗣️", title: { tr: "Uzman Bağlantısı", en: "Expert Connection" }, text: { tr: "Psikolog ve eğitimciler size test atayabilir, sonuçlarınızı inceleyip PDF rapor oluşturabilir.", en: "Psychologists and educators can assign tests, review your results and generate PDF reports." }, color: C.accent2 },
    { icon: "🔒", title: { tr: "Gizlilik Önce", en: "Privacy First" }, text: { tr: "KVKK uyumlu veri yönetimi. Verileriniz yalnızca sizindir — dilediğinizde indirin veya silin.", en: "KVKK/GDPR-compliant data management. Your data belongs only to you — download or delete anytime." }, color: "#8B5CF6" },
    { icon: "⚕️", title: { tr: "Klinik Değil, Farkındalık", en: "Awareness, Not Diagnosis" }, text: { tr: "Bu platform tıbbi tanı koymaz. Sonuçlar klinik değerlendirmenin yerini tutmaz; öz-farkındalık aracıdır.", en: "This platform does not provide medical diagnosis. Results do not replace clinical evaluation; they are a self-awareness tool." }, color: C.warning },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100%", fontFamily: "Inter, sans-serif" }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(247,248,252,0.85)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} radius={10} fontSize={16} />
            <span style={{ fontWeight: 700, fontSize: 18, color: C.text, letterSpacing: "-0.3px" }}>{BRAND}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onExpert} style={{ fontSize: 14, color: C.textMuted, background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8 }}>
              {t("expertBtn")}
            </button>
            <button onClick={onStart} style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg, ${C.primary}, ${C.accent1})`, border: "none", cursor: "pointer", padding: "9px 20px", borderRadius: 10, boxShadow: `0 4px 14px ${C.primary}40` }}>
              {t("startTest")} →
            </button>
          </div>
        </div>
      </nav>

      <section style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center", position: "relative" }}>
        <div style={{ marginBottom: 10 }}>
          <PenguMascot state="greet" size={116} bubble={{ tr: "Merhaba! Ben Pengu — zihnini birlikte keşfedelim! 🐧", en: "Hi! I'm Pengu — let's explore your mind together! 🐧" }} />
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${C.primary}12`, border: `1px solid ${C.primary}30`, borderRadius: 100, padding: "6px 14px", marginBottom: 28 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.success, display: "inline-block" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.primary, letterSpacing: "0.4px" }}>
            {lang === "en" ? "NON-CLINICAL SELF-AWARENESS PLATFORM" : "KLİNİK OLMAYAN ÖZ-FARKINDALIK PLATFORMU"}
          </span>
        </div>

        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: C.text, lineHeight: 1.12, letterSpacing: "-1.5px", margin: "0 0 20px" }}>
          {lang === "en" ? <>Measure your<br />
            <span style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.accent1}, ${C.accent2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>cognitive performance</span>
          </> : <>Bilişsel performansınızı<br />
            <span style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.accent1}, ${C.accent2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>ölçün ve geliştirin</span>
          </>}
        </h1>

        <p style={{ fontSize: 17, color: C.textMuted, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
          {lang === "en"
            ? "Interactive cognitive tasks, self-assessments and a personalised 21-day mental training programme — all in one platform."
            : "İnteraktif bilişsel görevler, öz değerlendirmeler ve kişiselleştirilmiş 21 günlük zihinsel antrenman — hepsi tek platformda."}
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onStart} style={{ fontSize: 15, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${C.primary}, ${C.accent1})`, border: "none", cursor: "pointer", padding: "14px 32px", borderRadius: 12, boxShadow: `0 6px 24px ${C.primary}45` }}>
            {lang === "en" ? "Start Free →" : "Ücretsiz Başla →"}
          </button>
          <button onClick={onExpert} style={{ fontSize: 15, fontWeight: 600, color: C.text, background: C.surface, border: `1.5px solid ${C.border}`, cursor: "pointer", padding: "14px 28px", borderRadius: 12 }}>
            {lang === "en" ? "For Experts" : "Uzmanlar İçin"}
          </button>
        </div>
      </section>

      <section style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 0 }}>
          {STATS.map((st, i) => (
            <div key={i} style={{ textAlign: "center", padding: "0 16px", borderRight: i < STATS.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: C.primary, letterSpacing: "-1px", lineHeight: 1 }}>{st.n}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, fontWeight: 500 }}>{L(st.label, lang)}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: "1.2px", marginBottom: 10 }}>
            {lang === "en" ? "PLATFORM CAPABILITIES" : "PLATFORM KAPASİTESİ"}
          </p>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: C.text, letterSpacing: "-0.8px", margin: 0 }}>
            {lang === "en" ? "Everything in one place" : "Her şey tek yerde"}
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={i}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{ background: C.surface, borderRadius: 16, padding: "28px 24px", border: `1.5px solid ${hoveredFeature === i ? f.color + "60" : C.border}`, transition: "border-color 0.25s, transform 0.25s, box-shadow 0.25s", transform: hoveredFeature === i ? "translateY(-3px)" : "none", boxShadow: hoveredFeature === i ? `0 8px 30px ${f.color}18` : "0 1px 3px rgba(23,25,35,0.05)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8, letterSpacing: "-0.2px" }}>{L(f.title, lang)}</h3>
              <p style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>{L(f.text, lang)}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ margin: "0 24px 72px", maxWidth: 1032, marginLeft: "auto", marginRight: "auto" }}>
        <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.accent1} 60%, ${C.accent2})`, borderRadius: 20, padding: "52px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
          <div style={{ position: "absolute", bottom: -30, left: 40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.6px", margin: "0 0 12px", position: "relative" }}>
            {lang === "en" ? "Ready to discover your cognitive profile?" : "Bilişsel profilinizi keşfetmeye hazır mısınız?"}
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", margin: "0 0 28px", position: "relative" }}>
            {lang === "en" ? "First test takes 1–3 minutes. No credit card required." : "İlk test 1–3 dakika. Kredi kartı gerekmez."}
          </p>
          <button onClick={onStart} style={{ fontSize: 15, fontWeight: 700, color: C.primary, background: "#fff", border: "none", cursor: "pointer", padding: "13px 30px", borderRadius: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
            {lang === "en" ? "Begin Now →" : "Hemen Başla →"}
          </button>
        </div>
      </section>

      <section style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 72px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: C.text, textAlign: "center", letterSpacing: "-0.5px", marginBottom: 28 }}>{t("faqTitle")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ_ITEMS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={i} style={{ background: C.surface, borderRadius: 12, border: `1.5px solid ${open ? C.primary + "50" : C.border}`, overflow: "hidden", transition: "border-color 0.2s" }}>
                <button onClick={() => setOpenFaq(open ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: open ? C.primary : C.text }}>{L(f.q, lang)}</span>
                  <span style={{ color: C.textMuted, fontSize: 18, transform: open ? "rotate(45deg)" : "none", transition: "transform 0.25s", flexShrink: 0, marginLeft: 12 }}>+</span>
                </button>
                {open && <p style={{ fontSize: 13.5, color: C.textMuted, padding: "0 20px 16px", lineHeight: 1.65, margin: 0, animation: "kg-countup 0.2s ease" }}>{L(f.a, lang)}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "28px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <LogoMark size={24} radius={7} fontSize={12} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>{BRAND}</span>
        </div>
        <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
          © 2026 {BRAND} · {lang === "en" ? "Results do not replace clinical evaluation." : "Sonuçlar klinik değerlendirmenin yerini tutmaz."}
          {" · "}
          <button onClick={() => setLegalDoc("disclosure")} className="underline" style={{ color: C.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12 }}>
            {lang === "en" ? "Privacy Notice (KVKK)" : "KVKK Aydınlatma Metni"}
          </button>
        </p>
      </footer>
      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </div>
  );
};

const AuthScreen = ({ onDone, onBack, expertMode = false }) => {
  const { lang } = useT();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [ackDisclosure, setAckDisclosure] = useState(false);
  const [ackConsent, setAckConsent] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null); // null | "disclosure" | "consent"

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError(lang === "en" ? "Please fill in all fields." : "Tüm alanları doldurun."); return; }
    if (mode === "register" && (!ackDisclosure || !ackConsent)) {
      setError(lang === "en" ? "Please review and accept the Privacy Notice and Explicit Consent." : "Lütfen Aydınlatma Metni'ni ve Açık Rıza'yı inceleyip onaylayın.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        // 1) Gerçek API
        const res = await api.login(email, password);
        if (res && res.accessToken) {
          setApiToken(res.accessToken);
          onDone("login", res.user?.role?.toLowerCase?.() || "user", res.user?.name || email.split("@")[0]);
          return;
        }
        // 2) Çevrimdışı yedek (yalnızca API erişilemezse)
        const found = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!found) { setError(lang === "en" ? "Wrong e-mail or password." : "E-posta veya şifre hatalı."); return; }
        onDone("login", found.role, found.name);
      } else {
        const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || email.split("@")[0];
        // 1) Gerçek API
        const res = await api.register(email, password, name);
        if (res && res.accessToken) {
          setApiToken(res.accessToken);
          onDone("register", "user", res.user?.name || name);
          return;
        }
        // 2) Çevrimdışı yedek
        const exists = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) { setError(lang === "en" ? "This e-mail is already registered. Please sign in." : "Bu e-posta zaten kayıtlı. Giriş yapın."); return; }
        MOCK_USERS = [...MOCK_USERS, { email, password, role: "user", name }];
        onDone("register", "user", name);
      }
    } finally { setBusy(false); }
  };
  return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
      <div className="w-full max-w-sm">
        <div className="h-1.5 rounded-full mb-3 kg-gradient-anim" style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.accent1}, ${C.accent2})`, backgroundSize: "200% 100%" }} />
        <Card>
        <button onClick={onBack} className="text-xs flex items-center gap-1 mb-4" style={{ color: C.textMuted }}>
          <ArrowLeft size={14} /> {lang === "en" ? "Back" : "Geri"}
        </button>
        {expertMode && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: "#EEF0FF" }}>
            <Shield size={16} style={{ color: C.primary }} />
            <span className="text-xs font-medium" style={{ color: C.primary }}>
              {lang === "en" ? "Expert / Admin Login" : "Uzman / Admin Girişi"}
            </span>
          </div>
        )}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setMode("login")} className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={mode === "login" ? { background: C.primary, color: "#fff" } : { background: "#F3F4F6", color: C.textMuted }}>{lang === "en" ? "Sign In" : "Giriş Yap"}</button>
          <button onClick={() => setMode("register")} className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={mode === "register" ? { background: C.primary, color: "#fff" } : { background: "#F3F4F6", color: C.textMuted }}>{lang === "en" ? "Register" : "Kayıt Ol"}</button>
        </div>
        <div className="flex flex-col gap-3">
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <input placeholder={lang === "en" ? "First name" : "Ad"} value={firstName} onChange={e => setFirstName(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: C.border }} />
              <input placeholder={lang === "en" ? "Last name" : "Soyad"} value={lastName} onChange={e => setLastName(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: C.border }} />
            </div>
          )}
          <input placeholder={lang === "en" ? "E-mail" : "E-posta"} value={email} onChange={e => { setEmail(e.target.value); setError(""); }} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: error ? C.danger : C.border }} />
          <input placeholder={lang === "en" ? "Password" : "Şifre"} type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: error ? C.danger : C.border }} />
          {error && <p className="text-xs" style={{ color: C.danger }}>{error}</p>}
          {mode === "register" && (
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2 text-xs" style={{ color: C.textMuted }}>
                <input type="checkbox" checked={ackDisclosure} onChange={(e) => { setAckDisclosure(e.target.checked); setError(""); }} className="mt-0.5" />
                <span>
                  {lang === "en" ? "I have read the " : ""}
                  <button type="button" onClick={() => setLegalDoc("disclosure")} className="underline font-medium" style={{ color: C.primary }}>
                    {lang === "en" ? "Privacy Notice" : "KVKK Aydınlatma Metni"}
                  </button>
                  {lang === "en" ? "." : "'ni okudum."}
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs" style={{ color: C.textMuted }}>
                <input type="checkbox" checked={ackConsent} onChange={(e) => { setAckConsent(e.target.checked); setError(""); }} className="mt-0.5" />
                <span>
                  {lang === "en" ? "I give my " : "Performans verilerimin işlenmesine "}
                  <button type="button" onClick={() => setLegalDoc("consent")} className="underline font-medium" style={{ color: C.primary }}>
                    {lang === "en" ? "explicit consent" : "açık rıza"}
                  </button>
                  {lang === "en" ? " to the processing of my performance data." : " veriyorum."}
                </span>
              </label>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={busy} className="w-full mt-1">{busy ? "…" : mode === "login" ? (lang === "en" ? "Sign In" : "Giriş Yap") : (lang === "en" ? "Create Account" : "Hesap Oluştur")}</Button>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={handleSubmit}>Google</Button>
            <Button variant="ghost" className="flex-1" onClick={handleSubmit}>Apple</Button>
          </div>
          {mode === "login" && !IS_PROD && (
            <p className="text-xs text-center mt-1" style={{ color: C.textMuted }}>
              {lang === "en" ? "Offline trial: user / expert / admin @demo.com · Demo123!" : "Çevrimdışı deneme: user / expert / admin @demo.com · Demo123!"}
            </p>
          )}
        </div>
      </Card>
      </div>
      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </div>
  );
};

/* ============================================================
   ONBOARDING (4 adım — spec md. 39)
   ============================================================ */
const ONBOARDING_STEPS = [
  { icon: "👋", title: { tr: "Hoş geldiniz!", en: "Welcome!" }, text: { tr: `${BRAND} ile bilişsel performansınızı ölçün ve gelişiminizi takip edin.`, en: `Measure your cognitive performance and track your progress with ${BRAND}.` } },
  { icon: "📝", title: { tr: "Profilinizi tamamlayın", en: "Complete your profile" }, text: { tr: "Size daha iyi bir deneyim sunabilmemiz için birkaç bilgi.", en: "A few details so we can offer you a better experience." } },
  { icon: "🎯", title: { tr: "İlk testinizi seçin", en: "Choose your first test" }, text: { tr: "1-3 dakikalık kısa görevlerle hemen başlayabilirsiniz.", en: "Start right away with short 1-3 minute tasks." } },
  { icon: "📈", title: { tr: "Performansınızı takip edin", en: "Track your performance" }, text: { tr: "Her testten sonra görsel raporlar ve gelişim grafikleri sizi bekliyor.", en: "Visual reports and progress charts await after every test." } },
];

const Onboarding = ({ onFinish }) => {
  const { lang, t } = useT();
  const [step, setStep] = useState(0);
  const s = ONBOARDING_STEPS[step];
  const last = step === ONBOARDING_STEPS.length - 1;
  const STEP_COLORS = [C.primary, C.secondary, C.accent2, C.accent1];
  return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
      <Card className="w-full max-w-sm text-center" key={step} style={{ animation: "kg-countup 0.4s ease" }}>
        {step === 0 ? (
          <div className="mb-3">
            <PenguMascot state="greet" size={104} bubble={{ tr: "Merhaba! Ben Pengu, yol arkadaşın! 🐧", en: "Hi! I'm Pengu, your companion! 🐧" }} />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: `linear-gradient(135deg, ${STEP_COLORS[step]}, ${C.accent1})`, fontSize: 30 }}
          >
            {s.icon}
          </div>
        )}
        <h2 className="font-semibold text-lg mb-2" style={{ color: C.text }}>{L(s.title, lang)}</h2>
        <p className="text-sm mb-5" style={{ color: C.textMuted }}>{L(s.text, lang)}</p>

        {step === 1 && (
          <div className="flex flex-col gap-3 mb-5 text-left">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Ad" defaultValue="Sinem" className="border rounded-lg px-3 py-2 text-sm w-full" style={{ borderColor: C.border }} />
              <input placeholder="Soyad" className="border rounded-lg px-3 py-2 text-sm w-full" style={{ borderColor: C.border }} />
            </div>
            <input placeholder="Doğum yılı" className="border rounded-lg px-3 py-2 text-sm w-full" style={{ borderColor: C.border }} />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2 mb-5">
            {TEST_CATALOG.slice(0, 3).map((t) => {
              const accent = TEST_ACCENTS[t.id] || { glyph: "✦" };
              return (
                <div key={t.id} className="flex items-center gap-2.5 rounded-xl border p-2.5 text-left" style={{ borderColor: C.border }}>
                  <span style={{ fontSize: 18 }}>{accent.glyph}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.text }}>{L(t.name, lang)}</p>
                    <p className="text-xs" style={{ color: C.textMuted }}>{t.duration} · {t.difficulty}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center gap-1.5 mb-5">
          {ONBOARDING_STEPS.map((_, i) => (
            <span key={i} className="rounded-full" style={{ width: i === step ? 20 : 8, height: 8, background: i === step ? C.primary : C.border, transition: "all 0.3s" }} />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && <Button variant="ghost" className="flex-1" onClick={() => setStep(step - 1)}>Geri</Button>}
          <Button className="flex-1" onClick={() => (last ? onFinish() : setStep(step + 1))}>{last ? t("letsgo") : t("next")}</Button>
        </div>
      </Card>
    </div>
  );
};

/* ============================================================
   GÜNLÜK PLAN (hafta şeridi + hedef kartları)
   ============================================================ */
const DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cts"];

const DailyPlan = ({ goals, streak }) => {
  const { lang, t } = useT();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const daysShort = lang === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : DAY_SHORT;
  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: C.text }}>{t("dailyPlan")}</h3>
        <span className="text-xs" style={{ color: C.textMuted }}>
          {new Date().toLocaleDateString(lang === "en" ? "en-US" : "tr-TR", { day: "numeric", month: "long" })}
        </span>
      </div>

      <div className="flex justify-between mb-4 rounded-xl p-2" style={{ background: C.bg }}>
        {days.map((d, i) => {
          const isToday = i === 6;
          const hadActivity = streak && streak.days[(d.getDay() + 6) % 7] && !isToday;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xs" style={{ color: isToday ? C.text : C.textMuted, fontWeight: isToday ? 600 : 400 }}>
                {daysShort[d.getDay()]}
              </span>
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                style={isToday
                  ? { background: `linear-gradient(135deg, ${C.primary}, ${C.accent1})`, color: "#fff" }
                  : { color: C.textMuted, background: hadActivity ? `${C.warning}22` : "transparent" }}
              >
                {d.getDate()}
              </span>
              {hadActivity && <span style={{ fontSize: 9 }}>🔥</span>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col">
        {goals.map((g, i) => {
          const pct = Math.min(100, Math.round((g.done / g.target) * 100));
          const complete = g.done >= g.target;
          return (
            <div key={g.id} className={`flex items-center gap-3 py-3 ${i < goals.length - 1 ? "border-b" : ""}`} style={{ borderColor: C.border }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${g.color}, ${g.color}BB)`, fontSize: 22 }}>
                {g.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: C.text }}>{g.title}</p>
                <p className="text-xs mb-1.5" style={{ color: C.textMuted }}>{g.desc}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: C.border }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: complete ? C.success : `linear-gradient(90deg, ${g.color}, ${C.accent1})` }} />
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: C.textMuted }}>
                    <b style={{ color: complete ? C.success : C.text }}>{g.done}</b> / {g.target}
                  </span>
                </div>
              </div>
              <button
                onClick={g.onGo}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 kg-btn-pop"
                style={complete ? { background: "#DCFCE7", color: C.success } : { background: "#EEF0FF", color: C.primary }}
              >
                {complete ? <Check size={16} /> : <Play size={14} />}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/* ============================================================
   USER: DASHBOARD
   ============================================================ */
const UserDashboard = ({ sessions, trainings = [], plan, streak, onGoCatalog, onGoTraining, onGoLibrary, onGoSubscription, currentUser, ageGroup }) => {
  const isKid = ageGroup?.id === "6-9";
  const { lang, t } = useT();
  const last = sessions[sessions.length - 1];
  const todayStr = new Date().toDateString();
  const trainingsToday = trainings.filter((tr) => new Date(tr.date).toDateString() === todayStr).length;
  const readingToday = trainings.filter((tr) => new Date(tr.date).toDateString() === todayStr && ["rsvp", "block-reading", "reading-test"].includes(tr.exerciseId)).length;
  const sessionsToday = sessions.filter((s) => new Date(s.date).toDateString() === todayStr).length;

  const goals = [
    { id: "g1", icon: "🏋️", color: "#5B5CE2", title: t("g1t"), desc: t("g1d"), done: Math.min(3, trainingsToday), target: 3, onGo: onGoTraining },
    { id: "g2", icon: "🧠", color: "#8B5CF6", title: t("g2t"), desc: t("g2d"), done: Math.min(1, sessionsToday), target: 1, onGo: onGoCatalog },
    { id: "g3", icon: "📖", color: "#00B8A9", title: t("g3t"), desc: t("g3d"), done: Math.min(1, readingToday), target: 1, onGo: onGoLibrary },
  ];

  return (
    <div className="p-5 max-w-3xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold" style={{ color: C.text }}>{t("hello")} {currentUser?.name?.split(" ")[0] || "Sinem"} 👋</h1>
        {streak && streak.count > 0 && (
          <span className="px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: `${C.warning}1F`, color: C.warning }}>
            🔥 {streak.count} gün
          </span>
        )}
      </div>
      <div className="flex justify-center mb-4">
        <PenguMascot state="greet" size={100} bubble={isKid
          ? { tr: sessions.length === 0 ? "Merhaba! Bugün beraber oynayalım mı? 🐧" : "Tekrar hoş geldin! Bugün ne oynuyoruz? 🐧", en: sessions.length === 0 ? "Hi! Shall we play together today? 🐧" : "Welcome back! What are we playing today? 🐧" }
          : { tr: sessions.length === 0 ? "Hoş geldin! İlk testinle başlayalım mı? 🐧" : "Tekrar hoş geldin! Bugünkü hedefine hazır mısın? 🐧", en: sessions.length === 0 ? "Welcome! Shall we start with your first test? 🐧" : "Welcome back! Ready for today's goal? 🐧" }} />
      </div>
      <div
        className="h-1.5 rounded-full mb-4 kg-gradient-anim"
        style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.accent1}, ${C.accent2}, ${C.secondary})`, backgroundSize: "300% 100%" }}
      />

      {BILLING_ENABLED && plan === "FREE" && (
        <div
          className="rounded-2xl p-5 mb-4 flex items-center justify-between gap-3 kg-gradient-anim"
          style={{ background: `linear-gradient(120deg, ${C.primary}, ${C.accent1}, ${C.accent2})`, backgroundSize: "200% 200%" }}
        >
          <div>
            <p className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Sparkles size={15} /> {lang === "en" ? "Upgrade to Pro" : "Pro'ya Yükseltin"}
            </p>
            <p className="text-white text-xs mt-1" style={{ opacity: 0.85 }}>
              {lang === "en" ? "Unlimited tests, detailed analytics and progress tracking await." : "Sınırsız test, detaylı analiz grafikleri ve gelişim takibi sizi bekliyor."}
            </p>
          </div>
          <button
            onClick={onGoSubscription}
            className="px-4 py-2 rounded-xl text-sm font-medium kg-btn-pop flex-shrink-0"
            style={{ background: "#fff", color: C.primary }}
          >
            {t("seePlans")}
          </button>
        </div>
      )}

      <DailyPlan goals={goals} streak={streak} />

      {last ? (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: C.text }}>{t("lastTest")} — {last.testName}</span>
            <Badge tone="success">{lang === "en" ? "Score" : "Skor"} {last.overall}/100</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(last.subscores).slice(0, 4).map(([k, v]) => (
              <MetricCard key={k} label={L(SUBSCORE_LABELS[k], lang) || k} value={v} />
            ))}
          </div>
        </Card>
      ) : (
        <Card className="mb-4 text-center py-8">
          <p style={{ color: C.textMuted }}>{t("noTestsYet")}</p>
          <Button className="mt-3" onClick={onGoCatalog}>{t("startFirst")}</Button>
        </Card>
      )}

      {sessions.length > 0 && (
        <Card className="mb-4">
          <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>{t("progressChart")}</h3>
          <HistoryLineChart sessions={sessions} />
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-medium mb-3" style={{ color: C.text }}>{t("testHistory")}</h3>
        {sessions.length === 0 ? (
          <p className="text-sm" style={{ color: C.textMuted }}>{t("noRecords")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: C.textMuted }}>
                <th className="pb-2 font-normal">Test</th>
                <th className="pb-2 font-normal">{lang === "en" ? "Date" : "Tarih"}</th>
                <th className="pb-2 font-normal">{lang === "en" ? "Score" : "Skor"}</th>
                <th className="pb-2 font-normal">{lang === "en" ? "Status" : "Durum"}</th>
              </tr>
            </thead>
            <tbody>
              {[...sessions].reverse().map((s) => (
                <tr key={s.id} className="border-t" style={{ borderColor: C.border }}>
                  <td className="py-2" style={{ color: C.text }}>{s.testName}</td>
                  <td className="py-2" style={{ color: C.textMuted }}>{new Date(s.date).toLocaleDateString(lang === "en" ? "en-US" : "tr-TR")}</td>
                  <td className="py-2" style={{ color: C.text }}>{s.overall}</td>
                  <td className="py-2"><Badge tone="success">{t("completedBadge")}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

/* ============================================================
   USER: RESULTS HISTORY (ayrı Sonuçlar ekranı)
   ============================================================ */
const ResultsHistory = ({ sessions, selfResults = [], onOpenResult, onGoCatalog, onOpenReport }) => {
  const { lang, t } = useT();
  const avg = sessions.length ? Math.round(mean(sessions.map((s) => s.overall))) : 0;
  const best = sessions.length ? Math.max(...sessions.map((s) => s.overall)) : 0;
  return (
    <div className="p-5 max-w-3xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-semibold" style={{ color: C.text }}>{t("myResults")}</h1>
        {sessions.length > 0 && onOpenReport && (
          <Button onClick={onOpenReport} className="flex items-center gap-1.5">
            <FileText size={14} /> {lang === "en" ? "Comprehensive Report" : "Kapsamlı Rapor"}
          </Button>
        )}
      </div>
      {sessions.length === 0 ? (
        <Card className="text-center py-10">
          <p style={{ color: C.textMuted }}>{t("noTestsYet")}</p>
          <Button className="mt-3" onClick={onGoCatalog}>{t("startFirst")}</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MetricCard label={t("totalTests")} value={sessions.length} />
            <MetricCard label={t("avgScore")} value={avg} tone={C.primary} />
            <MetricCard label={t("bestScore")} value={best} tone={C.success} />
          </div>
          <Card className="mb-4">
            <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>{t("progressChart")}</h3>
            <HistoryLineChart sessions={sessions} />
          </Card>
          <Card>
            <h3 className="text-sm font-medium mb-3" style={{ color: C.text }}>{t("allTests")}</h3>
            <div className="flex flex-col">
              {[...sessions].reverse().map((s) => {
                const accent = TEST_ACCENTS[s.testId] || { color: C.primary, glyph: "✦" };
                return (
                  <button key={s.id} onClick={() => onOpenResult(s)}
                    className="flex items-center justify-between py-3 border-b text-left"
                    style={{ borderColor: C.border }}>
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent.color}1F`, fontSize: 16 }}>{accent.glyph}</span>
                      <div>
                        <p className="text-sm font-medium" style={{ color: C.text }}>{s.testName}</p>
                        <p className="text-xs" style={{ color: C.textMuted }}>{new Date(s.date).toLocaleDateString(lang === "en" ? "en-US" : "tr-TR")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: accent.color }}>{s.overall}/100</span>
                      <ChevronRight size={16} style={{ color: C.textMuted }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {selfResults.length > 0 && (
        <Card className="mt-4">
          <h3 className="text-sm font-medium mb-3" style={{ color: C.text }}>{t("selfHistory")}</h3>
          <div className="flex flex-col">
            {[...selfResults].reverse().map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-3 border-b" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${r.color}1F`, fontSize: 16 }}>{r.icon}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.text }}>{r.name}</p>
                    <p className="text-xs" style={{ color: C.textMuted }}>{new Date(r.date).toLocaleDateString(lang === "en" ? "en-US" : "tr-TR")}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium text-right" style={{ background: `${r.color}1F`, color: r.color }}>
                  {r.summaryText}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

/* ============================================================
   USER: PROFILE (KVKK veri yönetimi dahil)
   ============================================================ */
const ProfileScreen = ({ sessions, plan, onGoSubscription, onLogout, onDeleteAccount, setToast }) => {
  const [legalDoc, setLegalDoc] = useState(null);
  const { lang, t } = useT();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const avg = sessions.length ? Math.round(mean(sessions.map((s) => s.overall))) : "—";
  const best = sessions.length ? Math.max(...sessions.map((s) => s.overall)) : "—";
  const planInfo = PLANS.find((p) => p.id === plan) || PLANS[0];

  const downloadData = () => {
    try {
      const payload = {
        user: { name: "Sinem", email: "user@example.com" },
        exportedAt: new Date().toISOString(),
        sessions,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "verilerim.json";
      a.click();
      URL.revokeObjectURL(url);
      setToast(lang === "en" ? "Your data was downloaded as JSON." : "Verileriniz JSON olarak indirildi.");
    } catch (e) {
      setToast(lang === "en" ? "Download is not supported in this environment." : "İndirme bu ortamda desteklenmiyor.");
    }
  };

  return (
    <div className="p-5 max-w-3xl mx-auto pb-24">
      <h1 className="text-xl font-semibold mb-4" style={{ color: C.text }}>{t("profile")}</h1>

      <Card className="mb-4 flex items-center gap-4">
        <Avatar name="Sinem" size={52} />
        <div>
          <p className="font-semibold" style={{ color: C.text }}>Sinem</p>
          <p className="text-sm" style={{ color: C.textMuted }}>user@example.com</p>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard label={t("totalTests")} value={sessions.length} />
        <MetricCard label={t("avg")} value={avg} tone={C.primary} />
        <MetricCard label={t("best")} value={best} tone={C.success} />
      </div>

      {BILLING_ENABLED && (
      <Card className="mb-4 flex items-center justify-between" style={{ borderLeft: `3px solid ${planInfo.color}` }}>
        <div>
          <p className="text-xs" style={{ color: C.textMuted }}>{t("yourSub")}</p>
          <p className="text-sm font-semibold" style={{ color: planInfo.color }}>{planInfo.name} Plan</p>
        </div>
        <Button variant="ghost" onClick={onGoSubscription}>{t("seePlans")}</Button>
      </Card>
      )}

      <Card className="mb-4">
        <h3 className="text-sm font-medium mb-3" style={{ color: C.text }}>{t("dataPrivacy")}</h3>
        <div className="flex flex-col gap-2">
          <button onClick={downloadData} className="flex items-center gap-2 text-sm py-2" style={{ color: C.text }}>
            <Download size={16} style={{ color: C.primary }} /> {t("downloadData")}
          </button>
          <button onClick={() => setLegalDoc("disclosure")} className="flex items-center gap-2 text-sm py-2" style={{ color: C.text }}>
            <Shield size={16} style={{ color: C.secondary }} /> {t("privacyText")}
          </button>
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-sm py-2" style={{ color: C.danger }}>
            <Trash2 size={16} /> {t("deleteAcc")}
          </button>
        </div>
      </Card>

      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
      <Button variant="ghost" className="w-full flex items-center justify-center gap-2" onClick={onLogout}>
        <LogOut size={16} /> {t("logout")}
      </Button>

      {confirmDelete && (
        <Modal title={lang === "en" ? "Delete Account" : "Hesabı Sil"} onClose={() => setConfirmDelete(false)}>
          <p className="text-sm mb-4" style={{ color: C.textMuted }}>
            Hesabınızı silmek istediğinizden emin misiniz? Bu işlem tüm test verilerinizi kalıcı olarak siler ve geri alınamaz.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>Vazgeç</Button>
            <Button className="flex-1" style={{ background: C.danger }} onClick={() => { setConfirmDelete(false); onDeleteAccount(); }}>{lang === "en" ? "Yes, Delete" : "Evet, Sil"}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ============================================================
   USER: SUBSCRIPTION PLANS (spec md. 40 — ödeme mock)
   ============================================================ */
const PLANS = [
  { id: "FREE", name: "Free", price: "₺0", period: "", color: "#6B7280", features: { tr: ["1 test hakkı", "Temel sonuç ekranı"], en: ["1 test credit", "Basic results screen"] } },
  { id: "PRO", name: "Pro", price: "₺149", period: { tr: "/ay", en: "/mo" }, color: "#5B5CE2", popular: true, features: { tr: ["Sınırsız test", "Detaylı analiz grafikleri", "Gelişim takibi"], en: ["Unlimited tests", "Detailed analytics charts", "Progress tracking"] } },
  { id: "EXPERT", name: "Expert", price: "₺349", period: { tr: "/ay", en: "/mo" }, color: "#8B5CF6", features: { tr: ["Pro'daki her şey", "Danışan yönetimi", "Test atama", "PDF raporlar"], en: ["Everything in Pro", "Client management", "Test assignment", "PDF reports"] } },
  { id: "ENTERPRISE", name: "Enterprise", price: { tr: "Özel", en: "Custom" }, period: "", color: "#EC4899", features: { tr: ["Expert'teki her şey", "Gelişmiş analitik", "Kurumsal destek", "API erişimi"], en: ["Everything in Expert", "Advanced analytics", "Enterprise support", "API access"] } },
];

const SubscriptionScreen = ({ plan, setPlan, setToast, addNotification, onBack }) => {
  const { lang, t } = useT();
  const [confirmPlan, setConfirmPlan] = useState(null);
  const upgrade = (p) => {
    setPlan(p.id);
    setToast(lang === "en" ? `Switched to the ${p.name} plan.` : `${p.name} planına geçiş yapıldı.`);
    addNotification(lang === "en" ? `Your subscription was upgraded to ${p.name}.` : `Aboneliğiniz ${p.name} planına yükseltildi.`);
    setConfirmPlan(null);
  };
  return (
    <div className="p-5 max-w-4xl mx-auto pb-24">
      <button onClick={onBack} className="text-xs flex items-center gap-1 mb-3" style={{ color: C.textMuted }}><ArrowLeft size={14} />{t("backToProfile")}</button>
      <h1 className="text-xl font-semibold mb-1" style={{ color: C.text }}>{t("subTitle")}</h1>
      <p className="text-sm mb-5" style={{ color: C.textMuted }}>{t("subDesc")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PLANS.map((p) => {
          const current = plan === p.id;
          return (
            <Card
              key={p.id}
              className="flex flex-col relative"
              style={{ borderTop: `3px solid ${p.color}`, ...(p.popular ? { boxShadow: `0 8px 24px ${p.color}33` } : {}) }}
            >
              {p.popular && (
                <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-white text-xs font-medium" style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.accent1})` }}>
                  {lang === "en" ? "Popular" : "Popüler"}
                </span>
              )}
              <span className="text-sm font-semibold mb-1" style={{ color: p.color }}>{p.name}</span>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold" style={{ color: C.text }}>{L(p.price, lang)}</span>
                <span className="text-xs" style={{ color: C.textMuted }}>{L(p.period, lang)}</span>
              </div>
              <div className="flex flex-col gap-1.5 mb-4 flex-1">
                {L(p.features, lang).map((f) => (
                  <span key={f} className="flex items-start gap-1.5 text-xs" style={{ color: C.textMuted }}>
                    <Check size={13} style={{ color: p.color, marginTop: 1 }} className="flex-shrink-0" /> {f}
                  </span>
                ))}
              </div>
              {current ? (
                <Badge tone="success">{t("currentPlan")}</Badge>
              ) : p.id === "ENTERPRISE" ? (
                <Button variant="ghost" className="w-full" onClick={() => setToast(lang === "en" ? "Contact our sales team for enterprise plans." : "Kurumsal planlar için satış ekibiyle iletişime geçin.")}>{t("contactUs")}</Button>
              ) : (
                <Button className="w-full" style={{ background: `linear-gradient(135deg, ${p.color}, ${C.accent1})` }} onClick={() => setConfirmPlan(p)}>{t("choosePlan")}</Button>
              )}
            </Card>
          );
        })}
      </div>

      {confirmPlan && (
        <Modal title={lang === "en" ? `Switch to ${confirmPlan.name}` : `${confirmPlan.name} Planına Geç`} onClose={() => setConfirmPlan(null)}>
          <p className="text-sm mb-2" style={{ color: C.textMuted }}>
            {lang === "en" ? <>You are about to switch to the <b style={{ color: C.text }}>{confirmPlan.name}</b> plan for {L(confirmPlan.price, lang)}{L(confirmPlan.period, lang)}.</> : <>{L(confirmPlan.price, lang)}{L(confirmPlan.period, lang)} karşılığında <b style={{ color: C.text }}>{confirmPlan.name}</b> planına geçmek üzeresiniz.</>}
          </p>
          <p className="text-xs mb-4" style={{ color: C.textMuted }}>
            {lang === "en" ? "Payment integration will be active in production; the switch is simulated for now." : "Ödeme entegrasyonu üretim ortamında aktif olacaktır; şu an geçiş simüle edilir."}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmPlan(null)}>Vazgeç</Button>
            <Button className="flex-1" onClick={() => upgrade(confirmPlan)}>Onayla</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ============================================================
   HIZLI OKUMA EĞİTİMİ — içerik ve egzersizler
   ============================================================ */
const TRAINING_TIPS = [
  { icon: "🔇", title: { tr: "İç seslendirmeyi azaltın", en: "Reduce subvocalization" }, text: { tr: "Kelimeleri zihninizde tek tek seslendirmek hızı sınırlar. Kelime gruplarını görüntü olarak algılamaya çalışın.", en: "Sounding out each word in your head limits speed. Try to perceive word groups as images." } },
  { icon: "🧩", title: { tr: "Blok halinde okuyun", en: "Read in blocks" }, text: { tr: "Gözünüz her satırda 2-3 durakta ilerlesin; tek tek kelime yerine kelime gruplarını yakalayın.", en: "Let your eyes make 2-3 stops per line; catch word groups instead of single words." } },
  { icon: "↩️", title: { tr: "Geri sıçramaları önleyin", en: "Prevent regressions" }, text: { tr: "Okuduğunuz yere geri dönmek en yaygın hız kaybıdır. Ritim tutmak geri dönüşleri azaltır.", en: "Jumping back to what you've read is the most common speed loss. Keeping a rhythm reduces regressions." } },
  { icon: "👁️", title: { tr: "Görüş alanınızı genişletin", en: "Widen your field of view" }, text: { tr: "Çevresel görüş geliştikçe tek bakışta daha fazla kelime algılarsınız. Schulte tablosu bunun için idealdir.", en: "As peripheral vision improves, you perceive more words at a glance. The Schulte table is ideal for this." } },
];

const FLASH_WORDS_EN = ["pencil", "book", "ocean", "sunny", "forest", "moment", "star", "light", "spirit", "morning", "travel", "focus", "cloud", "river", "garden", "breeze", "earth", "shadow", "silent", "bright", "depth", "quick", "steady", "distant"];
const FLASH_WORDS = ["kalem", "kitap", "deniz", "güneş", "orman", "zaman", "yıldız", "bilgi", "hayat", "sabah", "yolcu", "dikkat", "bulut", "nehir", "bahçe", "rüzgar", "toprak", "gölge", "sessiz", "parlak", "derin", "hızlı", "yavaş", "uzak"];

const READING_TEXTS = [
  {
    id: "r1",
    title: "Beynin Uyum Gücü",
    category: "Bilim", level: "Kolay",
    words: "İnsan beyni yaşam boyu değişebilen esnek bir yapıya sahiptir. Düzenli zihinsel egzersiz yapan kişilerde dikkat süresi uzar ve bilgiyi işleme hızı artar. Hızlı okuma çalışmaları da bu esnekliği kullanır: göz kasları yeni harekete alışır, görüş alanı genişler ve zihin kelime gruplarını tek bakışta algılamayı öğrenir. Sabırlı ve düzenli pratik, birkaç hafta içinde fark edilir bir gelişim sağlar.".split(" "),
    questions: [
      { q: "Metne göre hızlı okuma çalışmaları neyi kullanır?", options: ["Beynin esnekliğini", "Sesli okumayı", "Ezber tekniklerini", "Hafıza oyunlarını"], answer: 0 },
      { q: "Gelişim için ne önerilmektedir?", options: ["Tek seferde uzun çalışma", "Sabırlı ve düzenli pratik", "Sadece kitap okumak", "Hızlı yazma egzersizi"], answer: 1 },
    ],
  },
  {
    id: "r2",
    title: "Odaklanmanın Değeri",
    category: "Kişisel Gelişim", level: "Kolay",
    words: "Dikkat sınırlı bir kaynaktır ve nereye yönlendirildiği sonucu belirler. Bildirimlerin sürekli böldüğü bir ortamda okumak, anlamayı belirgin biçimde düşürür. Kısa ama kesintisiz okuma blokları, uzun fakat bölünmüş oturumlardan çok daha verimlidir. Hızlı okuma yalnızca göz hareketi değil, aynı zamanda bir odak disiplinidir: zihin metinde kaldığı sürece hız ve anlama birlikte yükselir.".split(" "),
    questions: [
      { q: "Metne göre verimli okuma nasıl olur?", options: ["Uzun ve bölünmüş oturumlarla", "Kısa ama kesintisiz bloklarla", "Sesli tekrar ederek", "Not almadan"], answer: 1 },
      { q: "Hızlı okuma aynı zamanda nedir?", options: ["Bir ezber yöntemi", "Bir yazma tekniği", "Bir odak disiplini", "Bir dinleme becerisi"], answer: 2 },
    ],
  },
  {
    id: "r3",
    title: "Okuyan Beyin",
    category: "Bilim", level: "Orta",
    words: "Okuma, insan beyninin doğuştan bilmediği, sonradan öğrendiği en karmaşık becerilerden biridir. Gözlerimiz satır boyunca akıcı biçimde kayıyor gibi görünse de gerçekte kısa sıçramalarla ilerler ve her duraklamada birkaç kelimeyi birden yakalar. Deneyimli okuyucular bu duraklamaları azaltır, tek bakışta daha geniş bir alanı algılar ve gereksiz geri dönüşlerden kaçınır. Anlama ise hızın düşmanı değil, yol arkadaşıdır: zihin metnin akışına odaklandığında hız ve kavrama birlikte gelişir. Araştırmalar, düzenli okuma alışkanlığının kelime dağarcığını genişlettiğini, dikkat süresini uzattığını ve düşünme esnekliğini desteklediğini göstermektedir. Bu nedenle hızlı okuma çalışmalarının amacı yalnızca daha çok sayfa bitirmek değil, aynı sürede daha fazlasını gerçekten anlamaktır. Küçük ama düzenli adımlar, birkaç hafta içinde hem hızda hem de kavrayışta fark edilir bir gelişim sağlar.".split(" "),
    questions: [
      { q: "Metne göre gözler okuma sırasında nasıl hareket eder?", options: ["Kesintisiz ve akıcı kayarak", "Kısa sıçramalar ve duraklamalarla", "Sürekli geri dönerek", "Yalnızca satır başlarında durarak"], answer: 1 },
      { q: "Metne göre anlama ile hız arasındaki ilişki nedir?", options: ["Anlama hızın düşmanıdır", "Hız arttıkça anlama mutlaka düşer", "Odaklanınca hız ve kavrama birlikte gelişir", "Anlama yalnızca yavaş okumayla mümkündür"], answer: 2 },
      { q: "Hızlı okuma çalışmalarının asıl amacı nedir?", options: ["Daha çok sayfa bitirmek", "Göz kaslarını yormak", "Aynı sürede daha fazlasını anlamak", "Kelimeleri atlayarak okumak"], answer: 2 },
    ],
  },
  {
    id: "r4",
    title: "Uykunun Görevi",
    category: "Bilim", level: "Orta",
    words: "Uyku, günün yalnızca pasif bir molası değildir. Beyin, uykunun derin evrelerinde gün içinde öğrenilen bilgileri yeniden oynatır ve kalıcı hafızaya taşır; bu sürece pekiştirme adı verilir. Yeterince uyumayan bir öğrencinin, aynı konuya daha fazla saat çalışan ama dinlenmiş bir akranından daha düşük performans göstermesi bu yüzden şaşırtıcı değildir. Araştırmacılar ayrıca uykunun, gün boyunca biriken zihinsel yorgunluğun temizlenmesine yardımcı olduğunu düşünmektedir. Kısacası verimli bir öğrenme planı, çalışma saatleri kadar uyku saatlerini de ciddiye almak zorundadır.".split(" "),
    questions: [
      { q: "Metne göre 'pekiştirme' nedir?", options: ["Ders tekrarı yapmak", "Öğrenilen bilgilerin uykuda kalıcı hafızaya taşınması", "Not tutma tekniği", "Kısa molalar vermek"], answer: 1 },
      { q: "Verimli bir öğrenme planı neyi ciddiye almalıdır?", options: ["Sadece çalışma saatlerini", "Sadece beslenmeyi", "Uyku saatlerini de", "Sadece ders notlarını"], answer: 2 },
    ],
  },
  {
    id: "r5",
    title: "Arıların Dansı",
    category: "Doğa", level: "Orta",
    words: "Bal arıları, buldukları besin kaynağının yerini kovandaki arkadaşlarına şaşırtıcı bir yöntemle anlatır: dans ederek. Sallanma dansı adı verilen bu harekette arının izlediği açı, güneşe göre gidilecek yönü; dansın süresi ise uzaklığı bildirir. Böylece tek bir kâşif arı, yüzlerce işçiyi hiç görmedikleri bir çiçek tarlasına yönlendirebilir. Bilim insanları bu sistemi, insan dili dışındaki en karmaşık iletişim biçimlerinden biri olarak kabul eder. Küçücük bir beynin böylesine hassas bir bilgi aktarımı başarması, doğanın zekâ tanımımızı sürekli genişlettiğini hatırlatır.".split(" "),
    questions: [
      { q: "Sallanma dansında arının izlediği açı neyi bildirir?", options: ["Çiçeğin rengini", "Güneşe göre gidilecek yönü", "Kovanın sıcaklığını", "Arı sayısını"], answer: 1 },
      { q: "Dansın süresi neyi bildirir?", options: ["Besinin tadını", "Havanın durumunu", "Kaynağın uzaklığını", "Günün saatini"], answer: 2 },
    ],
  },
  {
    id: "r6",
    title: "Yazının Doğuşu",
    category: "Tarih", level: "Zor",
    words: "Yazı, insanlık tarihinin en dönüştürücü buluşlarından biridir ve doğuşu şiirle değil muhasebeyle olmuştur. Yaklaşık beş bin yıl önce Mezopotamya'da yaşayan Sümerler, tapınak ambarlarındaki tahıl, hayvan ve kumaş kayıtlarını tutabilmek için kil tabletlere işaretler kazımaya başladı. Zamanla bu işaretler sadeleşti ve çivi yazısı adı verilen sisteme dönüştü. Başlangıçta yalnızca sayım için kullanılan semboller, yüzyıllar içinde sözleşmeleri, yasaları, mektupları ve nihayet destanları kaydedebilecek esnekliğe ulaştı. Yazının icadı, bilginin kuşaklar arasında bozulmadan aktarılmasını mümkün kılarak hafızayı bireyin ömründen bağımsız hale getirdi. Bugün okuduğumuz her satır, kil tablete vurulan o ilk işaretin uzak bir yankısıdır.".split(" "),
    questions: [
      { q: "Metne göre yazı ilk olarak hangi ihtiyaçtan doğmuştur?", options: ["Destan yazmak", "Kayıt ve sayım tutmak", "Mektuplaşmak", "Yasa yapmak"], answer: 1 },
      { q: "Çivi yazısını hangi toplum geliştirmiştir?", options: ["Mısırlılar", "Hititler", "Sümerler", "Fenikeliler"], answer: 2 },
      { q: "Yazının icadı neyi mümkün kılmıştır?", options: ["Tarımın başlamasını", "Bilginin kuşaklar arasında aktarılmasını", "Şehirlerin kurulmasını", "Ticaretin bitmesini"], answer: 1 },
    ],
  },
  {
    id: "r7",
    title: "Hareketin Beyne Etkisi",
    category: "Bilim", level: "Kolay",
    words: "Düzenli hareket yalnızca kasları değil beyni de güçlendirir. Yürüyüş gibi hafif tempolu bir egzersiz bile beyne giden kan akışını artırır, dikkat ve öğrenmeyle ilgili bölgeleri canlandırır. Araştırmalar, ders veya çalışma öncesi yapılan kısa yürüyüşlerin odaklanmayı belirgin biçimde desteklediğini göstermektedir. Üstelik bunun için maratona gerek yoktur; günde yirmi dakikalık tempolu bir yürüyüş, zihinsel tazelik için güçlü bir başlangıçtır.".split(" "),
    questions: [
      { q: "Hafif tempolu egzersiz beyinde neyi artırır?", options: ["Kas kütlesini", "Kan akışını", "Uyku süresini", "İştahı"], answer: 1 },
      { q: "Metne göre odaklanmayı desteklemek için ne yeterlidir?", options: ["Maraton koşmak", "Ağır antrenman", "Kısa tempolu yürüyüş", "Uzun uyku"], answer: 2 },
    ],
  },
  {
    id: "r8",
    title: "Küçük Alışkanlıkların Gücü",
    category: "Kişisel Gelişim", level: "Kolay",
    words: "Büyük hedefler çoğu zaman büyük adımlarla değil, küçük ama tekrarlanan alışkanlıklarla gerçekleşir. Günde on dakikalık okuma, yılda binlerce sayfaya; her sabah yazılan üç cümle, zamanla bir güncenin tamamına dönüşür. Alışkanlık oluşturmanın sırrı iradeyi zorlamak değil, başlangıcı kolaylaştırmaktır: kitabı yastığın yanına koymak, spor ayakkabıyı kapının önüne bırakmak gibi. Davranış küçüldükçe direnç azalır; direnç azaldıkça süreklilik gelir. Süreklilik ise yeteneğin sessiz mimarıdır.".split(" "),
    questions: [
      { q: "Metne göre alışkanlık oluşturmanın sırrı nedir?", options: ["İradeyi zorlamak", "Başlangıcı kolaylaştırmak", "Büyük hedefler koymak", "Ödül vermek"], answer: 1 },
      { q: "Metne göre 'yeteneğin sessiz mimarı' nedir?", options: ["Yetenek", "Şans", "Süreklilik", "Motivasyon"], answer: 2 },
    ],
  },
  {
    id: "r9",
    title: "Kayıp Şemsiye",
    category: "Hikâye", level: "Kolay", lib: "cocuk",
    words: "Ela sabah okula giderken gökyüzü kapkaraydı. Annesi ona sarı şemsiyesini verdi. Teneffüste yağmur başladı ama Ela şemsiyesini bulamadı. Sınıfı, koridoru, hatta yemekhaneyi aradı. Sonunda şemsiyesini kapının yanında, küçük bir kedinin üzerinde buldu. Kedi yağmurdan korunmak için oraya sığınmıştı. Ela güldü ve eve dönerken şemsiyeyi ikisinin de üstünü örtecek şekilde tuttu. O gün Ela, paylaşmanın insanı yağmurdan bile daha çok ısıttığını öğrendi.".split(" "),
    questions: [
      { q: "Ela şemsiyesini nerede buldu?", options: ["Sınıfta", "Yemekhanede", "Kapının yanında, kedinin üzerinde", "Bahçede"], answer: 2 },
      { q: "Ela o gün ne öğrendi?", options: ["Yağmurda koşmayı", "Paylaşmanın güzelliğini", "Kedi beslemeyi", "Erken kalkmayı"], answer: 1 },
    ],
  },
  {
    id: "r10",
    title: "Karıncaların Şehri",
    category: "Doğa", level: "Kolay", lib: "cocuk",
    words: "Bahçedeki küçük toprak yığını aslında kocaman bir şehirdir. Karıncalar yerin altında odalar, yollar ve depolar kazar. Kimi karınca yiyecek taşır, kimi yavrulara bakar, kimi de yuvayı korur. Herkesin bir görevi vardır ve kimse işini bırakmaz. Bir karınca kendi ağırlığından kat kat ağır yükleri taşıyabilir. Bu minik canlılar bize birlikte çalışmanın gücünü gösterir: küçük adımlar bir araya gelince büyük işler başarılır.".split(" "),
    questions: [
      { q: "Karınca yuvasında neler bulunur?", options: ["Sadece yiyecek", "Odalar, yollar ve depolar", "Sadece yumurtalar", "Su birikintileri"], answer: 1 },
      { q: "Karıncalar bize neyi gösterir?", options: ["Hızlı koşmayı", "Yalnız çalışmayı", "Birlikte çalışmanın gücünü", "Uyumanın önemini"], answer: 2 },
    ],
  },
  {
    id: "r11",
    title: "Ayın Yüzü",
    category: "Bilim", level: "Kolay", lib: "cocuk",
    words: "Geceleri gökyüzünde parlayan Ay, aslında kendi ışığını üretmez; Güneş'ten aldığı ışığı yansıtır. Ay, Dünya'nın çevresinde yaklaşık bir ayda dolanır. Bu yolculuk sırasında Güneş ışığını farklı açılardan aldığı için bazen incecik bir hilal, bazen de kocaman bir dolunay olarak görünür. Ay'ın üzerindeki koyu lekeler ise çok eski volkanların bıraktığı geniş düzlüklerdir. Yani her gece baktığımız o parlak yüz, bize uzayın sessiz bir hikâyesini anlatır.".split(" "),
    questions: [
      { q: "Ay'ın ışığı nereden gelir?", options: ["Kendisi üretir", "Yıldızlardan toplar", "Güneş'ten yansır", "Dünya'dan gider"], answer: 2 },
      { q: "Ay'daki koyu lekeler nedir?", options: ["Denizler", "Eski volkanların bıraktığı düzlükler", "Bulutlar", "Ormanlar"], answer: 1 },
    ],
  },
  {
    id: "r12",
    title: "Bisiklet Günü",
    category: "Hikâye", level: "Kolay", lib: "cocuk",
    words: "Deniz, bisiklet sürmeyi öğrenmek için haftalarca uğraştı. İlk gün üç kez düştü ve vazgeçmek istedi. Babası ona 'Düşmek, öğrenmenin bir parçasıdır' dedi. Deniz her gün biraz daha uzun süre dengede kaldı. Bir sabah, farkında bile olmadan bahçenin sonuna kadar hiç düşmeden sürdüğünü gördü. Sevinçle bağırdı. O günden sonra Deniz zor bir işle karşılaştığında hep aynı cümleyi hatırladı: denemeye devam edersen, bir sabah başarmış olursun.".split(" "),
    questions: [
      { q: "Babası Deniz'e ne söyledi?", options: ["Bisikleti bırakmasını", "Düşmenin öğrenmenin parçası olduğunu", "Daha hızlı sürmesini", "Kask takmasını"], answer: 1 },
      { q: "Hikâyenin ana fikri nedir?", options: ["Bisiklet tehlikelidir", "Denemeye devam etmek başarı getirir", "Bahçede oynamak eğlencelidir", "Sabah erken kalkmak gerekir"], answer: 1 },
    ],
  },
  {
    id: "en1",
    title: "The Reading Brain",
    category: "Science", level: "Medium", lang: "en",
    words: "Reading is one of the most complex skills the human brain ever learns, and it is not something we are born knowing. Although our eyes seem to glide smoothly along a line of text, they actually move in short jumps, capturing several words during each brief pause. Skilled readers make fewer pauses, take in a wider span of text at a single glance, and avoid unnecessary backtracking. Comprehension is not the enemy of speed but its companion: when the mind stays focused on the flow of the text, speed and understanding improve together. Research shows that regular reading expands vocabulary, lengthens attention span and supports flexible thinking. The goal of speed reading practice, then, is not simply to finish more pages, but to truly understand more in the same amount of time.".split(" "),
    questions: [
      { q: "According to the text, how do the eyes move while reading?", options: ["In one smooth glide", "In short jumps with brief pauses", "Constantly moving backwards", "Only stopping at line breaks"], answer: 1 },
      { q: "What is the relationship between comprehension and speed?", options: ["They are enemies", "Speed always reduces comprehension", "They improve together when focused", "Comprehension requires slow reading"], answer: 2 },
      { q: "What is the real goal of speed reading practice?", options: ["Finishing more pages", "Tiring the eye muscles", "Understanding more in the same time", "Skipping words"], answer: 2 },
    ],
  },
  {
    id: "en2",
    title: "The Power of Small Habits",
    category: "Personal Growth", level: "Easy", lang: "en",
    words: "Big goals are rarely achieved through big leaps; they grow out of small, repeated habits. Ten minutes of reading a day adds up to thousands of pages a year, and three sentences written every morning slowly become a complete journal. The secret of building a habit is not forcing willpower but making the start easier: placing the book next to your pillow, or leaving your running shoes by the door. As the behaviour gets smaller, resistance shrinks; as resistance shrinks, consistency grows. And consistency is the quiet architect of talent.".split(" "),
    questions: [
      { q: "According to the text, what is the secret of building a habit?", options: ["Forcing willpower", "Making the start easier", "Setting bigger goals", "Rewarding yourself"], answer: 1 },
      { q: "What does the text call 'the quiet architect of talent'?", options: ["Talent", "Luck", "Consistency", "Motivation"], answer: 2 },
    ],
  },
];

/* --- Metin Kütüphanesi (okuma egzersizleri için metin seçimi) --- */
const TEXT_LEVEL_COLORS = { Kolay: "#22C55E", Orta: "#F59E0B", Zor: "#EF4444", Easy: "#22C55E", Medium: "#F59E0B", Hard: "#EF4444" };
const LIBRARIES = [
  { id: "genel", label: { tr: "Genel Kütüphane", en: "General Library" }, icon: "📚" },
  { id: "cocuk", label: { tr: "Çocuk Kütüphanesi", en: "Kids Library" }, icon: "🧒" },
];
const libOf = (t) => t.lib || "genel";

const TextPicker = ({ accent, onPick, onBack, defaultLib }) => {
  const { lang, t: tt } = useT();
  const [lib, setLib] = useState(defaultLib || "genel");
  const penguBubble = lib === "cocuk"
    ? { tr: "Bugün hangi hikâyeyi okuyalım? 📖", en: "Which story shall we read today? 📖" }
    : { tr: "Bugün ne okuyalım? 📖", en: "What shall we read today? 📖" };
  const byLang = READING_TEXTS.filter((x) => libOf(x) === lib && (x.lang || "tr") === lang);
  const texts = byLang.length ? byLang : READING_TEXTS.filter((x) => libOf(x) === lib && (x.lang || "tr") === "tr");
  const cats = [...new Set(texts.map((t) => t.category))];
  return (
    <div className="min-h-full p-6" style={{ background: C.bg }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-3">
          <PenguMascot state="idle" size={84} bubble={penguBubble} />
        </div>
        <button onClick={onBack} className="text-xs flex items-center gap-1 mb-3" style={{ color: C.textMuted }}>
          <ArrowLeft size={14} /> Geri
        </button>
        <h2 className="text-lg font-semibold mb-1" style={{ color: C.text }}>📚 {tt("libraryTitle")}</h2>
        <p className="text-xs mb-4" style={{ color: C.textMuted }}>
          {tt("pickText")}
        </p>
        <div className="flex gap-2 mb-5">
          {LIBRARIES.map((l) => {
            const count = READING_TEXTS.filter((t) => libOf(t) === l.id).length;
            return (
              <button key={l.id} onClick={() => setLib(l.id)}
                className="px-3.5 py-2 rounded-full text-xs font-semibold kg-btn-pop"
                style={lib === l.id
                  ? { background: `linear-gradient(135deg, ${accent || C.primary}, ${C.accent1})`, color: "#fff" }
                  : { background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted }}>
                {l.icon} {L(l.label, lang)} ({count})
              </button>
            );
          })}
        </div>
        {cats.map((cat) => (
          <div key={cat} className="mb-5">
            <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>{cat}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {texts.filter((t) => t.category === cat).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onPick(t)}
                  className="text-left rounded-2xl p-4 kg-card-hover kg-btn-pop"
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${accent || C.primary}` }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: C.text }}>{t.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0" style={{ background: `${TEXT_LEVEL_COLORS[t.level]}1F`, color: TEXT_LEVEL_COLORS[t.level] }}>
                      {t.level}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: C.textMuted }}>{t.words.length} {tt("words")} · {t.questions.length} {tt("compQ")}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* --- Bağımsız Kütüphane ekranı (oku + bu metinle egzersiz başlat) --- */
const LibraryScreen = ({ ageGroup, onBack, onStartExercise }) => {
  const { lang } = useT();
  const [selected, setSelected] = useState(null);
  const defaultLib = ageGroup && (ageGroup.id === "6-9" || ageGroup.id === "10-13") ? "cocuk" : "genel";

  if (!selected) {
    return <TextPicker accent={C.primary} defaultLib={defaultLib} onBack={onBack} onPick={(t) => setSelected(t)} />;
  }

  const EX_OPTIONS = [
    { id: "reading-test", label: lang === "en" ? "⏱️ Reading Speed Test" : "⏱️ Okuma Hızı Testi" },
    { id: "block-reading", label: lang === "en" ? "📚 Block Reading" : "📚 Blok Okuma" },
    { id: "rsvp", label: lang === "en" ? "📖 Speed Reading (RSVP)" : "📖 Hızlı Okuma (RSVP)" },
  ];

  return (
    <div className="min-h-full p-6" style={{ background: C.bg }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setSelected(null)} className="text-xs flex items-center gap-1 mb-3" style={{ color: C.textMuted }}>
          <ArrowLeft size={14} /> Kütüphaneye Dön
        </button>
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <h2 className="text-lg font-semibold" style={{ color: C.text }}>{selected.title}</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${TEXT_LEVEL_COLORS[selected.level]}1F`, color: TEXT_LEVEL_COLORS[selected.level] }}>
            {selected.level}
          </span>
        </div>
        <p className="text-xs mb-4" style={{ color: C.textMuted }}>
          {selected.category} · {selected.words.length} {lang === "en" ? "words" : "kelime"} · {L(LIBRARIES.find((l) => l.id === libOf(selected))?.label, lang)}
        </p>
        <Card className="mb-4">
          <p className="text-base leading-8" style={{ color: C.text }}>{selected.words.join(" ")}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium mb-3" style={{ color: C.text }}>Bu metinle çalış</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {EX_OPTIONS.map((e) => (
              <Button key={e.id} className="w-full" onClick={() => onStartExercise(e.id, selected)}>{e.label}</Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

/* Yaş < 10 için oyunlaştırılmış egzersiz temaları */
const KID_CATALOG = {
  "eye":           { icon: "🦉", color: "#FF6B35", name: { tr: "Baykuşun Bakışları",  en: "Owl Eyes"          }, desc: { tr: "Hedefi gözlerinle takip et — baykuş gibi keskin bak!", en: "Follow the target — sharp like an owl!" } },
  "growshape":     { icon: "🫧", color: "#22D3EE", name: { tr: "Büyüyen Baloncuklar", en: "Growing Bubbles"    }, desc: { tr: "Ortadan büyüyen baloncuğun kenarını gözlerinle izle!", en: "Follow the edge of the growing bubble!" } },
  "benzer":        { icon: "🐾", color: "#A855F7", name: { tr: "Farklı Pati Bul",     en: "Odd Paw Out"        }, desc: { tr: "Bir kelime farklı — hangisi? Hızlıca seç!", en: "One word is different — pick it fast!" } },
  "oddeven":       { icon: "🌟", color: "#F59E0B", name: { tr: "Tek mi Çift mi?",     en: "Odd or Even?"       }, desc: { tr: "Yıldız sayısı tek mi çift mi? Hızla söyle!", en: "Is the star count odd or even? Quick!" } },
  "schulte":       { icon: "🎈", color: "#5B5CE2", name: { tr: "Balon Sayı Avı",      en: "Balloon Number Hunt"}, desc: { tr: "1'den 25'e baloncuklara sırayla dokun!", en: "Tap the balloons 1 to 25 in order!" } },
  "flash":         { icon: "⚡", color: "#F97316", name: { tr: "Kelime Şimşeği",      en: "Word Lightning"     }, desc: { tr: "Bir kelime şimşek gibi geçecek — gördüğünü seç!", en: "A word flashes by — pick what you saw!" } },
  "match":         { icon: "🐣", color: "#10B981", name: { tr: "Hayvan Eşleştirme",  en: "Animal Match"       }, desc: { tr: "Aynı hayvanları eşleştir — en az hamlede bitir!", en: "Match the animals in as few moves!" } },
  "peripheral":    { icon: "🎯", color: "#EC4899", name: { tr: "Kenar Sayı Yakalama", en: "Edge Number Catch"  }, desc: { tr: "Ortaya bak — kenarlardaki sayıları topla!", en: "Look at the center — add the edge numbers!" } },
  "arithmetic":    { icon: "🍕", color: "#EF4444", name: { tr: "Pizza Matematik",     en: "Pizza Math"         }, desc: { tr: "Pizzaları, elmaları say — doğru cevabı seç!", en: "Count the pizzas and fruits — pick the answer!" } },
  "synonym":       { icon: "🦊", color: "#F97316", name: { tr: "Tilkinin Kelime Oyunu",en: "Fox Word Game"     }, desc: { tr: "Aynı anlamlı kelimeyi bul!", en: "Find the word that means the same!" } },
  "number-memory": { icon: "🐘", color: "#6366F1", name: { tr: "Fil Hafızası",        en: "Elephant Memory"    }, desc: { tr: "Filler hiç unutmaz! Sen de sayıları aklında tut.", en: "Elephants never forget! Remember the numbers." } },
  "pattern":       { icon: "🧩", color: "#0EA5E9", name: { tr: "Bulmaca Tamamla",     en: "Finish the Puzzle"  }, desc: { tr: "Şekil kuralını bul, eksik parçayı tamamla!", en: "Find the shape rule and complete the puzzle!" } },
  "block-reading": { icon: "📖", color: "#84CC16", name: { tr: "Parlayan Kelime Treni",en: "Glowing Word Train" }, desc: { tr: "Parlayan kelime trenini takip ederek oku!", en: "Read along the glowing word train!" } },
  "rsvp":          { icon: "🚀", color: "#00B8A9", name: { tr: "Uçan Kelimeler",      en: "Flying Words"       }, desc: { tr: "Kelimeler uçarak geçecek — hepsini yakala!", en: "Words fly past — catch them all!" } },
  "reading-test":  { icon: "⏱️", color: "#F43F5E", name: { tr: "Okuma Yarışı",        en: "Reading Race"       }, desc: { tr: "Metni oku ve sorulara cevap ver — ne kadar hızlısın?", en: "Read and answer — how fast are you?" } },
};

/* ============================================================
   NOVA-CORE — Enerji Çekirdeği (yıldız amblemi)
   Soyut marka elementi: yükleme, logo, kutlama. Her yaş için uygun.
   ============================================================ */
const NovaCore = ({ size = 56, spinning = true }) => (
  <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
    {spinning && (
      <svg width={size} height={size} viewBox="-30 -30 60 60" style={{ position: "absolute", inset: 0, animation: "core-orbit 3.4s linear infinite" }} aria-hidden="true">
        <circle cx="0" cy="-24" r="2.2" fill="#7C6FF0" opacity="0.9" />
        <circle cx="21" cy="12" r="1.7" fill="#57C9FF" opacity="0.75" />
        <circle cx="-21" cy="12" r="1.4" fill="#EC6FD8" opacity="0.6" />
      </svg>
    )}
    <svg width={size} height={size} viewBox="-30 -30 60 60" style={{ position: "absolute", inset: 0, animation: "core-pulse 1.9s ease-in-out infinite" }} aria-hidden="true">
      <path d="M 0 -18 C 3 -6 6 -3 18 0 C 6 3 3 6 0 18 C -3 6 -6 3 -18 0 C -6 -3 -3 -6 0 -18 Z" fill="url(#coreGrad)" />
      <circle cx="0" cy="0" r="3.4" fill="#FFFFFF" opacity="0.95" />
      <defs>
        <linearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B7DFF" />
          <stop offset="55%" stopColor="#5B5CE2" />
          <stop offset="100%" stopColor="#4749C4" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

/* ============================================================
   PENGU — özgün penguen maskot (animasyonlu SVG)
   Durumlar: idle · greet · thinking · celebrate · encourage
   Yalnızca 6-9 yaş modunda görünür (dozaj kuralı).
   ============================================================ */
const PenguMascot = ({ state = "idle", size = 96, bubble = null, className = "" }) => {
  const { lang } = useT();
  const bodyAnim =
    state === "celebrate" ? "pengu-bounce 0.95s ease infinite" :
    state === "greet"     ? "pengu-waddle 1.6s ease-in-out infinite" :
    state === "thinking"  ? "pengu-tilt 2.8s ease-in-out infinite" :
                            "pengu-bob 3s ease-in-out infinite";
  const mouth =
    state === "celebrate" ? "M 60 74 Q 70 84 80 74" :
    state === "encourage" ? "M 62 77 Q 70 80 78 77" :
                            "M 62 75 Q 70 81 78 75";
  const eyeR = state === "thinking" ? 2.8 : 3.6;
  const leftWingAnim = (state === "greet" || state === "celebrate")
    ? { animation: "pengu-wave 1.1s ease-in-out infinite", transformOrigin: "38px 80px" } : {};
  const rightWingAnim = state === "celebrate"
    ? { animation: "pengu-wave 1.1s 0.12s ease-in-out infinite reverse", transformOrigin: "102px 80px" } : {};
  return (
    <div className={`inline-flex flex-col items-center ${className}`} style={{ lineHeight: 1 }}>
      {bubble && (
        <div className="px-3 py-1.5 rounded-2xl text-xs font-medium mb-1.5"
          style={{ background: C.surface, color: C.text, border: `1.5px solid ${C.border}`, boxShadow: "0 2px 10px rgba(23,25,35,0.08)", maxWidth: 200, animation: "kg-pop 0.35s ease" }}>
          {typeof bubble === "object" ? L(bubble, lang) : bubble}
        </div>
      )}
      <svg width={size} height={size} viewBox="10 6 120 130" style={{ animation: bodyAnim, transformOrigin: "50% 85%", overflow: "visible" }} aria-hidden="true">
        {state === "celebrate" && (
          <g>
            <circle cx="26" cy="40" r="2.6" fill="#F6C94A" style={{ animation: "pengu-spark 1s ease-out infinite" }} />
            <circle cx="114" cy="34" r="2.2" fill={C.secondary} style={{ animation: "pengu-spark 1.2s 0.3s ease-out infinite" }} />
            <circle cx="70" cy="18" r="2" fill={C.primary} style={{ animation: "pengu-spark 0.9s 0.15s ease-out infinite" }} />
          </g>
        )}
        {/* gölge */}
        <ellipse cx="70" cy="130" rx="32" ry="5" fill={C.primary} opacity="0.15" />
        {/* tepe tüyü */}
        <path d="M 62 22 Q 66 12 74 16" stroke="#262A47" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* gövde */}
        <ellipse cx="70" cy="80" rx="38" ry="46" fill="#262A47" />
        <ellipse cx="70" cy="90" rx="26" ry="32" fill="#F4F5FF" />
        {/* kanatlar */}
        <g style={leftWingAnim}><ellipse cx="35" cy="84" rx="9" ry="20" fill="#262A47" transform="rotate(18 35 84)" /></g>
        <g style={rightWingAnim}><ellipse cx="105" cy="84" rx="9" ry="20" fill="#262A47" transform="rotate(-18 105 84)" /></g>
        {/* gözler */}
        <circle cx="58" cy="60" r="7" fill="#fff" />
        <circle cx="82" cy="60" r="7" fill="#fff" />
        <g style={{ animation: "pengu-blink 4.6s ease-in-out infinite", transformOrigin: "70px 60px" }}>
          <circle cx={state === "thinking" ? 60.5 : 59.5} cy={state === "thinking" ? 58 : 61} r={eyeR} fill="#262A47" />
          <circle cx={state === "thinking" ? 81.5 : 80.5} cy={state === "thinking" ? 58 : 61} r={eyeR} fill="#262A47" />
          <circle cx="60.8" cy="59.4" r="1.2" fill="#fff" />
          <circle cx="81.8" cy="59.4" r="1.2" fill="#fff" />
        </g>
        {/* gaga */}
        <polygon points="70,66 64,73 76,73" fill="#F6A94A" />
        {/* ağız */}
        <path d={mouth} stroke="#8B7DFF" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* atkı — marka moru */}
        <g style={{ animation: "pengu-scarf 3.4s ease-in-out infinite", transformOrigin: "70px 98px" }}>
          <path d="M 44 96 Q 70 105 96 96 L 96 105 Q 70 114 44 105 Z" fill={C.primary} />
          <rect x="87" y="98" width="10" height="18" rx="5" fill={C.primary} />
          <rect x="87" y="112" width="10" height="4" rx="2" fill={C.accent1 || "#7C6FF0"} />
        </g>
        {/* yıldız rozeti */}
        <path d="M 104 44 l 2.6 -6 l 2.6 6 l 6 2.6 l -6 2.6 l -2.6 6 l -2.6 -6 l -6 -2.6 Z" fill="#8B7DFF" />
        {/* ayaklar */}
        <polygon points="60,122 53,130 67,130" fill="#F6A94A" />
        <polygon points="80,122 73,130 87,130" fill="#F6A94A" />
      </svg>
    </div>
  );
};

function exTheme(ex, ageGroup, lang) {
  if (!ageGroup || ageGroup.id !== "6-9") return ex;
  const k = KID_CATALOG[ex.id];
  if (!k) return ex;
  const L2 = (v) => (v && typeof v === "object" && !Array.isArray(v)) ? (v[lang] ?? v.tr) : v;
  return { ...ex, kid: true, icon: k.icon, color: k.color, name: L2(k.name), desc: L2(k.desc) };
}

/* Eşleştirme: çocuklar için hayvan emojileri */
const MATCH_EMOJIS_KID = ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐸","🐧","🦋"];

const TRAINING_CATALOG = [
  { id: "eye", name: { tr: "Göz Antrenmanı", en: "Eye Training" }, desc: { tr: "Hedefi gözlerinizle takip edin; süre, tempo ve desenleri siz ayarlayın.", en: "Follow the target with your eyes; you set the duration, tempo and patterns." }, icon: "👀", color: "#8B5CF6", duration: "Ayarlanabilir", cat: "egzersiz" },
  { id: "growshape", name: { tr: "Büyüyen Şekiller", en: "Growing Shapes" }, desc: { tr: "Merkezden büyüyen şeklin çizgisini gözlerinizle takip edin; aktif görme alanını genişletir.", en: "Follow the expanding outline with your eyes; widens the active field of view." }, icon: "🔵", color: "#0EA5E9", duration: "Ayarlanabilir", cat: "egzersiz" },
  { id: "benzer", name: { tr: "Benzer Kelimeler", en: "Similar Words" }, desc: { tr: "Birbirine çok benzeyen kelimeler arasından farklı olanı yakalayın.", en: "Spot the different word among very similar-looking ones." }, icon: "🔤", color: "#A855F7", duration: "~2 dk", cat: "egzersiz" },
  { id: "oddeven", name: { tr: "Tek mi? Çift mi?", en: "Odd or Even?" }, desc: { tr: "Kısa süre beliren sayının tek mi çift mi olduğuna hızla karar verin.", en: "Decide quickly whether the briefly flashed number is odd or even." }, icon: "⚖️", color: "#14B8A6", duration: "~2 dk", cat: "egzersiz" },
  { id: "schulte", name: { tr: "Schulte Tablosu", en: "Schulte Table" }, desc: { tr: "1'den 25'e sırayla bulun; çevresel görüşü genişletir.", en: "Find 1 to 25 in order; expands peripheral vision." }, icon: "🔢", color: "#5B5CE2", duration: "~2 dk", cat: "egzersiz" },
  { id: "flash", name: { tr: "Kelime Flaşlama (Takistoskop)", en: "Word Flash (Tachistoscope)" }, desc: { tr: "Kısa süre beliren kelimeyi yakalayın; algı hızını artırır.", en: "Catch the briefly flashed word; boosts perception speed." }, icon: "⚡", color: "#F59E0B", duration: "~2 dk", cat: "egzersiz" },
  { id: "match", name: { tr: "Eşleştirme Oyunu", en: "Matching Game" }, desc: { tr: "Kart çiftlerini en az hamlede bulun; görsel hafızayı çalıştırır.", en: "Find card pairs in as few moves as possible; trains visual memory." }, icon: "🃏", color: "#06B6D4", duration: "~2 dk", cat: "egzersiz" },
  { id: "peripheral", name: { tr: "Çevresel Görüş", en: "Peripheral Vision" }, desc: { tr: "Merkeze bakarken kenarlarda beliren sayıları toplayın.", en: "Add the numbers appearing at the edges while looking at the center." }, icon: "👁️", color: "#EC4899", duration: "~2 dk", cat: "egzersiz" },
  { id: "arithmetic", name: { tr: "Zihinsel Aritmetik Sprint", en: "Mental Math Sprint" }, desc: { tr: "İşlemi kafanızdan çözün, doğru yanıtı süre dolmadan seçin; doğru yanıtladıkça süre kısalır.", en: "Solve in your head and pick the answer before time runs out; the window shrinks as you get them right." }, icon: "🧮", color: "#F97316", duration: "~2 dk", cat: "zihinsel" },
  { id: "synonym", name: { tr: "Eş Anlam Avı", en: "Synonym Hunt" }, desc: { tr: "Hedef kelimeyle eş anlamlı olanı kutular arasından hızla bulun.", en: "Quickly find the synonym of the target word among the boxes." }, icon: "🎯", color: "#10B981", duration: "~2 dk", cat: "zihinsel" },
  { id: "number-memory", name: { tr: "Sayı Hafızası", en: "Number Memory" }, desc: { tr: "Kısa süre gösterilen sayı dizisini hatırlayın; doğru bildikçe dizi uzar.", en: "Recall the briefly shown digit sequence; it grows as you succeed." }, icon: "🔐", color: "#6366F1", duration: "~2 dk", cat: "zihinsel" },
  { id: "pattern", name: { tr: "Görsel Örüntü Avı", en: "Visual Pattern Hunt" }, desc: { tr: "3×3 tablodaki kuralı çözün, eksik hücreyi tamamlayın; soyut akıl yürütmeyi çalıştırır.", en: "Crack the rule in the 3×3 grid and complete the missing cell; trains abstract reasoning." }, icon: "🧊", color: "#0EA5E9", duration: "~3 dk", cat: "zihinsel" },
  { id: "block-reading", name: { tr: "Blok Okuma Çalışması", en: "Block Reading" }, desc: { tr: "Metni 3'er kelimelik bloklar halinde, akan vurguyu izleyerek okuyun.", en: "Read the text in 3-word blocks following the moving highlight." }, icon: "📚", color: "#84CC16", duration: "~3 dk", cat: "calisma" },
  { id: "rsvp", name: { tr: "Hızlı Okuma (RSVP)", en: "Speed Reading (RSVP)" }, desc: { tr: "Akan metni okuyun, anlama sorularını yanıtlayın.", en: "Read the streaming text, answer comprehension questions." }, icon: "📖", color: "#00B8A9", duration: "~3 dk", cat: "calisma" },
  { id: "reading-test", name: { tr: "Okuma Hızı Testi", en: "Reading Speed Test" }, desc: { tr: "Metni kendi hızınızda okuyun; kelime/dk hızınız ve anlama oranınız ölçülsün.", en: "Read at your own pace; measure your wpm and comprehension." }, icon: "⏱️", color: "#F43F5E", duration: "~3 dk", cat: "olcum" },
];

const TRAINING_GROUPS = [
  { id: "egzersiz", title: { tr: "Göz ve Algı Egzersizleri", en: "Eye & Perception Exercises" } },
  { id: "zihinsel", title: { tr: "Zihinsel Beceriler", en: "Mental Skills" } },
  { id: "calisma", title: { tr: "Okuma Çalışmaları", en: "Reading Practices" } },
  { id: "olcum", title: { tr: "Okuma Hızı Ölçümü", en: "Reading Speed Measurement" } },
];

/* --- 21 günlük seviye bazlı antrenman programı --- */
const PROGRAM_LENGTH = 21;
const LEVEL_POOLS = {
  "Başlangıç": ["eye", "growshape", "schulte", "match", "benzer", "number-memory", "synonym", "pattern"],
  "Orta": ["eye", "flash", "oddeven", "schulte", "benzer", "peripheral", "block-reading", "growshape", "arithmetic", "synonym", "number-memory", "pattern"],
  "İleri": ["flash", "oddeven", "peripheral", "block-reading", "rsvp", "reading-test", "schulte", "eye", "arithmetic", "synonym", "pattern"],
};
const LEVEL_COLORS = { "Başlangıç": "#22C55E", "Orta": "#F59E0B", "İleri": "#EF4444" };
const dayPlan = (day, level) => {
  const pool = LEVEL_POOLS[level] || LEVEL_POOLS["Orta"];
  return [0, 1, 2].map((i) => pool[(day * 3 + i) % pool.length]);
};

const TrainingResult = ({ title, score, stats, stars, maxStars = 5, mandatoryPassed, onFinish, kid = false }) => {
  const { lang } = useT();
  return (
  <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
    <Card className="w-full max-w-sm text-center" style={{ animation: "kg-countup 0.4s ease" }}>
      <div className="mb-1">
        <PenguMascot
          state={score >= 60 ? "celebrate" : "encourage"}
          size={100}
          bubble={score >= 60
            ? (kid ? { tr: "Harika iş çıkardın! 🎉", en: "You did great! 🎉" } : { tr: "Harika bir performans! 🎉", en: "Great performance! 🎉" })
            : (kid ? { tr: "Güzel deneme! Bir daha oynayalım mı?", en: "Nice try! Play again?" } : { tr: "İyi deneme — tekrarla gelişir!", en: "Good attempt — practice makes progress!" })}
        />
      </div>
      <h2 className="font-semibold text-lg mb-3" style={{ color: C.text }}>{title} {lang === "en" ? "completed" : "tamamlandı"}</h2>
      <div className="inline-flex items-baseline gap-1 px-4 py-2 rounded-2xl mb-3" style={{ background: `linear-gradient(135deg, ${C.primary}14, ${C.accent1}14)` }}>
        <span className="text-4xl font-bold" style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.accent1})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{score}</span>
        <span style={{ color: C.textMuted }}>/100</span>
      </div>
      {stars != null && (
        <div className="mb-3">
          <div className="flex justify-center gap-1 mb-1.5">
            {Array.from({ length: maxStars }).map((_, i) => (
              <span key={i} style={{ fontSize: 24, color: i < stars ? "#F59E0B" : C.border, animation: i < stars ? `kg-pop 0.4s ease ${i * 0.1}s backwards` : "none" }}>★</span>
            ))}
          </div>
          {mandatoryPassed === true && <Badge tone="success">{lang === "en" ? "Mandatory task completed" : "Zorunlu görev tamamlandı"}</Badge>}
          {mandatoryPassed === false && <Badge tone="warning">{lang === "en" ? "Mandatory task failed — at least 1 object had to be recalled" : "Zorunlu görev başarısız — en az 1 nesne hatırlanmalıydı"}</Badge>}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {stats.map(([label, value]) => (
          <div key={L(label, "tr")} className="rounded-xl p-2" style={{ background: C.bg }}>
            <p className="text-xs" style={{ color: C.textMuted }}>{L(label, lang)}</p>
            <p className="text-sm font-semibold" style={{ color: C.text }}>{L(value, lang)}</p>
          </div>
        ))}
      </div>
      <Button className="w-full" onClick={onFinish}>{lang === "en" ? "Back to Training" : "Eğitime Dön"}</Button>
    </Card>
  </div>
  );
};

const TrainingReady = ({ ex, lines, onStart, onBack }) => {
  const { lang } = useT();
  return (
  <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
    <Card className="w-full max-w-sm text-center">
      <div className="mb-2">
        <PenguMascot state="greet" size={92} bubble={ex.kid
          ? { tr: "Hazır mısın? Birlikte oynayalım!", en: "Ready? Let's play together!" }
          : { tr: "Hazır olduğunda başlayalım!", en: "Let's start when you're ready!" }} />
      </div>
      <h2 className="font-semibold text-lg mb-2" style={{ color: C.text }}>{ex.name}</h2>
      <div className="text-left text-sm rounded-xl p-3 mb-4" style={{ background: C.bg, color: C.textMuted }}>
        {lines.map((l, i) => <p key={i}>• {L(l, lang)}</p>)}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onBack}>{lang === "en" ? "Cancel" : "Vazgeç"}</Button>
        <Button className="flex-1" onClick={onStart}>{lang === "en" ? "Begin" : "Başla"}</Button>
      </div>
    </Card>
  </div>
  );
};

/* --- Schulte Tablosu --- */
const SchulteExercise = ({ ex, onFinish, onBack }) => {
  const { lang } = useT();
  const [numbers] = useState(() => {
    const a = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  });
  const [started, setStarted] = useState(false);
  const [next, setNext] = useState(1);
  const [errors, setErrors] = useState(0);
  const startRef = useRef(0);
  const [done, setDone] = useState(null);

  if (!started) return <TrainingReady ex={ex} onBack={onBack} onStart={() => { startRef.current = performance.now(); setStarted(true); }}
    lines={[{ tr: "Gözünüzü tablonun merkezinde tutmaya çalışın.", en: "Try to keep your eyes at the center of the table." }, { tr: "1'den 25'e kadar sayılara sırayla dokunun.", en: "Tap the numbers from 1 to 25 in order." }, { tr: "Ne kadar hızlı, o kadar iyi.", en: "The faster, the better." }]} />;

  if (done) return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Süre", en: "Time" }, `${done.secs} sn`], [{ tr: "Hata", en: "Errors" }, done.errors], [{ tr: "Bulunan", en: "Found" }, "25/25"]]}
    onFinish={() => onFinish({ score: done.score, detail: `${done.secs} sn` })} />;

  const tap = (n) => {
    if (n === next) {
      if (n === 25) {
        const secs = Math.round((performance.now() - startRef.current) / 100) / 10;
        setDone({ secs, errors, score: clamp(Math.round(100 - Math.max(0, secs - 25) * 2 - errors * 3)) });
      } else setNext(n + 1);
    } else setErrors((e) => e + 1);
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-5 p-6" style={{ background: C.bg }}>
      <p className="text-sm" style={{ color: C.textMuted }}>{lang === "en" ? "Next number:" : "Sıradaki sayı:"} <b style={{ color: C.primary, fontSize: 18 }}>{next}</b> · {lang === "en" ? "Errors" : "Hata"}: {errors}</p>
      <div className="grid grid-cols-5 gap-2">
        {numbers.map((n) => (
          <button key={n} onClick={() => tap(n)}
            className="w-14 h-14 rounded-xl font-bold text-lg kg-btn-pop"
            style={n < next
              ? { background: "#DCFCE7", color: C.success, border: `1px solid ${C.success}55` }
              : { background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
};

/* --- Kelime Flaşlama (adaptif takistoskop) --- */
const FlashWordExercise = ({ ex, ageGroup, onFinish, onBack }) => {
  const { lang } = useT();
  const WORD_POOL = lang === "en" ? FLASH_WORDS_EN : FLASH_WORDS;
  const TOTAL = 10;
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState("fix");
  const [word, setWord] = useState("");
  const [options, setOptions] = useState([]);
  const [duration, setDuration] = useState(Math.round(500 * ((ageGroup && ageGroup.windowFactor) || 1)));
  const [correctCount, setCorrectCount] = useState(0);
  const [minDur, setMinDur] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!started || done) return;
    if (round >= TOTAL) {
      const acc = Math.round((correctCount / TOTAL) * 100);
      const best = minDur ?? duration;
      setDone({ acc, best, score: clamp(Math.round(acc * 0.7 + clamp(100 - (best - 120) / 4) * 0.3)) });
      return;
    }
    const w = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
    const opts = [w];
    while (opts.length < 4) {
      const o = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
      if (!opts.includes(o)) opts.push(o);
    }
    setWord(w);
    setOptions(opts.sort(() => Math.random() - 0.5));
    setPhase("fix");
    const t1 = setTimeout(() => setPhase("flash"), 600);
    const t2 = setTimeout(() => setPhase("choose"), 600 + duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, started]);

  if (!started) return <TrainingReady ex={ex} onBack={onBack} onStart={() => setStarted(true)}
    lines={[{ tr: "Ekranda çok kısa süreliğine bir kelime belirecek.", en: "A word will appear on screen very briefly." }, { tr: "Ardından 4 seçenekten gördüğünüz kelimeyi seçin.", en: "Then pick the word you saw from 4 options." }, { tr: "Doğru yanıtladıkça süre kısalır — algı eşiğinizi zorlayın.", en: "The duration shortens as you answer correctly — push your perception threshold." }]} />;

  if (done) return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Doğruluk", en: "Accuracy" }, `%${done.acc}`], [{ tr: "En kısa süre", en: "Shortest time" }, `${done.best} ms`], [{ tr: "Tur", en: "Rounds" }, TOTAL]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `${done.best} ms threshold` : `${done.best} ms eşik` })} />;

  const choose = (o) => {
    if (phase !== "choose") return;
    if (o === word) {
      setCorrectCount((c) => c + 1);
      setDuration((d) => { const nd = Math.max(120, d - 40); setMinDur((m) => (m == null ? nd : Math.min(m, nd))); return nd; });
    } else {
      setDuration((d) => Math.min(800, d + 60));
    }
    setRound((r) => r + 1);
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 p-6" style={{ background: C.bg }}>
      <p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Round" : "Tur"} {Math.min(round + 1, TOTAL)}/{TOTAL} · {lang === "en" ? "Duration" : "Süre"}: {duration} ms</p>
      <div className="h-20 flex items-center justify-center">
        {phase === "fix" && <span className="text-3xl font-bold" style={{ color: C.textMuted }}>+</span>}
        {phase === "flash" && <span className="text-4xl font-bold" style={{ color: C.text }}>{word}</span>}
        {phase === "choose" && <span className="text-sm" style={{ color: C.textMuted }}>{lang === "en" ? "Which word did you see?" : "Hangi kelimeyi gördünüz?"}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs" style={{ opacity: phase === "choose" ? 1 : 0.25, pointerEvents: phase === "choose" ? "auto" : "none" }}>
        {options.map((o) => (
          <button key={o} onClick={() => choose(o)} className="py-3 rounded-xl text-sm font-medium kg-btn-pop"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>{o}</button>
        ))}
      </div>
    </div>
  );
};

/* --- RSVP Hızlı Okuma + anlama soruları --- */
const RSVPExercise = ({ ex, ageGroup, initialText, onFinish, onBack }) => {
  const { lang } = useT();
  const [textObj, setTextObj] = useState(initialText || null);
  const [phase, setPhase] = useState(initialText ? "select" : "pick");
  const [wpm, setWpm] = useState(250);
  const [wi, setWi] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (phase !== "read" || !textObj) return;
    if (wi >= textObj.words.length) { setPhase("quiz"); return; }
    const t = setTimeout(() => setWi((i) => i + 1), 60000 / wpm);
    return () => clearTimeout(t);
  }, [phase, wi, wpm, textObj]);

  if (phase === "pick") return (
    <TextPicker accent={ex.color} defaultLib={ageGroup && (ageGroup.id === "6-9" || ageGroup.id === "10-13") ? "cocuk" : "genel"}
      onBack={onBack} onPick={(t) => { setTextObj(t); setWi(0); setPhase("select"); }} />
  );

  if (phase === "select") return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
      <Card className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `linear-gradient(135deg, ${ex.color}, ${C.accent1})`, fontSize: 26 }}>{ex.icon}</div>
        <h2 className="font-semibold text-lg mb-1" style={{ color: C.text }}>{textObj.title}</h2>
        <p className="text-sm mb-4" style={{ color: C.textMuted }}>{lang === "en" ? "The text will stream word by word; comprehension questions follow. Choose your speed:" : "Metin kelime kelime akacak; bitince anlama soruları gelecek. Hızınızı seçin:"}</p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[150, 250, 350, 500].map((v) => (
            <button key={v} onClick={() => setWpm(v)} className="py-2 rounded-xl text-xs font-semibold kg-btn-pop"
              style={wpm === v ? { background: `linear-gradient(135deg, ${C.secondary}, ${C.accent3})`, color: "#fff" } : { background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted }}>
              {v}<br />{lang === "en" ? "wpm" : "k/dk"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onBack}>{lang === "en" ? "Cancel" : "Vazgeç"}</Button>
          <Button className="flex-1" onClick={() => setPhase("read")}>{lang === "en" ? "Begin" : "Başla"}</Button>
        </div>
      </Card>
    </div>
  );

  if (phase === "read") return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 p-6" style={{ background: C.bg }}>
      <p className="text-xs" style={{ color: C.textMuted }}>{wpm} kelime/dk · {Math.round((wi / textObj.words.length) * 100)}%</p>
      <span key={wi} className="text-4xl font-bold" style={{ color: C.text }}>{textObj.words[wi]}</span>
      <div className="w-full max-w-xs h-1.5 rounded-full" style={{ background: C.border }}>
        <div className="h-1.5 rounded-full" style={{ width: `${(wi / textObj.words.length) * 100}%`, background: `linear-gradient(90deg, ${C.secondary}, ${C.accent3})` }} />
      </div>
    </div>
  );

  if (phase === "quiz") return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
      <Card className="w-full max-w-md">
        <h2 className="font-semibold mb-4" style={{ color: C.text }}>{lang === "en" ? "Comprehension Questions" : "Anlama Soruları"}</h2>
        {textObj.questions.map((q, qi) => (
          <div key={qi} className="mb-4">
            <p className="text-sm font-medium mb-2" style={{ color: C.text }}>{qi + 1}. {q.q}</p>
            <div className="flex flex-col gap-1.5">
              {q.options.map((o, oi) => (
                <button key={oi} onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  className="text-left px-3 py-2 rounded-xl text-sm"
                  style={answers[qi] === oi ? { background: "#EEF0FF", color: C.primary, border: `1px solid ${C.primary}55` } : { background: C.bg, color: C.textMuted, border: `1px solid transparent` }}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button className="w-full" disabled={Object.keys(answers).length < textObj.questions.length}
          onClick={() => {
            const correct = textObj.questions.filter((q, i) => answers[i] === q.answer).length;
            const comp = Math.round((correct / textObj.questions.length) * 100);
            setDone({ comp, score: clamp(Math.round(comp * 0.6 + clamp((wpm - 100) / 5) * 0.4)) });
            setPhase("done");
          }}>
          {lang === "en" ? "Submit" : "Tamamla"}
        </Button>
      </Card>
    </div>
  );

  return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Hız", en: "Speed" }, `${wpm} wpm`], [{ tr: "Anlama", en: "Comprehension" }, `%${done.comp}`], [{ tr: "Kelime", en: "Words" }, textObj.words.length]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `${wpm} wpm · ${done.comp}% comprehension` : `${wpm} k/dk · %${done.comp} anlama` })} />;
};

/* --- Çevresel Görüş --- */
const PeripheralExercise = ({ ex, ageGroup, onFinish, onBack }) => {
  const { lang } = useT();
  const TOTAL = 8;
  const flashDur = Math.round(350 * ((ageGroup && ageGroup.windowFactor) || 1));
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState("fix");
  const [pair, setPair] = useState([0, 0]);
  const [options, setOptions] = useState([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!started || done) return;
    if (round >= TOTAL) {
      const acc = Math.round((correctCount / TOTAL) * 100);
      setDone({ acc, score: clamp(acc) });
      return;
    }
    const a = 1 + Math.floor(Math.random() * 9);
    const b = 1 + Math.floor(Math.random() * 9);
    const sum = a + b;
    const opts = new Set([sum]);
    while (opts.size < 4) opts.add(Math.max(2, sum + Math.floor(Math.random() * 7) - 3));
    setPair([a, b]);
    setOptions([...opts].sort(() => Math.random() - 0.5));
    setPhase("fix");
    const t1 = setTimeout(() => setPhase("flash"), 700);
    const t2 = setTimeout(() => setPhase("choose"), 700 + flashDur);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, started]);

  if (!started) return <TrainingReady ex={ex} onBack={onBack} onStart={() => setStarted(true)}
    lines={[{ tr: "Gözünüzü ortadaki noktadan AYIRMAYIN.", en: "Do NOT take your eyes off the center dot." }, { tr: "Kenarlarda iki sayı çok kısa belirecek.", en: "Two numbers will flash briefly at the edges." }, { tr: "İkisinin toplamını seçin.", en: "Pick their sum." }]} />;

  if (done) return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Doğruluk", en: "Accuracy" }, `%${done.acc}`], [{ tr: "Süre", en: "Duration" }, `${flashDur} ms`], [{ tr: "Tur", en: "Rounds" }, TOTAL]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `${done.acc}% accuracy` : `%${done.acc} doğruluk` })} />;

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 p-6" style={{ background: C.bg }}>
      <p className="text-xs" style={{ color: C.textMuted }}>Tur {Math.min(round + 1, TOTAL)}/{TOTAL}</p>
      <div className="relative w-full max-w-md h-24 flex items-center justify-center">
        <span className="w-3 h-3 rounded-full" style={{ background: C.primary }} />
        {phase === "flash" && (
          <>
            <span className="absolute left-2 text-3xl font-bold" style={{ color: C.text }}>{pair[0]}</span>
            <span className="absolute right-2 text-3xl font-bold" style={{ color: C.text }}>{pair[1]}</span>
          </>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2" style={{ opacity: phase === "choose" ? 1 : 0.25, pointerEvents: phase === "choose" ? "auto" : "none" }}>
        {options.map((o) => (
          <button key={o} onClick={() => {
            if (o === pair[0] + pair[1]) setCorrectCount((c) => c + 1);
            setRound((r) => r + 1);
          }} className="w-14 h-12 rounded-xl text-lg font-bold kg-btn-pop"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>{o}</button>
        ))}
      </div>
      <p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "What was the sum?" : "Toplam kaçtı?"}</p>
    </div>
  );
};

/* --- Göz Antrenmanı (yapılandırılabilir göz kası egzersizi) --- */
const EYE_GLYPHS = ["●", "▲", "■", "★", "◆", "♥", "⬢", "✚", "☀", "☾", "✿", "♠", "♣", "♦", "▼", "⬟"];
const EYE_COLORS = ["#3B82F6", "#EF4444", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#FF6B35"];
const EYE_PHASES = [
  { key: "lr", label: { tr: "Sol ve sağ", en: "Left and right" } },
  { key: "ud", label: { tr: "Yukarı ve aşağı", en: "Up and down" } },
  { key: "diag", label: { tr: "Köşeden köşeye", en: "Corner to corner" } },
  { key: "rot", label: "Rotasyon" },
  { key: "rand", label: "Rastgele" },
  { key: "coord", label: "Koordinasyon" },
];
const EYE_DUR_OPTS = [0, 10, 20, 30, 40, 50, 60, 90];
const EYE_TEMPO_OPTS = [60, 80, 100, 120, 140, 160, 180, 200, 240, 300];

const PillRow = ({ label, opts, value, onChange }) => {
  const { lang } = useT();
  return (
  <div className="flex items-center justify-between gap-3 flex-wrap py-2.5 border-b" style={{ borderColor: C.border }}>
    <span className="text-sm" style={{ color: C.text }}>{L(label, lang)}</span>
    <div className="flex gap-1.5 flex-wrap justify-end">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className="px-2.5 py-1 rounded-full text-xs font-semibold kg-btn-pop"
          style={value === o
            ? { background: `linear-gradient(135deg, ${C.primary}, ${C.accent2})`, color: "#fff" }
            : { background: C.bg, color: C.textMuted, border: `1px solid ${C.border}` }}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
  );
};

const EyeTrainingExercise = ({ ex, onFinish, onBack }) => {
  const { lang } = useT();
  const [objVar, setObjVar] = useState(4);
  const [colorVar, setColorVar] = useState(1);
  const [durs, setDurs] = useState({ lr: 10, ud: 10, diag: 10, rot: 10, rand: 10, coord: 10 });
  const [tempo, setTempo] = useState(60);
  const [mode, setMode] = useState("config"); // config | brief | run | quiz | done
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [beat, setBeat] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [glyph, setGlyph] = useState(EYE_GLYPHS[0]);
  const [color, setColor] = useState(EYE_COLORS[0]);
  const [finalScore, setFinalScore] = useState(100);
  const [completionPct, setCompletionPct] = useState(100);
  const [stoppedEarly, setStoppedEarly] = useState(false);
  const [quizOptions, setQuizOptions] = useState([]);
  const [countOptions, setCountOptions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [countAnswer, setCountAnswer] = useState(null);
  const [stars, setStars] = useState(0);
  const [mandatoryPassed, setMandatoryPassed] = useState(true);
  const posIdxRef = useRef(0);
  const appearedRef = useRef(new Set());
  const beatsTotalRef = useRef(0);

  const phases = EYE_PHASES.filter((p) => durs[p.key] > 0).map((p) => ({ ...p, seconds: durs[p.key] }));
  const totalSeconds = phases.reduce((a, p) => a + p.seconds, 0);
  const difficulty = Math.round(totalSeconds * tempo * (1 + (objVar - 4) / 16 + (colorVar - 1) / 8));
  const interval = 60000 / tempo;

  const nextPos = (key) => {
    const i = posIdxRef.current++;
    if (key === "lr") return i % 2 === 0 ? { x: 10, y: 50 } : { x: 90, y: 50 };
    if (key === "ud") return i % 2 === 0 ? { x: 50, y: 12 } : { x: 50, y: 88 };
    if (key === "diag") { const pts = [{ x: 10, y: 12 }, { x: 90, y: 88 }, { x: 90, y: 12 }, { x: 10, y: 88 }]; return pts[i % 4]; }
    if (key === "rot") { const a = (i % 12) * ((Math.PI * 2) / 12); return { x: 50 + 38 * Math.cos(a), y: 50 + 38 * Math.sin(a) }; }
    if (key === "coord") {
      if (i % 2 === 0) return { x: 50, y: 50 };
      const pts = [{ x: 10, y: 50 }, { x: 90, y: 50 }, { x: 50, y: 12 }, { x: 50, y: 88 }, { x: 10, y: 12 }, { x: 90, y: 88 }];
      return pts[Math.floor(Math.random() * pts.length)];
    }
    return { x: 10 + Math.random() * 80, y: 12 + Math.random() * 76 };
  };

  const prepareQuiz = (pct, early) => {
    setCompletionPct(pct);
    setStoppedEarly(early);
    const appeared = [...appearedRef.current];
    const distractors = EYE_GLYPHS.filter((g) => !appearedRef.current.has(g));
    const opts = [...appeared];
    while (opts.length < Math.min(10, appeared.length + 4) && distractors.length) {
      opts.push(distractors.splice(Math.floor(Math.random() * distractors.length), 1)[0]);
    }
    setQuizOptions(opts.sort(() => Math.random() - 0.5));
    const total = beatsTotalRef.current;
    const copts = new Set([total]);
    while (copts.size < 4) copts.add(Math.max(1, total + Math.floor(Math.random() * 11) - 5));
    setCountOptions([...copts].sort((a, b) => a - b));
    setSelected([]);
    setCountAnswer(null);
    setMode("quiz");
  };

  const evaluateQuiz = () => {
    const appeared = appearedRef.current;
    const correctSel = selected.filter((g) => appeared.has(g)).length;
    const wrongSel = selected.filter((g) => !appeared.has(g)).length;
    const allFound = correctSel === appeared.size && wrongSel === 0;
    const mandatory = correctSel >= 1;
    let s = 0;
    if (correctSel >= 2) s++;
    if (correctSel >= 3) s++;
    if (allFound) s++;
    if (countAnswer === beatsTotalRef.current) s++;
    if (!stoppedEarly) s++;
    setStars(s);
    setMandatoryPassed(mandatory);
    let sc = Math.round(completionPct * 0.5 + s * 10);
    if (!mandatory) sc = Math.min(sc, 45);
    setFinalScore(clamp(sc));
    setMode("done");
  };

  useEffect(() => {
    if (mode !== "run") return;
    const phase = phases[phaseIdx];
    if (!phase) { prepareQuiz(100, false); return; }
    const beatsInPhase = Math.max(1, Math.round((phase.seconds * tempo) / 60));
    if (beat >= beatsInPhase) { setPhaseIdx((p) => p + 1); setBeat(0); posIdxRef.current = 0; return; }
    setPos(nextPos(phase.key));
    const g = EYE_GLYPHS[Math.floor(Math.random() * objVar)];
    setGlyph(g);
    appearedRef.current.add(g);
    beatsTotalRef.current += 1;
    setColor(EYE_COLORS[Math.floor(Math.random() * colorVar)]);
    const t = setTimeout(() => setBeat((b) => b + 1), interval);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phaseIdx, beat]);

  // Brifing ekranında klavye kısayolları (Boşluk = Başla, Esc = Geri)
  useEffect(() => {
    if (mode !== "brief") return;
    const onKey = (e) => {
      if (e.code === "Space") { e.preventDefault(); startRun(); }
      if (e.code === "Escape") setMode("config");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const startRun = () => {
    setPhaseIdx(0);
    setBeat(0);
    posIdxRef.current = 0;
    appearedRef.current = new Set();
    beatsTotalRef.current = 0;
    setMode("run");
  };

  const stopEarly = () => {
    const completed = phases.slice(0, phaseIdx).reduce((a, p) => a + p.seconds, 0) + beat * (60 / tempo);
    prepareQuiz(clamp(Math.round((completed / Math.max(1, totalSeconds)) * 100)), true);
  };

  if (mode === "config") return (
    <div className="min-h-full flex items-center justify-center p-5" style={{ background: C.bg }}>
      <Card className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ fontSize: 22 }}>{ex.icon}</span>
          <h2 className="font-semibold text-lg" style={{ color: C.text }}>{ex.name} — {lang === "en" ? "Settings" : "Ayarlar"}</h2>
        </div>
        <PillRow label={{ tr: "Nesne çeşitliliği", en: "Object variety" }} opts={[4, 8, 12, 16]} value={objVar} onChange={setObjVar} />
        <PillRow label={{ tr: "Renk çeşitliliği", en: "Color variety" }} opts={[1, 2, 3, 4, 5, 6, 7, 8]} value={colorVar} onChange={setColorVar} />
        {EYE_PHASES.map((p) => (
          <PillRow key={p.key} label={{ tr: `${L(p.label, "tr")} süresi (sn)`, en: `${L(p.label, "en")} duration (s)` }} opts={EYE_DUR_OPTS} value={durs[p.key]} onChange={(v) => setDurs((d) => ({ ...d, [p.key]: v }))} />
        ))}
        <PillRow label={{ tr: "Antrenman temposu (hareket/dk)", en: "Training tempo (moves/min)" }} opts={EYE_TEMPO_OPTS} value={tempo} onChange={setTempo} />
        <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
          <div className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm kg-gradient-anim"
            style={{ background: `linear-gradient(120deg, ${C.primary}, ${C.accent2})`, backgroundSize: "200% 200%" }}>
            Zorluk seviyesi: {difficulty.toLocaleString("tr-TR")}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onBack}>Geri git</Button>
            <Button disabled={totalSeconds === 0} onClick={() => setMode("brief")}>Devam</Button>
          </div>
        </div>
        {totalSeconds === 0 && <p className="text-xs mt-2" style={{ color: C.danger }}>{lang === "en" ? "At least one exercise duration must be greater than 0." : "En az bir egzersiz süresi 0'dan büyük olmalı."}</p>}
      </Card>
    </div>
  );

  if (mode === "brief") return (
    <div className="min-h-full flex items-center justify-center p-5" style={{ background: C.bg }}>
      <Card className="w-full max-w-2xl" style={{ animation: "kg-countup 0.4s ease" }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b" style={{ borderColor: C.border }}>
          <h2 className="font-semibold text-lg" style={{ color: C.text }}>{lang === "en" ? "Ready when you are! 🎉" : "Hazırsanız başlıyoruz! 🎉"}</h2>
          <div className="flex gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#EEF0FF", color: C.primary }}>🎵 {tempo}/dk</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#EEF0FF", color: C.primary }}>⏱ {totalSeconds} sn</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#EEF0FF", color: C.primary }}>🔷 {objVar} {lang === "en" ? "objects" : "farklı nesne"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl p-4" style={{ background: `${C.accent3}14` }}>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: C.accent3 }}>💡 {lang === "en" ? "Tips" : "İpuçları"}</p>
            <div className="text-sm flex flex-col gap-1.5" style={{ color: C.text }}>
              <p>• {lang === "en" ? "Keep your head still; follow the target only with your eyes." : "Başınızı sabit tutun; hedefi yalnızca gözlerinizle izleyin."}</p>
              <p>• {lang === "en" ? "Try to keep the appearing objects in mind." : "Beliren nesneleri aklınızda tutmaya çalışın."}</p>
              <p>• {lang === "en" ? "Try counting how many objects were shown in total." : "Toplam kaç nesne gösterildiğini saymayı deneyin."}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="rounded-xl p-3" style={{ background: `${C.accent2}14` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: C.accent2 }}>❗ {lang === "en" ? "Mandatory task" : "Zorunlu görev"}</p>
              <p className="text-sm font-medium" style={{ color: C.text }}>{lang === "en" ? "Correctly recall at least 1 object." : "En az 1 nesneyi doğru hatırlayın."}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: `${C.warning}14` }}>
              <p className="text-xs font-semibold mb-1.5" style={{ color: C.warning }}>⭐ {lang === "en" ? "Optional goals" : "İsteğe bağlı hedefler"}</p>
              <div className="text-xs flex flex-col gap-1" style={{ color: C.text }}>
                <p>{lang === "en" ? "Recall at least 2 objects" : "En az 2 nesneyi hatırla"} <b>(+1 ⭐)</b></p>
                <p>{lang === "en" ? "Recall at least 3 objects" : "En az 3 nesneyi hatırla"} <b>(+1 ⭐)</b></p>
                <p>{lang === "en" ? "Recall all objects perfectly" : "Tüm nesneleri eksiksiz hatırla"} <b>(+1 ⭐)</b></p>
                <p>{lang === "en" ? "Guess the total object count correctly" : "Toplam nesne sayısını doğru bil"} <b>(+1 ⭐)</b></p>
                <p>{lang === "en" ? "Finish without quitting midway" : "Egzersizi yarıda bırakmadan tamamla"} <b>(+1 ⭐)</b></p>
              </div>
            </div>
          </div>
        </div>

        <Button className="w-full" onClick={startRun}>{lang === "en" ? "Begin 🚀" : "Başla 🚀"}</Button>
        <p className="text-xs text-center mt-2" style={{ color: C.textMuted }}>{lang === "en" ? "(Keyboard: Space = Begin · Esc = Back)" : "(Klavyede: Boşluk = Başla · Esc = Geri)"}</p>
      </Card>
    </div>
  );

  if (mode === "quiz") return (
    <div className="min-h-full flex items-center justify-center p-5" style={{ background: C.bg }}>
      <Card className="w-full max-w-md" style={{ animation: "kg-countup 0.4s ease" }}>
        <h2 className="font-semibold text-lg mb-4" style={{ color: C.text }}>{lang === "en" ? "Recall Time 🧠" : "Hatırlama Zamanı 🧠"}</h2>

        <p className="text-sm font-medium mb-2" style={{ color: C.text }}>1. {lang === "en" ? "Which objects did you see in the exercise?" : "Egzersizde hangi nesneleri gördünüz?"} <span className="text-xs font-normal" style={{ color: C.textMuted }}>{lang === "en" ? "(Select all you saw)" : "(Gördüklerinizin tümünü seçin)"}</span></p>
        <div className="grid grid-cols-5 gap-2 mb-5">
          {quizOptions.map((g) => {
            const on = selected.includes(g);
            return (
              <button key={g} onClick={() => setSelected((s) => (on ? s.filter((x) => x !== g) : [...s, g]))}
                className="h-12 rounded-xl text-2xl kg-btn-pop"
                style={on
                  ? { background: "#EEF0FF", border: `2px solid ${C.primary}`, color: C.primary }
                  : { background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
                {g}
              </button>
            );
          })}
        </div>

        <p className="text-sm font-medium mb-2" style={{ color: C.text }}>2. {lang === "en" ? "How many objects were shown in total?" : "Toplam kaç nesne gösterildi?"}</p>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {countOptions.map((c) => (
            <button key={c} onClick={() => setCountAnswer(c)}
              className="py-2.5 rounded-xl text-sm font-bold kg-btn-pop"
              style={countAnswer === c
                ? { background: `linear-gradient(135deg, ${C.primary}, ${C.accent1})`, color: "#fff" }
                : { background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
              {c}
            </button>
          ))}
        </div>

        <Button className="w-full" disabled={countAnswer == null} onClick={evaluateQuiz}>{lang === "en" ? "See Result" : "Sonucu Gör"}</Button>
      </Card>
    </div>
  );

  if (mode === "run") {
    const phase = phases[phaseIdx];
    const beatsInPhase = phase ? Math.max(1, Math.round((phase.seconds * tempo) / 60)) : 1;
    return (
      <div className="min-h-full flex flex-col p-5" style={{ background: C.bg }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: C.text }}>{L(phase?.label, lang)}</span>
          <span className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Phase" : "Aşama"} {Math.min(phaseIdx + 1, phases.length)}/{phases.length} · {tempo} {lang === "en" ? "moves/min" : "hareket/dk"}</span>
        </div>
        <div className="w-full h-1.5 rounded-full mb-4" style={{ background: C.border }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${(beat / beatsInPhase) * 100}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.accent2})` }} />
        </div>
        <div className="flex-1 rounded-2xl relative overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}`, minHeight: 320 }}>
          <span
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
              fontSize: 44,
              color,
              transition: `left ${Math.min(interval * 0.8, 600)}ms ease, top ${Math.min(interval * 0.8, 600)}ms ease`,
            }}
          >
            {glyph}
          </span>
        </div>
        <p className="text-xs text-center mt-3 mb-2" style={{ color: C.textMuted }}>{lang === "en" ? "Keep your head still; follow the target only with your eyes." : "Başınızı sabit tutun; hedefi yalnızca gözlerinizle takip edin."}</p>
        <Button variant="ghost" className="mx-auto" onClick={stopEarly}>Bitir</Button>
      </div>
    );
  }

  return (
    <TrainingResult
      kid={ex.kid}
      title={ex.name}
      score={finalScore}
      stars={stars}
      mandatoryPassed={mandatoryPassed}
      stats={[[{ tr: "Süre", en: "Time" }, `${totalSeconds} sn`], [{ tr: "Tempo", en: "Tempo" }, `${tempo}/dk`], [{ tr: "Zorluk", en: "Difficulty" }, difficulty.toLocaleString("tr-TR")]]}
      onFinish={() => onFinish({ score: finalScore, detail: `${stars}★ · Zorluk ${difficulty.toLocaleString("tr-TR")}` })}
    />
  );
};

/* --- Eşleştirme Oyunu (görsel hafıza — çift bulma) --- */
const MATCH_EMOJIS = ["🎁", "🎹", "⚽", "🎟️", "🛷", "🍪", "🎯", "🔬"];

const MatchExercise = ({ ex, ageGroup, onFinish, onBack }) => {
  const { lang } = useT();
  const EMOJIS = ageGroup?.id === "6-9" ? MATCH_EMOJIS_KID : MATCH_EMOJIS;
  const [cards] = useState(() => {
    const arr = [...EMOJIS, ...EMOJIS].map((e, i) => ({ id: i, emoji: e }));
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  });
  const [started, setStarted] = useState(false);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const startRef = useRef(0);
  const lockRef = useRef(false);
  const [done, setDone] = useState(null);

  if (!started) return <TrainingReady ex={ex} onBack={onBack} onStart={() => { startRef.current = performance.now(); setStarted(true); }}
    lines={[{ tr: "Kartlar kapalı başlar; ikisini açıp eşleştirin.", en: "Cards start face down; flip two to match." }, { tr: "Eşleşmeyenler kısa süre sonra tekrar kapanır — yerlerini aklınızda tutun.", en: "Non-matches flip back shortly — remember their positions." }, { tr: "En az hamlede ve en hızlı bitirmeye çalışın.", en: "Try to finish fastest with the fewest moves." }]} />;

  if (done) return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Süre", en: "Time" }, `${done.secs} sn`], [{ tr: "Hamle", en: "Moves" }, done.moves], [{ tr: "Çift", en: "Pairs" }, EMOJIS.length]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `${done.moves} moves · ${done.secs} s` : `${done.moves} hamle · ${done.secs} sn` })} />;

  const tap = (card) => {
    if (lockRef.current || flipped.includes(card.id) || matched.includes(card.id)) return;
    const nf = [...flipped, card.id];
    setFlipped(nf);
    if (nf.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const [a, b] = nf.map((id) => cards.find((c) => c.id === id));
      if (a.emoji === b.emoji) {
        const nextMatched = [...matched, a.id, b.id];
        setMatched(nextMatched);
        setFlipped([]);
        if (nextMatched.length === cards.length) {
          const secs = Math.round((performance.now() - startRef.current) / 100) / 10;
          const score = clamp(Math.round(100 - Math.max(0, nextMoves - 8) * 4 - Math.max(0, secs - 30) * 1.5));
          setTimeout(() => setDone({ secs, moves: nextMoves, score }), 350);
        }
      } else {
        lockRef.current = true;
        setTimeout(() => { setFlipped([]); lockRef.current = false; }, 700);
      }
    }
  };

  const remaining = EMOJIS.length - matched.length / 2;

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 p-6" style={{ background: C.bg }}>
      <p className="text-sm" style={{ color: C.textMuted }}>
        <b style={{ color: C.primary }}>{remaining} {lang === "en" ? "pairs left" : "çift kaldı"}</b> · {lang === "en" ? "Moves" : "Hamle"}: {moves}
      </p>
      <div className="grid grid-cols-4 gap-2.5">
        {cards.map((card) => {
          const open = flipped.includes(card.id) || matched.includes(card.id);
          const isMatched = matched.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => tap(card)}
              className="w-16 h-16 rounded-xl flex items-center justify-center kg-btn-pop"
              style={open
                ? { background: isMatched ? "#DCFCE7" : C.surface, border: `1px solid ${isMatched ? C.success + "77" : C.border}`, fontSize: 28, transition: "all 0.25s" }
                : { background: `linear-gradient(135deg, ${C.primary}, ${C.accent1})`, color: "#fff", fontSize: 20, fontWeight: 700, transition: "all 0.25s" }}
            >
              {open ? card.emoji : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* --- Benzer Kelimeler (farklı olanı bul) --- */
const SIMILAR_SETS_EN = [
  ["quiet", "quite"], ["angel", "angle"], ["dessert", "desert"], ["form", "from"],
  ["trail", "trial"], ["board", "broad"], ["cloud", "could"], ["dairy", "diary"],
  ["sacred", "scared"], ["united", "untied"],
];
const SIMILAR_SETS = [
  ["kalem", "kelam"], ["deniz", "beniz"], ["masa", "yasa"], ["gölge", "bölge"],
  ["kurum", "kurul"], ["serin", "derin"], ["kanat", "sanat"], ["boya", "soya"],
  ["dalga", "damga"], ["kartal", "kantar"],
];

const SimilarWordsExercise = ({ ex, onFinish, onBack }) => {
  const { lang } = useT();
  const TOTAL = 8;
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [grid, setGrid] = useState([]);
  const [diffIdx, setDiffIdx] = useState(0);
  const [errors, setErrors] = useState(0);
  const [rts, setRts] = useState([]);
  const onsetRef = useRef(0);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!started || done) return;
    if (round >= TOTAL) {
      const meanRT = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
      setDone({ meanRT, errors, score: clamp(Math.round(100 - Math.max(0, meanRT - 900) / 25 - errors * 5)) });
      return;
    }
    const POOL = lang === "en" ? SIMILAR_SETS_EN : SIMILAR_SETS;
    const [base, similar] = POOL[Math.floor(Math.random() * POOL.length)];
    const idx = Math.floor(Math.random() * 9);
    setGrid(Array.from({ length: 9 }, (_, i) => (i === idx ? similar : base)));
    setDiffIdx(idx);
    onsetRef.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, started]);

  if (!started) return <TrainingReady ex={ex} onBack={onBack} onStart={() => setStarted(true)}
    lines={[{ tr: "Kutucuklardaki kelimelerden BİRİ diğerlerinden farklıdır.", en: "ONE of the words in the grid is different from the others." }, { tr: "Farklı olan kelimeye olabildiğince hızlı dokunun.", en: "Tap the different word as fast as you can." }, { tr: "Dikkat: kelimeler birbirine çok benzer!", en: "Careful: the words look very similar!" }]} />;

  if (done) return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Ort. Süre", en: "Avg. time" }, `${done.meanRT} ms`], [{ tr: "Hata", en: "Errors" }, done.errors], [{ tr: "Tur", en: "Rounds" }, TOTAL]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `${done.meanRT} ms avg.` : `${done.meanRT} ms ort.` })} />;

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-5 p-6" style={{ background: C.bg }}>
      <p className="text-sm" style={{ color: C.textMuted }}>{lang === "en" ? "Round" : "Tur"} {Math.min(round + 1, TOTAL)}/{TOTAL} · {lang === "en" ? "Find the different one" : "Farklı olanı bulun"} · {lang === "en" ? "Errors" : "Hata"}: {errors}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {grid.map((w, i) => (
          <button key={`${round}-${i}`} onClick={() => {
            if (i === diffIdx) { setRts((r) => [...r, Math.round(performance.now() - onsetRef.current)]); setRound((r) => r + 1); }
            else setErrors((e) => e + 1);
          }}
            className="px-4 py-4 rounded-xl text-base font-semibold kg-btn-pop"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
            {w}
          </button>
        ))}
      </div>
    </div>
  );
};

/* --- Tek mi? Çift mi? (hızlı karar) --- */
const OddEvenExercise = ({ ex, ageGroup, onFinish, onBack }) => {
  const { lang } = useT();
  const isKid = ageGroup?.id === "6-9";
  const TOTAL = 12;
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState("fix");
  const [num, setNum] = useState(0);
  const [duration, setDuration] = useState(Math.round(600 * ((ageGroup && ageGroup.windowFactor) || 1)));
  const [correctCount, setCorrectCount] = useState(0);
  const [minDur, setMinDur] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!started || done) return;
    if (round >= TOTAL) {
      const acc = Math.round((correctCount / TOTAL) * 100);
      const best = minDur ?? duration;
      setDone({ acc, best, score: clamp(Math.round(acc * 0.7 + clamp(100 - (best - 150) / 5) * 0.3)) });
      return;
    }
    setNum(10 + Math.floor(Math.random() * 90));
    setPhase("fix");
    const t1 = setTimeout(() => setPhase("flash"), 550);
    const t2 = setTimeout(() => setPhase("choose"), 550 + duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, started]);

  if (!started) return <TrainingReady ex={ex} onBack={onBack} onStart={() => setStarted(true)}
    lines={[{ tr: "Ekranda çok kısa süre bir sayı belirecek.", en: "A number will appear on screen very briefly." }, { tr: "Sayının TEK mi ÇİFT mi olduğuna hızla karar verin.", en: "Quickly decide if the number is ODD or EVEN." }, { tr: "Doğru yanıtladıkça süre kısalır.", en: "The duration shortens as you answer correctly." }]} />;

  if (done) return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Doğruluk", en: "Accuracy" }, `%${done.acc}`], [{ tr: "En kısa süre", en: "Shortest time" }, `${done.best} ms`], [{ tr: "Tur", en: "Rounds" }, TOTAL]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `${done.best} ms threshold · ${done.acc}%` : `${done.best} ms eşik · %${done.acc}` })} />;

  const choose = (pick) => {
    if (phase !== "choose") return;
    const isOdd = num % 2 === 1;
    if ((pick === "tek") === isOdd) {
      setCorrectCount((c) => c + 1);
      setDuration((d) => { const nd = Math.max(150, d - 40); setMinDur((m) => (m == null ? nd : Math.min(m, nd))); return nd; });
    } else {
      setDuration((d) => Math.min(900, d + 60));
    }
    setRound((r) => r + 1);
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 p-6" style={{ background: C.bg }}>
      <p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Round" : "Tur"} {Math.min(round + 1, TOTAL)}/{TOTAL} · {lang === "en" ? "Duration" : "Süre"}: {duration} ms</p>
      <div className="h-20 flex items-center justify-center">
        {phase === "fix" && <span className="text-3xl font-bold" style={{ color: C.textMuted }}>+</span>}
        {phase === "flash" && (isKid
              ? <div style={{ display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",maxWidth:200 }}>
                  {Array.from({length:num}).map((_,i)=><span key={i} style={{fontSize:28}}>⭐</span>)}
                </div>
              : <span className="text-6xl font-bold" style={{ color: C.text }}>{num}</span>
            )}
        {phase === "choose" && <span className="text-sm" style={{ color: C.textMuted }}>{lang === "en" ? "Was the number odd or even?" : "Sayı tek miydi, çift miydi?"}</span>}
      </div>
      <div className="flex gap-3" style={{ opacity: phase === "choose" ? 1 : 0.25, pointerEvents: phase === "choose" ? "auto" : "none" }}>
        <button onClick={() => choose("tek")} className="px-8 py-4 rounded-2xl text-lg font-bold text-white kg-btn-pop" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.accent1})` }}>{lang === "en" ? "ODD" : "TEK"}</button>
        <button onClick={() => choose("cift")} className="px-8 py-4 rounded-2xl text-lg font-bold text-white kg-btn-pop" style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.accent3})` }}>{lang === "en" ? "EVEN" : "ÇİFT"}</button>
      </div>
    </div>
  );
};


/* --- Zihinsel Aritmetik Sprint (adaptif işlem hızı) --- */
const FRUIT_EMOJIS = ["🍎","🍊","🍋","🍇","🍓","🫐","🥝","🍒"];
const ArithmeticSprintExercise = ({ ex, ageGroup, onFinish, onBack }) => {
  const { lang } = useT();
  const isKid = ageGroup?.id === "6-9";
  const TOTAL = 12;
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [problem, setProblem] = useState(null);
  const [windowMs, setWindowMs] = useState(Math.round(6000 * ((ageGroup && ageGroup.windowFactor) || 1)));
  const [correctCount, setCorrectCount] = useState(0);
  const [rts, setRts] = useState([]);
  const [done, setDone] = useState(null);
  const onsetRef = useRef(0);
  const timerRef = useRef(null);
  const answeredRef = useRef(false);

  const makeProblem = () => {
    const kind = isKid ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3);
    let a, b, ans, label;
    if (isKid) {
      a = 1 + Math.floor(Math.random() * 9); b = 1 + Math.floor(Math.random() * 9);
      if (kind === 0) { ans = a + b; label = "+"; } else { if (a < b) [a, b] = [b, a]; ans = a - b; label = "-"; }
    } else if (kind === 0) { a = 12 + Math.floor(Math.random() * 78); b = 12 + Math.floor(Math.random() * 78); ans = a + b; label = `${a} + ${b}`; }
    else if (kind === 1) { a = 30 + Math.floor(Math.random() * 69); b = 11 + Math.floor(Math.random() * (a - 12)); ans = a - b; label = `${a} − ${b}`; }
    else { a = 3 + Math.floor(Math.random() * 10); b = 3 + Math.floor(Math.random() * 7); ans = a * b; label = `${a} × ${b}`; }
    const opts = new Set([ans]);
    while (opts.size < 4) {
      const off = (1 + Math.floor(Math.random() * 9)) * (Math.random() < 0.5 ? -1 : 1);
      if (ans + off > 0) opts.add(ans + off);
    }
    return { label, ans, options: [...opts].sort(() => Math.random() - 0.5) };
  };

  useEffect(() => {
    if (!started || done) return;
    if (round >= TOTAL) {
      const acc = Math.round((correctCount / TOTAL) * 100);
      const meanRT = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : windowMs;
      setDone({ acc, meanRT, score: clamp(Math.round(acc * 0.65 + clamp(100 - (meanRT - 1200) / 40) * 0.35)) });
      return;
    }
    setProblem(makeProblem());
    answeredRef.current = false;
    onsetRef.current = performance.now();
    timerRef.current = setTimeout(() => answer(null), windowMs);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, started]);

  const answer = (v) => {
    if (answeredRef.current || !problem) return;
    answeredRef.current = true;
    clearTimeout(timerRef.current);
    if (v === problem.ans) {
      setCorrectCount((c) => c + 1);
      setRts((r) => [...r, Math.round(performance.now() - onsetRef.current)]);
      setWindowMs((w) => Math.max(2500, w - 350));
    } else {
      setWindowMs((w) => Math.min(8000, w + 300));
    }
    setTimeout(() => setRound((r) => r + 1), 200);
  };

  if (!started) return <TrainingReady ex={ex} onBack={onBack} onStart={() => setStarted(true)}
    lines={[{ tr: "Ekranda bir işlem belirecek (toplama, çıkarma, çarpma).", en: "An operation will appear (addition, subtraction, multiplication)." }, { tr: "Doğru sonucu 4 seçenekten süre dolmadan seçin.", en: "Pick the correct result from 4 options before time runs out." }, { tr: "Doğru yanıtladıkça süre kısalır — temponuzu koruyun.", en: "The window shrinks as you answer correctly — keep your pace." }]} />;

  if (done) return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Doğruluk", en: "Accuracy" }, `%${done.acc}`], [{ tr: "Ort. Süre", en: "Avg. time" }, `${done.meanRT} ms`], [{ tr: "Tur", en: "Rounds" }, TOTAL]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `${done.acc}% · ${done.meanRT} ms avg.` : `%${done.acc} · ${done.meanRT} ms ort.` })} />;

  const remainPct = 100;
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 p-6" style={{ background: C.bg }}>
      <p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Round" : "Tur"} {Math.min(round + 1, TOTAL)}/{TOTAL} · {lang === "en" ? "Window" : "Süre"}: {(windowMs / 1000).toFixed(1)} sn</p>
      {problem && (
        <>
          {isKid ? (
              <div key={round} style={{ display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",justifyContent:"center",animation:"kg-pop 0.3s ease" }}>
                <div style={{ display:"flex",flexWrap:"wrap",gap:4,maxWidth:100,justifyContent:"center" }}>
                  {Array.from({length:Math.min(a,9)}).map((_,i)=><span key={i} style={{fontSize:24}}>{FRUIT_EMOJIS[a%FRUIT_EMOJIS.length]}</span>)}
                  {a>9&&<span style={{fontSize:14,color:C.textMuted}}>+{a-9}</span>}
                </div>
                <span style={{fontSize:32,fontWeight:800,color:C.primary}}>{problem.label}</span>
                <div style={{ display:"flex",flexWrap:"wrap",gap:4,maxWidth:100,justifyContent:"center" }}>
                  {Array.from({length:Math.min(b,9)}).map((_,i)=><span key={i} style={{fontSize:24}}>{FRUIT_EMOJIS[(b+2)%FRUIT_EMOJIS.length]}</span>)}
                  {b>9&&<span style={{fontSize:14,color:C.textMuted}}>+{b-9}</span>}
                </div>
                <span style={{fontSize:28,fontWeight:800,color:C.textMuted}}>= ?</span>
              </div>
            ) : (
              <span key={round} className="text-5xl font-bold" style={{ color: C.text, animation: "kg-pop 0.3s ease" }}>{problem.label} = ?</span>
            )}
          <div className="grid grid-cols-2 gap-3">
            {problem.options.map((o) => (
              <button key={o} onClick={() => answer(o)} className="px-8 py-4 rounded-2xl text-xl font-bold kg-btn-pop"
                style={{ background: C.surface, color: C.text, border: `2px solid ${C.border}` }}>{o}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* --- Eş Anlam Avı (sözel hız) --- */
const SYNONYM_SETS = [
  ["hızlı", "çevik", ["yavaş", "durgun", "ağır", "sakin", "gevşek"]],
  ["büyük", "kocaman", ["ufak", "dar", "kısa", "ince", "minik"]],
  ["güzel", "hoş", ["çirkin", "kaba", "sert", "soluk", "donuk"]],
  ["zor", "çetin", ["kolay", "basit", "yalın", "rahat", "hafif"]],
  ["akıllı", "zeki", ["dalgın", "şaşkın", "yorgun", "sersem", "unutkan"]],
  ["cömert", "eli açık", ["cimri", "pinti", "kıskanç", "bencil", "kaba"]],
  ["sadık", "vefalı", ["hain", "dönek", "kaypak", "kararsız", "ilgisiz"]],
  ["kadim", "eski", ["yeni", "taze", "modern", "güncel", "körpe"]],
  ["neşeli", "şen", ["üzgün", "durgun", "asık", "kederli", "bezgin"]],
  ["cesur", "yürekli", ["korkak", "ürkek", "çekingen", "kaygılı", "sinik"]],
  ["misafir", "konuk", ["ev sahibi", "komşu", "yolcu", "tanıdık", "akraba"]],
  ["hediye", "armağan", ["borç", "ödül", "ceza", "ücret", "bahşiş"]],
  ["ilginç", "enteresan", ["sıradan", "olağan", "bayağı", "alelade", "monoton"]],
  ["özgür", "hür", ["tutsak", "bağlı", "esir", "kısıtlı", "mahkûm"]],
];
const SYNONYM_SETS_EN = [
  ["quick", "rapid", ["slow", "calm", "lazy", "dull", "heavy"]],
  ["big", "huge", ["tiny", "small", "narrow", "short", "slim"]],
  ["happy", "glad", ["sad", "angry", "tired", "bored", "upset"]],
  ["smart", "clever", ["dull", "slow", "silly", "dazed", "weary"]],
  ["brave", "bold", ["timid", "shy", "afraid", "meek", "wary"]],
  ["ancient", "old", ["new", "fresh", "modern", "recent", "young"]],
  ["gift", "present", ["debt", "fee", "fine", "wage", "tip"]],
  ["silent", "quiet", ["loud", "noisy", "harsh", "shrill", "rowdy"]],
  ["strange", "odd", ["usual", "normal", "plain", "common", "typical"]],
  ["loyal", "faithful", ["fickle", "false", "shifty", "distant", "cold"]],
];

const SynonymHuntExercise = ({ ex, onFinish, onBack }) => {
  const { lang } = useT();
  const TOTAL = 10;
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [current, setCurrent] = useState(null);
  const [errors, setErrors] = useState(0);
  const [rts, setRts] = useState([]);
  const [done, setDone] = useState(null);
  const onsetRef = useRef(0);
  const usedRef = useRef([]);

  useEffect(() => {
    if (!started || done) return;
    if (round >= TOTAL) {
      const meanRT = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
      setDone({ meanRT, errors, score: clamp(Math.round(clamp(100 - (meanRT - 1100) / 35) * 0.7 + clamp(100 - errors * 12) * 0.3)) });
      return;
    }
    const POOL = lang === "en" ? SYNONYM_SETS_EN : SYNONYM_SETS;
    let idx = Math.floor(Math.random() * POOL.length);
    if (usedRef.current.length < POOL.length) {
      while (usedRef.current.includes(idx)) idx = Math.floor(Math.random() * POOL.length);
    }
    usedRef.current.push(idx);
    const [target, syn, distractors] = POOL[idx];
    const boxes = [syn, ...distractors].sort(() => Math.random() - 0.5);
    setCurrent({ target, syn, boxes });
    onsetRef.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, started]);

  const pick = (w) => {
    if (!current) return;
    if (w === current.syn) {
      setRts((r) => [...r, Math.round(performance.now() - onsetRef.current)]);
      setRound((r) => r + 1);
    } else {
      setErrors((e) => e + 1);
    }
  };

  if (!started) return <TrainingReady ex={ex} onBack={onBack} onStart={() => setStarted(true)}
    lines={[{ tr: "Üstte bir hedef kelime göreceksiniz.", en: "You will see a target word at the top." }, { tr: "Kutulardan hedefle EŞ ANLAMLI olanı bulun.", en: "Find the SYNONYM of the target among the boxes." }, { tr: "Yanlış seçimler hata sayar — hızlı ama dikkatli olun.", en: "Wrong picks count as errors — be fast but careful." }]} />;

  if (done) return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Ort. Süre", en: "Avg. time" }, `${done.meanRT} ms`], [{ tr: "Hata", en: "Errors" }, done.errors], [{ tr: "Tur", en: "Rounds" }, TOTAL]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `${done.meanRT} ms avg. · ${done.errors} errors` : `${done.meanRT} ms ort. · ${done.errors} hata` })} />;

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 p-6" style={{ background: C.bg }}>
      <p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Round" : "Tur"} {Math.min(round + 1, TOTAL)}/{TOTAL} · {lang === "en" ? "Errors" : "Hata"}: {errors}</p>
      {current && (
        <>
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: C.textMuted }}>{lang === "en" ? "Synonym of:" : "Eş anlamlısı:"}</p>
            <span key={round} className="text-4xl font-bold" style={{ color: C.primary, animation: "kg-pop 0.3s ease" }}>{current.target}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {current.boxes.map((w) => (
              <button key={w} onClick={() => pick(w)} className="px-5 py-4 rounded-2xl text-base font-semibold kg-btn-pop"
                style={{ background: C.surface, color: C.text, border: `2px solid ${C.border}` }}>{w}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* --- Sayı Hafızası (adaptif dizi uzunluğu) --- */
const NumberMemoryExercise = ({ ex, ageGroup, onFinish, onBack }) => {
  const { lang } = useT();
  const TOTAL = 8;
  const spanStart = (ageGroup && ageGroup.spanStart) || 3;
  const spanMax = (ageGroup && ageGroup.spanMax) || 9;
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [span, setSpan] = useState(spanStart);
  const [digits, setDigits] = useState("");
  const [phase, setPhase] = useState("show");
  const [input, setInput] = useState("");
  const [best, setBest] = useState(spanStart - 1);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!started || done) return;
    if (round >= TOTAL) {
      const memory = clamp(((best - (spanStart - 1)) / (spanMax - (spanStart - 1))) * 100);
      setDone({ best, correctCount, score: Math.round(memory) });
      return;
    }
    let d = "";
    for (let i = 0; i < span; i++) {
      let n = Math.floor(Math.random() * 10);
      if (i > 0 && String(n) === d[i - 1]) n = (n + 3) % 10;
      d += n;
    }
    setDigits(d);
    setInput("");
    setPhase("show");
    const t = setTimeout(() => setPhase("input"), 700 + span * 620);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, started]);

  const submit = () => {
    if (input === digits) {
      setCorrectCount((c) => c + 1);
      setBest((b) => Math.max(b, span));
      setSpan((sp) => Math.min(spanMax, sp + 1));
    } else {
      setSpan((sp) => Math.max(2, sp - 1));
    }
    setRound((r) => r + 1);
  };

  if (!started) return <TrainingReady ex={ex} onBack={onBack} onStart={() => setStarted(true)}
    lines={[{ tr: "Ekranda kısa süre bir sayı dizisi göreceksiniz.", en: "A digit sequence will be shown briefly." }, { tr: "Kaybolunca diziyi tuş takımıyla aynı sırada girin.", en: "When it disappears, type it back in the same order." }, { tr: "Doğru bildikçe dizi uzar; yanılınca kısalır.", en: "The sequence grows as you succeed and shrinks when you miss." }]} />;

  if (done) return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "En uzun dizi", en: "Longest span" }, done.best], [{ tr: "Doğru", en: "Correct" }, `${done.correctCount}/${TOTAL}`], [{ tr: "Tur", en: "Rounds" }, TOTAL]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `span ${done.best}` : `${done.best} haneli dizi` })} />;

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-5 p-6" style={{ background: C.bg }}>
      <p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Round" : "Tur"} {Math.min(round + 1, TOTAL)}/{TOTAL} · {lang === "en" ? "Length" : "Uzunluk"}: {span}</p>
      <div className="h-16 flex items-center justify-center">
        {phase === "show" ? (
          <span key={round} className="text-5xl font-bold tracking-widest" style={{ color: C.text, animation: "kg-pop 0.3s ease" }}>{digits}</span>
        ) : (
          <span className="text-4xl font-bold tracking-widest" style={{ color: C.primary, minHeight: 40 }}>{input || "···"}</span>
        )}
      </div>
      {phase === "input" && (
        <div className="flex flex-col items-center gap-3">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "✓"].map((k) => (
              <button
                key={k}
                onClick={() => {
                  if (k === "⌫") setInput((v) => v.slice(0, -1));
                  else if (k === "✓") { if (input.length === digits.length) submit(); }
                  else if (input.length < digits.length) setInput((v) => v + k);
                }}
                className="w-16 h-14 rounded-xl text-xl font-bold kg-btn-pop"
                style={k === "✓"
                  ? { background: input.length === digits.length ? `linear-gradient(135deg, ${C.primary}, ${C.accent1})` : C.border, color: "#fff" }
                  : { background: C.surface, color: C.text, border: `2px solid ${C.border}` }}
              >
                {k}
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Enter the sequence and press ✓" : "Diziyi girin ve ✓ ile onaylayın"}</p>
        </div>
      )}
    </div>
  );
};


/* --- Görsel Örüntü Avı (programatik 3×3 matris bulmacaları — Raven paradigması, özgün üretim) --- */
const PATTERN_SHAPES = ["●", "▲", "■"];
const PATTERN_COLORS = ["#5B5CE2", "#F59E0B", "#10B981"];

function makePatternPuzzle() {
  const kind = Math.floor(Math.random() * 3);
  const perm = [...PATTERN_SHAPES].sort(() => Math.random() - 0.5);
  const cperm = [...PATTERN_COLORS].sort(() => Math.random() - 0.5);
  const cell = (shape, color, count = 1, size = 30) => ({ shape, color, count, size });

  let grid, answer;
  if (kind === 0) {
    // Latin karesi: her satır ve sütunda her şekil bir kez; renk sütuna bağlı
    grid = [0, 1, 2].map((r) => [0, 1, 2].map((c) => cell(perm[(r + c) % 3], cperm[c])));
    answer = grid[2][2];
  } else if (kind === 1) {
    // Sayı ilerlemesi: sütun boyunca adet 1→2→3; şekil satıra bağlı
    grid = [0, 1, 2].map((r) => [0, 1, 2].map((c) => cell(perm[r], cperm[r], c + 1, 20)));
    answer = grid[2][2];
  } else {
    // Boyut ilerlemesi: sütun boyunca küçük→orta→büyük; renk satıra bağlı
    grid = [0, 1, 2].map((r) => [0, 1, 2].map((c) => cell(perm[r], cperm[r], 1, 20 + c * 9)));
    answer = grid[2][2];
  }

  const key = (x) => `${x.shape}_${x.color}_${x.count}_${x.size}`;
  const opts = [answer];
  let guard = 0;
  while (opts.length < 4 && guard++ < 60) {
    const m = { ...answer };
    const mut = Math.floor(Math.random() * 3);
    if (mut === 0) m.shape = PATTERN_SHAPES[Math.floor(Math.random() * 3)];
    else if (mut === 1) m.color = PATTERN_COLORS[Math.floor(Math.random() * 3)];
    else if (kind === 1) m.count = 1 + Math.floor(Math.random() * 3);
    else m.size = 20 + Math.floor(Math.random() * 3) * 9;
    if (!opts.some((o) => key(o) === key(m))) opts.push(m);
  }
  return { grid, answer, options: opts.sort(() => Math.random() - 0.5), answerKey: key(answer), key };
}

const PatternCell = ({ cell, hidden, boxSize = 64 }) => (
  <div className="rounded-xl flex items-center justify-center" style={{ width: boxSize, height: boxSize, background: C.surface, border: `2px solid ${C.border}` }}>
    {hidden ? (
      <span className="text-2xl font-bold" style={{ color: C.textMuted }}>?</span>
    ) : (
      <span style={{ color: cell.color, fontSize: cell.size, lineHeight: 1, letterSpacing: cell.count > 1 ? 2 : 0 }}>
        {cell.shape.repeat(cell.count)}
      </span>
    )}
  </div>
);

const PatternHuntExercise = ({ ex, onFinish, onBack }) => {
  const { lang } = useT();
  const TOTAL = 8;
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [rts, setRts] = useState([]);
  const [done, setDone] = useState(null);
  const onsetRef = useRef(0);
  const answeredRef = useRef(false);

  useEffect(() => {
    if (!started || done) return;
    if (round >= TOTAL) {
      const acc = Math.round((correctCount / TOTAL) * 100);
      const meanRT = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
      setDone({ acc, meanRT, score: clamp(Math.round(acc * 0.75 + clamp(100 - (meanRT - 3000) / 120) * 0.25)) });
      return;
    }
    setPuzzle(makePatternPuzzle());
    answeredRef.current = false;
    onsetRef.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, started]);

  const pick = (o) => {
    if (answeredRef.current || !puzzle) return;
    answeredRef.current = true;
    if (puzzle.key(o) === puzzle.answerKey) {
      setCorrectCount((c) => c + 1);
      setRts((r) => [...r, Math.round(performance.now() - onsetRef.current)]);
    }
    setTimeout(() => setRound((r) => r + 1), 180);
  };

  if (!started) return <TrainingReady ex={ex} onBack={onBack} onStart={() => setStarted(true)}
    lines={[{ tr: "3×3 tabloda satır ve sütunlar bir kurala göre dizilir.", en: "The 3×3 grid follows a rule across rows and columns." }, { tr: "Kuralı çözüp eksik (?) hücreye geleni 4 seçenekten bulun.", en: "Crack the rule and pick what fits the missing (?) cell from 4 options." }, { tr: "Kural her turda değişebilir: şekil, adet veya boyut.", en: "The rule can change each round: shape, count or size." }]} />;

  if (done) return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Doğruluk", en: "Accuracy" }, `%${done.acc}`], [{ tr: "Ort. Süre", en: "Avg. time" }, `${(done.meanRT / 1000).toFixed(1)} sn`], [{ tr: "Tur", en: "Rounds" }, TOTAL]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `${done.acc}% pattern accuracy` : `%${done.acc} örüntü doğruluğu` })} />;

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-5 p-6" style={{ background: C.bg }}>
      <p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Round" : "Tur"} {Math.min(round + 1, TOTAL)}/{TOTAL}</p>
      {puzzle && (
        <>
          <div key={round} className="grid grid-cols-3 gap-2" style={{ animation: "kg-pop 0.3s ease" }}>
            {puzzle.grid.map((row, r) => row.map((c, ci) => (
              <PatternCell key={`${r}-${ci}`} cell={c} hidden={r === 2 && ci === 2} />
            )))}
          </div>
          <p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Which one completes the grid?" : "Tabloyu hangisi tamamlar?"}</p>
          <div className="flex gap-2">
            {puzzle.options.map((o, i) => (
              <button key={i} onClick={() => pick(o)} className="kg-btn-pop">
                <PatternCell cell={o} boxSize={56} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* --- Büyüyen Şekiller (görme alanı genişletme) --- */
const GROW_SHAPES = [
  { id: "daire", label: { tr: "Daire", en: "Circle" } }, { id: "kare", label: { tr: "Kare", en: "Square" } }, { id: "altigen", label: { tr: "Altıgen", en: "Hexagon" } },
  { id: "elips", label: { tr: "Elips", en: "Ellipse" } }, { id: "dikdortgen", label: { tr: "Dikdörtgen", en: "Rectangle" } },
];

const GrowShapeExercise = ({ ex, onFinish, onBack }) => {
  const { lang } = useT();
  const [shape, setShape] = useState("daire");
  const [period, setPeriod] = useState(1800);
  const [durationS, setDurationS] = useState(60);
  const [mode, setMode] = useState("config");
  const [elapsed, setElapsed] = useState(0);
  const [finalScore, setFinalScore] = useState(100);

  useEffect(() => {
    if (mode !== "run") return;
    if (elapsed >= durationS) { setFinalScore(100); setMode("done"); return; }
    const t = setTimeout(() => setElapsed((e) => e + 1), 1000);
    return () => clearTimeout(t);
  }, [mode, elapsed, durationS]);

  const shapeSvg = () => {
    const common = { fill: "none", stroke: "url(#gsGrad)", strokeWidth: 4 };
    if (shape === "kare") return <rect x="12" y="12" width="176" height="176" rx="10" {...common} />;
    if (shape === "dikdortgen") return <rect x="10" y="48" width="180" height="104" rx="10" {...common} />;
    if (shape === "elips") return <ellipse cx="100" cy="100" rx="94" ry="58" {...common} />;
    if (shape === "altigen") return <polygon points="100,8 184,54 184,146 100,192 16,146 16,54" {...common} />;
    return <circle cx="100" cy="100" r="90" {...common} />;
  };

  if (mode === "config") return (
    <div className="min-h-full flex items-center justify-center p-5" style={{ background: C.bg }}>
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ fontSize: 22 }}>{ex.icon}</span>
          <h2 className="font-semibold text-lg" style={{ color: C.text }}>{ex.name} — {lang === "en" ? "Settings" : "Ayarlar"}</h2>
        </div>
        <p className="text-xs mb-3" style={{ color: C.textMuted }}>{lang === "en" ? "Let your eyes follow the outline growing outward from the center; keep your head still." : "Gözünüz, merkezden dışa doğru büyüyen şeklin çizgisini takip etsin; başınız sabit kalsın."}</p>
        <div className="py-2.5 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: C.border }}>
          <span className="text-sm" style={{ color: C.text }}>{lang === "en" ? "Shape" : "Şekil"}</span>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {GROW_SHAPES.map((s) => (
              <button key={s.id} onClick={() => setShape(s.id)} className="px-2.5 py-1 rounded-full text-xs font-semibold kg-btn-pop"
                style={shape === s.id ? { background: `linear-gradient(135deg, ${C.primary}, ${C.accent2})`, color: "#fff" } : { background: C.bg, color: C.textMuted, border: `1px solid ${C.border}` }}>
                {L(s.label, lang)}
              </button>
            ))}
          </div>
        </div>
        <PillRow label={{ tr: "Büyüme hızı", en: "Growth speed" }} opts={[2800, 1800, 1100]} value={period} onChange={setPeriod} />
        <PillRow label={{ tr: "Süre (sn)", en: "Duration (s)" }} opts={[30, 60, 90]} value={durationS} onChange={setDurationS} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onBack}>{lang === "en" ? "Go back" : "Geri git"}</Button>
          <Button onClick={() => { setElapsed(0); setMode("run"); }}>{lang === "en" ? "Start" : "Başlat"}</Button>
        </div>
      </Card>
    </div>
  );

  if (mode === "run") return (
    <div className="min-h-full flex flex-col p-5" style={{ background: C.bg }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: C.text }}>{L(GROW_SHAPES.find((s) => s.id === shape)?.label, lang)}</span>
        <span className="text-xs" style={{ color: C.textMuted }}>{durationS - elapsed} {lang === "en" ? "s left" : "sn kaldı"}</span>
      </div>
      <div className="flex-1 rounded-2xl relative overflow-hidden flex items-center justify-center" style={{ background: C.surface, border: `1px solid ${C.border}`, minHeight: 340 }}>
        <svg viewBox="0 0 200 200" width="90%" height="90%" style={{ maxWidth: 420 }}>
          <defs>
            <linearGradient id="gsGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={C.primary} />
              <stop offset="100%" stopColor={C.accent2} />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="3" fill={C.primary} />
          <g style={{ transformOrigin: "100px 100px", animation: `kg-grow ${period}ms ease-in-out infinite` }}>
            {shapeSvg()}
          </g>
        </svg>
      </div>
      <p className="text-xs text-center mt-3 mb-2" style={{ color: C.textMuted }}>{lang === "en" ? "Focus on the growing outline, not the center dot." : "Ortadaki noktaya değil, büyüyen çizgiye odaklanın."}</p>
      <Button variant="ghost" className="mx-auto" onClick={() => { setFinalScore(clamp(Math.round((elapsed / durationS) * 100))); setMode("done"); }}>{lang === "en" ? "Finish" : "Bitir"}</Button>
    </div>
  );

  return (
    <TrainingResult
      kid={ex.kid}
      title={ex.name}
      score={finalScore}
      stats={[[{ tr: "Süre", en: "Time" }, `${durationS} sn`], [{ tr: "Hız", en: "Speed" }, `${(period / 1000).toFixed(1)} sn/tur`], [{ tr: "Şekil", en: "Shape" }, L(GROW_SHAPES.find((s) => s.id === shape)?.label, lang)]]}
      onFinish={() => onFinish({ score: finalScore, detail: `${L(GROW_SHAPES.find((s) => s.id === shape)?.label, lang)} · ${durationS} sn` })}
    />
  );
};

/* --- Blok Okuma Çalışması --- */
const BlockReadingExercise = ({ ex, ageGroup, initialText, onFinish, onBack }) => {
  const { lang } = useT();
  const [textObj, setTextObj] = useState(initialText || null);
  const blocks = useMemo(() => {
    if (!textObj) return [];
    const b = [];
    for (let i = 0; i < textObj.words.length; i += 3) b.push(textObj.words.slice(i, i + 3).join(" "));
    return b;
  }, [textObj]);
  const [phase, setPhase] = useState(initialText ? "select" : "pick");
  const [wpm, setWpm] = useState(200);
  const [bi, setBi] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (phase !== "read") return;
    if (bi >= blocks.length) { setPhase("quiz"); return; }
    const t = setTimeout(() => setBi((i) => i + 1), (3 * 60000) / wpm);
    return () => clearTimeout(t);
  }, [phase, bi, wpm, blocks]);

  if (phase === "pick") return (
    <TextPicker accent={ex.color} defaultLib={ageGroup && (ageGroup.id === "6-9" || ageGroup.id === "10-13") ? "cocuk" : "genel"}
      onBack={onBack} onPick={(t) => { setTextObj(t); setBi(0); setPhase("select"); }} />
  );

  if (phase === "select") return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
      <Card className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `linear-gradient(135deg, ${ex.color}, ${C.accent1})`, fontSize: 26 }}>{ex.icon}</div>
        <h2 className="font-semibold text-lg mb-1" style={{ color: C.text }}>{textObj.title}</h2>
        <p className="text-sm mb-4" style={{ color: C.textMuted }}>{lang === "en" ? "A highlight will move over the text in 3-word blocks. Follow only the highlighted block. Choose your speed:" : "Vurgu, metin üzerinde 3'er kelimelik bloklar halinde ilerleyecek. Gözünüz yalnızca vurgulu bloğu izlesin. Hızınızı seçin:"}</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[150, 200, 300].map((v) => (
            <button key={v} onClick={() => setWpm(v)} className="py-2 rounded-xl text-xs font-semibold kg-btn-pop"
              style={wpm === v ? { background: `linear-gradient(135deg, ${ex.color}, ${C.accent1})`, color: "#fff" } : { background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted }}>
              {v}<br />{lang === "en" ? "wpm" : "k/dk"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onBack}>{lang === "en" ? "Cancel" : "Vazgeç"}</Button>
          <Button className="flex-1" onClick={() => setPhase("read")}>{lang === "en" ? "Begin" : "Başla"}</Button>
        </div>
      </Card>
    </div>
  );

  if (phase === "read") return (
    <div className="min-h-full flex flex-col p-6" style={{ background: C.bg }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: C.text }}>{textObj.title}</span>
        <span className="text-xs" style={{ color: C.textMuted }}>{wpm} {lang === "en" ? "wpm" : "k/dk"} · %{Math.round((bi / blocks.length) * 100)}</span>
      </div>
      <Card className="flex-1">
        <p className="text-base leading-8" style={{ color: C.text }}>
          {blocks.map((b, i) => (
            <span key={i} className="rounded-md px-0.5" style={i === bi ? { background: `${ex.color}33`, color: C.text, fontWeight: 600 } : { color: i < bi ? C.textMuted : C.text, opacity: i < bi ? 0.55 : 1 }}>
              {b}{" "}
            </span>
          ))}
        </p>
      </Card>
    </div>
  );

  if (phase === "quiz") return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
      <Card className="w-full max-w-md">
        <h2 className="font-semibold mb-4" style={{ color: C.text }}>{lang === "en" ? "Comprehension Questions" : "Anlama Soruları"}</h2>
        {textObj.questions.map((q, qi) => (
          <div key={qi} className="mb-4">
            <p className="text-sm font-medium mb-2" style={{ color: C.text }}>{qi + 1}. {q.q}</p>
            <div className="flex flex-col gap-1.5">
              {q.options.map((o, oi) => (
                <button key={oi} onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  className="text-left px-3 py-2 rounded-xl text-sm"
                  style={answers[qi] === oi ? { background: "#EEF0FF", color: C.primary, border: `1px solid ${C.primary}55` } : { background: C.bg, color: C.textMuted, border: "1px solid transparent" }}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button className="w-full" disabled={Object.keys(answers).length < textObj.questions.length}
          onClick={() => {
            const correct = textObj.questions.filter((q, i) => answers[i] === q.answer).length;
            const comp = Math.round((correct / textObj.questions.length) * 100);
            setDone({ comp, score: clamp(Math.round(comp * 0.6 + clamp((wpm - 100) / 5) * 0.4)) });
            setPhase("done");
          }}>
          {lang === "en" ? "Submit" : "Tamamla"}
        </Button>
      </Card>
    </div>
  );

  return <TrainingResult kid={ex.kid} title={ex.name} score={done.score}
    stats={[[{ tr: "Hız", en: "Speed" }, `${wpm} wpm`], [{ tr: "Anlama", en: "Comprehension" }, `%${done.comp}`], [{ tr: "Blok", en: "Blocks" }, blocks.length]]}
    onFinish={() => onFinish({ score: done.score, detail: lang === "en" ? `${wpm} wpm · ${done.comp}% comprehension` : `${wpm} k/dk · %${done.comp} anlama` })} />;
};

/* --- Okuma Hızı Testi (kendi hızında + k/dk ölçümü) --- */
const ReadingTestExercise = ({ ex, ageGroup, initialText, onFinish, onBack }) => {
  const { lang } = useT();
  const [textObj, setTextObj] = useState(initialText || null);
  const [phase, setPhase] = useState(initialText ? "intro" : "pick");
  const [answers, setAnswers] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (phase !== "read") return;
    const t = setInterval(() => setElapsed(Math.round((performance.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  if (phase === "pick") return (
    <TextPicker accent={ex.color} defaultLib={ageGroup && (ageGroup.id === "6-9" || ageGroup.id === "10-13") ? "cocuk" : "genel"}
      onBack={onBack} onPick={(t) => { setTextObj(t); setAnswers({}); setPhase("intro"); }} />
  );

  if (phase === "intro") return (
    <TrainingReady ex={ex} onBack={onBack}
      onStart={() => { startRef.current = performance.now(); setElapsed(0); setPhase("read"); }}
      lines={[{ tr: "Metni normal hızınızda, anlayarak okuyun.", en: "Read the text at your normal pace, for understanding." }, { tr: "Bitirince 'Okumayı Bitirdim' butonuna basın.", en: "When done, press the 'I Finished Reading' button." }, { tr: "Ardından anlama soruları gelecek — hız ve anlama birlikte ölçülür.", en: "Comprehension questions follow — speed and understanding are measured together." }]} />
  );

  if (phase === "read") return (
    <div className="min-h-full flex flex-col p-6" style={{ background: C.bg }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: C.text }}>{textObj.title}</span>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: `${ex.color}1F`, color: ex.color }}>
          ⏱ {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      </div>
      <Card className="flex-1 mb-4">
        <p className="text-base leading-8" style={{ color: C.text }}>{textObj.words.join(" ")}</p>
      </Card>
      <Button className="w-full" onClick={() => { setElapsed(Math.max(1, Math.round((performance.now() - startRef.current) / 1000))); setPhase("quiz"); }}>
        {lang === "en" ? "I Finished Reading" : "Okumayı Bitirdim"}
      </Button>
    </div>
  );

  if (phase === "quiz") return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
      <Card className="w-full max-w-md">
        <h2 className="font-semibold mb-4" style={{ color: C.text }}>{lang === "en" ? "Comprehension Questions" : "Anlama Soruları"}</h2>
        {textObj.questions.map((q, qi) => (
          <div key={qi} className="mb-4">
            <p className="text-sm font-medium mb-2" style={{ color: C.text }}>{qi + 1}. {q.q}</p>
            <div className="flex flex-col gap-1.5">
              {q.options.map((o, oi) => (
                <button key={oi} onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  className="text-left px-3 py-2 rounded-xl text-sm"
                  style={answers[qi] === oi ? { background: "#EEF0FF", color: C.primary, border: `1px solid ${C.primary}55` } : { background: C.bg, color: C.textMuted, border: "1px solid transparent" }}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button className="w-full" disabled={Object.keys(answers).length < textObj.questions.length}
          onClick={() => {
            const correct = textObj.questions.filter((q, i) => answers[i] === q.answer).length;
            const comp = Math.round((correct / textObj.questions.length) * 100);
            const wpm = Math.round(textObj.words.length / (elapsed / 60));
            setDone({ comp, wpm, score: clamp(Math.round(comp * 0.5 + clamp((wpm - 100) / 4) * 0.5)) });
            setPhase("done");
          }}>
          {lang === "en" ? "Submit" : "Tamamla"}
        </Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
      <Card className="w-full max-w-sm text-center" style={{ animation: "kg-countup 0.4s ease" }}>
        <Check size={32} className="mx-auto mb-2" style={{ color: C.success }} />
        <h2 className="font-semibold text-lg mb-3" style={{ color: C.text }}>{lang === "en" ? "Your Reading Speed" : "Okuma Hızınız"}</h2>
        <div className="inline-flex items-baseline gap-1 px-4 py-2 rounded-2xl mb-3" style={{ background: `linear-gradient(135deg, ${ex.color}14, ${C.accent1}14)` }}>
          <span className="text-4xl font-bold" style={{ background: `linear-gradient(90deg, ${ex.color}, ${C.accent1})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{done.wpm}</span>
          <span style={{ color: C.textMuted }}>{lang === "en" ? "wpm" : "kelime/dk"}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl p-2" style={{ background: C.bg }}><p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Time" : "Süre"}</p><p className="text-sm font-semibold" style={{ color: C.text }}>{elapsed} {lang === "en" ? "s" : "sn"}</p></div>
          <div className="rounded-xl p-2" style={{ background: C.bg }}><p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Comprehension" : "Anlama"}</p><p className="text-sm font-semibold" style={{ color: C.text }}>%{done.comp}</p></div>
          <div className="rounded-xl p-2" style={{ background: C.bg }}><p className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Score" : "Skor"}</p><p className="text-sm font-semibold" style={{ color: C.text }}>{done.score}/100</p></div>
        </div>
        <p className="text-xs mb-4" style={{ color: C.textMuted }}>
          {lang === "en" ? "Note: Typical adult silent reading speed is roughly 150-250 wpm. If comprehension is low, try dropping the speed one step." : "Bilgi: Yetişkinlerde tipik sessiz okuma hızı yaklaşık 150-250 kelime/dk aralığındadır. Anlama oranı düşükse hızı bir kademe düşürmeyi deneyin."}
        </p>
        <Button className="w-full" onClick={() => onFinish({ score: done.score, wpm: done.wpm, comp: done.comp, detail: lang === "en" ? `${done.wpm} wpm · ${done.comp}% comprehension` : `${done.wpm} k/dk · %${done.comp} anlama` })}>{lang === "en" ? "Back to Training" : "Eğitime Dön"}</Button>
      </Card>
    </div>
  );
};

/* --- Eğitim kataloğu --- */
const TrainingCatalog = ({ trainings, ageGroup, program, onStartLevelTest, onSelect, onOpenLibrary }) => {
  const { lang, t } = useT();
  const wpmData = trainings.filter((t) => t.wpm).map((t, i) => ({ name: `Test ${i + 1}`, wpm: t.wpm }));
  const todaysPlan = program.level ? dayPlan(program.day, program.level) : [];
  const isKid = ageGroup?.id === "6-9";
  return (
  <div className="p-5 max-w-3xl mx-auto pb-24">
    <div className="flex justify-center mb-3">
      <PenguMascot state="greet" size={96} bubble={isKid
        ? { tr: "Merhaba! Bugün hangi oyunu oynayalım? 🐧", en: "Hi! Which game shall we play today? 🐧" }
        : { tr: "Bugün hangi egzersizle çalışalım? 🐧", en: "Which exercise shall we work on today? 🐧" }} />
    </div>
    <div className="flex items-center justify-between mb-1">
      <h1 className="text-xl font-semibold" style={{ color: C.text }}>{t("trainingTitle")}</h1>
      {ageGroup && (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: `${ageGroup.color}1F`, color: ageGroup.color }}>
          {ageGroup.emoji} {L(ageGroup.label, lang)}
        </span>
      )}
    </div>
    <p className="text-sm mb-5" style={{ color: C.textMuted }}>
      {t("trainingDesc")}
    </p>

    <button
      onClick={onOpenLibrary}
      className="w-full rounded-2xl p-4 mb-6 flex items-center justify-between gap-3 kg-btn-pop kg-gradient-anim text-left"
      style={{ background: `linear-gradient(120deg, ${C.secondary}, ${C.accent3}, ${C.primary})`, backgroundSize: "200% 200%" }}
    >
      <div>
        <p className="text-white font-semibold text-sm">📚 {t("libraryTitle")}</p>
        <p className="text-white text-xs mt-0.5" style={{ opacity: 0.85 }}>
          {READING_TEXTS.length} {t("libraryBanner")}
        </p>
      </div>
      <span className="px-3 py-1.5 rounded-xl text-sm font-medium flex-shrink-0" style={{ background: "#fff", color: C.secondary }}>{t("browse")}</span>
    </button>

    {!program.level ? (
      <Card className="mb-6 flex items-center justify-between gap-3 flex-wrap" style={{ borderLeft: `3px solid ${C.primary}` }}>
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: C.text }}>🎚️ {t("levelCardTitle")}</p>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
            {t("levelCardDesc")}
          </p>
        </div>
        <Button onClick={onStartLevelTest}>{t("startTest")}</Button>
      </Card>
    ) : (
      <Card className="mb-6" style={{ borderTop: `3px solid ${LEVEL_COLORS[program.level]}` }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <p className="text-sm font-semibold" style={{ color: C.text }}>
            🗓️ {t("dailyTraining")}
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${LEVEL_COLORS[program.level]}1F`, color: LEVEL_COLORS[program.level] }}>
              {program.level}
            </span>
          </p>
          <span className="text-xs font-semibold" style={{ color: C.textMuted }}>{t("dayWord")} {program.day}/{PROGRAM_LENGTH}</span>
        </div>
        <div className="w-full h-1.5 rounded-full mb-3" style={{ background: C.border }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${(program.completedDays / PROGRAM_LENGTH) * 100}%`, background: `linear-gradient(90deg, ${LEVEL_COLORS[program.level]}, ${C.accent1})` }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          {todaysPlan.map((exId, i) => {
            const entry = TRAINING_CATALOG.find((e) => e.id === exId);
            const doneToday = program.completedToday.includes(exId);
            return (
              <button key={`${exId}-${i}`} onClick={() => !doneToday && onSelect(entry)}
                className="flex items-center gap-2 rounded-xl p-2.5 text-left kg-btn-pop"
                style={doneToday
                  ? { background: "#DCFCE7", border: `1px solid ${C.success}55`, cursor: "default" }
                  : { background: C.bg, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 18 }}>{doneToday ? "✅" : entry?.icon}</span>
                <span className="text-xs font-medium" style={{ color: doneToday ? C.success : C.text }}>{L(entry?.name, lang)}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs" style={{ color: C.textMuted }}>{t("programHint")}</p>
      </Card>
    )}

    {wpmData.length >= 2 && (
      <Card className="mb-6">
        <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>📈 {t("wpmChart")}</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={wpmData}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
            <Tooltip />
            <Line type="monotone" dataKey="wpm" stroke={C.secondary} strokeWidth={3} dot={{ r: 5, fill: C.accent3, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    )}

    <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>{t("techniques")}</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      {TRAINING_TIPS.map((tp) => (
        <Card key={tp.icon} className="flex gap-3">
          <span style={{ fontSize: 22 }}>{tp.icon}</span>
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>{L(tp.title, lang)}</p>
            <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>{L(tp.text, lang)}</p>
          </div>
        </Card>
      ))}
    </div>

    {TRAINING_GROUPS.map((g) => (
      <div key={g.id}>
        <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>{L(g.title, lang)}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {TRAINING_CATALOG.filter((e) => e.cat === g.id).map((rawEx) => { const ex = exTheme(rawEx, ageGroup, lang); return (
        <Card key={ex.id} className="flex flex-col gap-2" style={{ borderTop: `3px solid ${ex.color}` }}>
          <span className="font-medium text-sm flex items-center gap-2" style={{ color: C.text }}>
            <span style={{ fontSize: 18 }}>{ex.icon}</span>{L(ex.name, lang)}
          </span>
          <p className="text-xs flex-1" style={{ color: C.textMuted }}>{L(ex.desc, lang)}</p>
          <div className="flex items-center justify-between text-xs" style={{ color: C.textMuted }}>
            <span className="flex items-center gap-1"><Clock size={12} />{ex.duration}</span>
          </div>
          <Button className="mt-1 w-full flex items-center justify-center gap-1"
            style={{ background: `linear-gradient(135deg, ${ex.color}, ${C.accent1})` }}
            onClick={() => onSelect(ex)}>
            <Play size={14} /> {t("start")}
          </Button>
        </Card>
          );
            })}
        </div>
      </div>
    ))}

    <Card>
      <h3 className="text-sm font-medium mb-3" style={{ color: C.text }}>{t("trainingHistory")}</h3>
      {trainings.length === 0 ? (
        <p className="text-sm" style={{ color: C.textMuted }}>{t("noExercises")}</p>
      ) : (
        <div className="flex flex-col">
          {[...trainings].reverse().map((t) => {
            const ex = TRAINING_CATALOG.find((e) => e.id === t.exerciseId);
            return (
              <div key={t.id} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ex?.color || C.primary}1F`, fontSize: 15 }}>{ex?.icon || "✦"}</span>
                  <div>
                    <p className="text-sm" style={{ color: C.text }}>{t.name}</p>
                    <p className="text-xs" style={{ color: C.textMuted }}>{new Date(t.date).toLocaleDateString(lang === "en" ? "en-US" : "tr-TR")} · {t.detail}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold" style={{ color: ex?.color || C.primary }}>{t.score}/100</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  </div>
  );
};

/* ============================================================
   ÖZ DEĞERLENDİRME TESTLERİ (anket tipi — tanı amaçlı değildir)
   ============================================================ */
const LIKERT_LABELS = { tr: ["Hiçbir zaman", "Nadiren", "Bazen", "Sık sık", "Neredeyse her zaman"], en: ["Never", "Rarely", "Sometimes", "Often", "Almost always"] };

const SIDE_BLURBS = {
  "Dışa dönük": { tr: "Enerjinizi insanlarla etkileşimden alırsınız.", en: "You draw energy from interacting with people." },
  "İçe dönük": { tr: "Enerjinizi kendi iç dünyanızdan toplarsınız.", en: "You recharge in your own inner world." },
  "Somut": { tr: "Ayrıntılara ve kanıtlanmış yöntemlere güvenirsiniz.", en: "You trust details and proven methods." },
  "Sezgisel": { tr: "Olasılıklar ve büyük resim sizi heyecanlandırır.", en: "Possibilities and the big picture excite you." },
  "Mantık odaklı": { tr: "Kararlarınızı nesnel ölçütlerle verirsiniz.", en: "You decide by objective criteria." },
  "Duygu odaklı": { tr: "Kararlarınızda insanların iyi oluşunu gözetirsiniz.", en: "You consider people's wellbeing in your decisions." },
  "Planlı": { tr: "Yapı ve öngörülebilirlik size iyi gelir.", en: "Structure and predictability suit you." },
  "Esnek": { tr: "Değişen koşullara kolay uyum sağlarsınız.", en: "You adapt easily to changing conditions." },
};

const SELF_TESTS = [
  {
    id: "personality",
    name: { tr: "Kişilik Eğilimleri (Kısa Form)", en: "Personality Tendencies (Short Form)" },
    icon: "🧭", color: "#22C55E", duration: "~3 dk",
    desc: { tr: "Dünyayı nasıl algıladığınıza ve nasıl karar verdiğinize dair temel eğilimleriniz.", en: "Your core tendencies in how you perceive the world and make decisions." },
    discover: { tr: ["Baskın eğilim profiliniz", "Güçlü yönleriniz", "Size iyi gelen çalışma biçimi"], en: ["Your dominant tendency profile", "Your strengths", "The work style that suits you"] },
    type: "binary",
    dims: {
      energy: { a: { tr: "Dışa dönük", en: "Extraverted" }, b: { tr: "İçe dönük", en: "Introverted" } },
      info: { a: { tr: "Somut", en: "Concrete" }, b: { tr: "Sezgisel", en: "Intuitive" } },
      decision: { a: { tr: "Mantık odaklı", en: "Logic-driven" }, b: { tr: "Duygu odaklı", en: "Feeling-driven" } },
      order: { a: { tr: "Planlı", en: "Structured" }, b: { tr: "Esnek", en: "Flexible" } },
    },
    questions: [
      { t: { tr: "Yoğun bir haftanın ardından enerjinizi nasıl toplarsınız?", en: "How do you recharge after a busy week?" }, a: { tr: "Arkadaşlarımla buluşarak", en: "By meeting friends" }, b: { tr: "Kendi başıma vakit geçirerek", en: "By spending time alone" }, dim: "energy" },
      { t: { tr: "Kalabalık bir ortamda genellikle…", en: "In a crowded setting, you usually…" }, a: { tr: "Sohbeti ben başlatırım", en: "Start the conversation myself" }, b: { tr: "Bana gelinmesini beklerim", en: "Wait for others to approach me" }, dim: "energy" },
      { t: { tr: "Yeni bir konu öğrenirken…", en: "When learning something new…" }, a: { tr: "Somut örnekler isterim", en: "I want concrete examples" }, b: { tr: "Büyük resmi ve fikirleri merak ederim", en: "I'm curious about the big picture and ideas" }, dim: "info" },
      { t: { tr: "Bir işte en çok…", en: "In a task, you most enjoy…" }, a: { tr: "Adım adım ilerlemeyi severim", en: "Progressing step by step" }, b: { tr: "Yeni olasılıklar keşfetmeyi severim", en: "Exploring new possibilities" }, dim: "info" },
      { t: { tr: "Karar verirken önce…", en: "When deciding, you first…" }, a: { tr: "Mantıklı olanı düşünürüm", en: "Think about what's logical" }, b: { tr: "İnsanları nasıl etkileyeceğini düşünürüm", en: "Think about how it affects people" }, dim: "decision" },
      { t: { tr: "Bir tartışmada…", en: "In a disagreement…" }, a: { tr: "Doğru olanı savunurum", en: "I defend what's right" }, b: { tr: "Uyumu korumaya çalışırım", en: "I try to preserve harmony" }, dim: "decision" },
      { t: { tr: "Tatil planınız genellikle…", en: "Your holiday plans are usually…" }, a: { tr: "Önceden ayrıntılı planlanır", en: "Planned in detail beforehand" }, b: { tr: "Akışına bırakılır", en: "Left to unfold naturally" }, dim: "order" },
      { t: { tr: "Son teslim tarihleri…", en: "Deadlines…" }, a: { tr: "Erkenden bitiririm", en: "I finish early" }, b: { tr: "Son ana enerjiyle çalışırım", en: "I work with last-minute energy" }, dim: "order" },
    ],
  },
  {
    id: "attention-habits",
    name: { tr: "Dikkat Alışkanlıkları Öz Değerlendirmesi", en: "Attention Habits Self-Assessment" },
    icon: "🎯", color: "#8B5CF6", duration: "~3 dk",
    desc: { tr: "Günlük yaşamda dikkatinizi nasıl yönettiğinize dair bir öz-farkındalık aracı. Tanı veya tarama testi değildir.", en: "A self-awareness tool about how you manage attention in daily life. Not a diagnostic or screening test." },
    discover: { tr: ["Dikkat dağınıklığı eğiliminiz", "Sizi en çok bölen alışkanlıklar", "Odak için pratik öneriler"], en: ["Your distractibility tendency", "The habits that interrupt you most", "Practical focus tips"] },
    type: "likert",
    questions: [
      { tr: "Bir işe başladıktan kısa süre sonra dikkatim başka yöne kayar.", en: "My attention drifts shortly after starting a task." },
      { tr: "Uzun metinleri okurken aynı satırı tekrar okumak zorunda kalırım.", en: "When reading long texts, I have to re-read the same line." },
      { tr: "Telefon bildirimleri çalışmamı sık sık böler.", en: "Phone notifications frequently interrupt my work." },
      { tr: "Başladığım işleri yarım bırakma eğilimim var.", en: "I tend to leave tasks unfinished." },
      { tr: "Toplantı veya derslerde zihnim başka yerlere gider.", en: "My mind wanders during meetings or classes." },
      { tr: "Eşyalarımı nereye koyduğumu unuturum.", en: "I forget where I put my things." },
      { tr: "Aynı anda birden çok işe atlayıp hiçbirini bitiremem.", en: "I jump between several tasks and finish none." },
      { tr: "Plan yapmakta değil, planı sürdürmekte zorlanırım.", en: "My struggle isn't making plans but sticking to them." },
    ],
    bands: [
      { min: 8, max: 16, label: { tr: "Düşük dağınıklık eğilimi", en: "Low distractibility" }, text: { tr: "Dikkatinizi gün içinde büyük ölçüde koruyabiliyorsunuz. Mevcut rutinleriniz sizin için çalışıyor görünüyor.", en: "You largely maintain your attention through the day. Your current routines seem to work for you." } },
      { min: 17, max: 27, label: { tr: "Orta düzey dağınıklık eğilimi", en: "Moderate distractibility" }, text: { tr: "Bazı durumlarda dikkatiniz bölünüyor. Bildirimleri kapatmak ve tek-görev odaklı kısa çalışma blokları denemek işinize yarayabilir.", en: "Your attention gets divided in some situations. Turning off notifications and trying short single-task work blocks may help." } },
      { min: 28, max: 40, label: { tr: "Belirgin dağınıklık eğilimi", en: "Notable distractibility" }, text: { tr: "Günlük yaşamda dikkat dağınıklığını sık deneyimliyor görünüyorsunuz. Bu bir tanı değildir; dikkatinizle ilgili süregelen bir endişeniz varsa bir uzmana danışmak en doğrusudur.", en: "You seem to experience frequent distraction in daily life. This is not a diagnosis; if you have an ongoing concern about your attention, consulting a professional is the right step." } },
    ],
  },
  {
    id: "procrastination",
    name: { tr: "Erteleme Eğilimi Testi", en: "Procrastination Tendency" },
    icon: "⏳", color: "#F59E0B", duration: "~2 dk",
    desc: { tr: "İşleri erteleme alışkanlıklarınıza dair bir öz-farkındalık aracı.", en: "A self-awareness tool about your task-postponing habits." },
    discover: { tr: ["Erteleme eğilim düzeyiniz", "Ertelemeyi tetikleyen kalıplarınız", "Başlamayı kolaylaştıran öneriler"], en: ["Your procrastination level", "Patterns that trigger delay", "Tips that make starting easier"] },
    type: "likert",
    questions: [
      { tr: "Görevleri son ana bırakırım.", en: "I leave tasks until the last moment." },
      { tr: "Zor işlere başlamak için 'doğru anı' beklerim.", en: "I wait for the 'right moment' to start hard tasks." },
      { tr: "Küçük işlerle oyalanıp asıl işi ertelerim.", en: "I busy myself with small tasks and postpone the real one." },
      { tr: "Ertelediğim için sonradan pişmanlık duyarım.", en: "I later regret having procrastinated." },
      { tr: "Teslim tarihi baskısı olmadan motive olamam.", en: "I can't get motivated without deadline pressure." },
      { tr: "Ertelemek planlarımı aksatır.", en: "Procrastination disrupts my plans." },
    ],
    bands: [
      { min: 6, max: 13, label: { tr: "Düşük erteleme eğilimi", en: "Low procrastination" }, text: { tr: "İşleri zamanında başlatma konusunda gücünüz var; bunu koruyun.", en: "Starting tasks on time is a strength of yours; keep it up." } },
      { min: 14, max: 21, label: { tr: "Orta düzey erteleme eğilimi", en: "Moderate procrastination" }, text: { tr: "Zaman zaman erteliyorsunuz. Büyük işleri 10 dakikalık 'sadece başla' adımlarına bölmek etkili bir tekniktir.", en: "You procrastinate from time to time. Breaking big tasks into 10-minute 'just start' steps is an effective technique." } },
      { min: 22, max: 30, label: { tr: "Yüksek erteleme eğilimi", en: "High procrastination" }, text: { tr: "Erteleme günlük akışınızı etkiliyor görünüyor. Görevleri küçültmek, ilk adımı önceden belirlemek ve dış hesap verebilirlik (birine söz vermek) işe yarayan yaklaşımlardır.", en: "Procrastination seems to affect your daily flow. Shrinking tasks, pre-deciding the first step and external accountability (promising someone) are approaches that work." } },
    ],
  },
  {
    id: "stress-load",
    name: { tr: "Stres Yükü Öz Değerlendirmesi", en: "Stress Load Self-Assessment" },
    icon: "🌊", color: "#06B6D4", duration: "~2 dk",
    desc: { tr: "Son dönemdeki stres yükünüze dair bir öz-farkındalık aracı. Klinik bir değerlendirme değildir.", en: "A self-awareness tool about your recent stress load. Not a clinical evaluation." },
    discover: { tr: ["Güncel stres yükü düzeyiniz", "Yükü artıran alanlar", "Kendinize alan açma önerileri"], en: ["Your current stress load", "Areas that add to the load", "Tips for making space for yourself"] },
    type: "likert",
    questions: [
      { tr: "Son zamanlarda kendimi sürekli yorgun hissediyorum.", en: "Lately I feel constantly tired." },
      { tr: "Uykuya dalmakta veya dinlenmiş uyanmakta zorlanıyorum.", en: "I struggle to fall asleep or wake up rested." },
      { tr: "Küçük şeylere eskisinden daha çabuk sinirleniyorum.", en: "I get irritated by small things more quickly than before." },
      { tr: "Zihnimi meşgul eden kaygılar günlük işlerimi etkiliyor.", en: "Worries occupying my mind affect my daily tasks." },
      { tr: "Kendime ayıracak zaman bulamıyorum.", en: "I can't find time for myself." },
      { tr: "Sorumluluklarım bana ağır geliyor.", en: "My responsibilities feel heavy." },
    ],
    bands: [
      { min: 6, max: 13, label: { tr: "Düşük stres yükü", en: "Low stress load" }, text: { tr: "Şu an dengeniz iyi görünüyor. Sizi besleyen rutinleri sürdürmeye devam edin.", en: "Your balance looks good right now. Keep the routines that nourish you." } },
      { min: 14, max: 21, label: { tr: "Orta düzey stres yükü", en: "Moderate stress load" }, text: { tr: "Yükünüz hissedilir düzeyde. Gün içine küçük molalar ve hareket eklemek, yükü paylaşabileceğiniz birileriyle konuşmak iyi gelebilir.", en: "Your load is noticeable. Adding small breaks and movement to your day, and talking with someone you can share the load with, may help." } },
      { min: 22, max: 30, label: { tr: "Yüksek stres yükü", en: "High stress load" }, text: { tr: "Son dönemde yükünüz yüksek görünüyor. Bu bir klinik değerlendirme değildir; kendinizi uzun süredir bunalmış hissediyorsanız güvendiğiniz biriyle konuşmak ve bir uzmandan destek almak iyi gelebilir.", en: "Your load has been high recently. This is not a clinical evaluation; if you've felt overwhelmed for a long time, talking to someone you trust and seeking professional support may help." } },
    ],
  },
  {
    id: "mini-iq",
    name: { tr: "Zihinsel Beceriler Mini Testi", en: "Mental Skills Mini Test" },
    icon: "🧩", color: "#EF4444", duration: "~4 dk",
    desc: { tr: "Mantık, örüntü ve sözel akıl yürütme sorularıyla kısa bir zihinsel egzersiz. IQ puanı vermez; doğruluk performansınızı gösterir.", en: "A short mental workout with logic, pattern and verbal reasoning questions. Does not produce an IQ score; it shows your accuracy performance." },
    discover: { tr: ["Doğru/yanlış dağılımınız", "Genel doğruluk oranınız", "Hangi soru tiplerinde zorlandığınız"], en: ["Your correct/wrong distribution", "Your overall accuracy", "Which question types challenge you"] },
    type: "quiz",
    questions: [
      { t: { tr: "2, 6, 12, 20, 30, ? dizisinde sıradaki sayı hangisidir?", en: "What is the next number in the sequence 2, 6, 12, 20, 30, ?" }, options: { tr: ["36", "40", "42", "44"], en: ["36", "40", "42", "44"] }, answer: 2 },
      { t: { tr: "KALEM : YAZMAK ise MAKAS : ?", en: "PEN : WRITING as SCISSORS : ?" }, options: { tr: ["Kesmek", "Dikmek", "Ölçmek", "Katlamak"], en: ["Cutting", "Sewing", "Measuring", "Folding"] }, answer: 0 },
      { t: { tr: "Hangisi diğerlerinden farklıdır?", en: "Which one is different from the others?" }, options: { tr: ["Elma", "Armut", "Havuç", "Kiraz"], en: ["Apple", "Pear", "Carrot", "Cherry"] }, answer: 2 },
      { t: { tr: "Saat tam 3'ü gösterirken akrep ile yelkovan arasındaki açı kaç derecedir?", en: "What is the angle between the hands of a clock at exactly 3 o'clock?" }, options: { tr: ["90", "60", "45", "120"], en: ["90", "60", "45", "120"] }, answer: 0 },
      { t: { tr: "5 kişilik bir grupta herkes birbiriyle bir kez tokalaşırsa toplam kaç tokalaşma olur?", en: "If everyone in a group of 5 shakes hands once with each other, how many handshakes occur?" }, options: { tr: ["10", "15", "20", "25"], en: ["10", "15", "20", "25"] }, answer: 0 },
      { t: { tr: "GÖZ : GÖRMEK ise KULAK : ?", en: "EYE : SEEING as EAR : ?" }, options: { tr: ["Dinlemek", "Duymak", "Konuşmak", "Anlamak"], en: ["Listening", "Hearing", "Speaking", "Understanding"] }, answer: 1 },
      { t: { tr: "3, 9, 27, 81, ? dizisinde sıradaki sayı hangisidir?", en: "What is the next number in the sequence 3, 9, 27, 81, ?" }, options: { tr: ["162", "216", "243", "324"], en: ["162", "216", "243", "324"] }, answer: 2 },
      { t: { tr: "Hangi kelime diğerlerinin üst kavramıdır?", en: "Which word is the umbrella term for the others?" }, options: { tr: ["Masa", "Sandalye", "Mobilya", "Dolap"], en: ["Table", "Chair", "Furniture", "Cabinet"] }, answer: 2 },
    ],
  },
  {
    id: "big5",
    name: { tr: "Beş Boyutlu Kişilik Profili", en: "Five-Factor Personality Profile" },
    icon: "🌟", color: "#0EA5E9", duration: "~3 dk",
    desc: { tr: "Beş temel kişilik boyutundaki eğilimlerinizin kısa bir profili.", en: "A short profile of your tendencies across five core personality dimensions." },
    discover: { tr: ["5 boyutta eğilim profiliniz", "Öne çıkan güçlü yönleriniz", "Boyut bazlı kısa yorumlar"], en: ["Your profile across 5 dimensions", "Your standout strengths", "Short per-dimension insights"] },
    type: "likert-dims",
    scale: { tr: ["Hiç katılmıyorum", "Katılmıyorum", "Kararsızım", "Katılıyorum", "Tamamen katılıyorum"], en: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"] },
    dims: {
      openness: { label: { tr: "Deneyime Açıklık", en: "Openness" }, high: { tr: "Yeni fikirler ve farklı bakış açıları sizi besliyor.", en: "New ideas and different perspectives nourish you." }, low: { tr: "Tanıdık ve kanıtlanmış yollar size güven veriyor.", en: "Familiar, proven paths give you confidence." } },
      consc: { label: { tr: "Sorumluluk", en: "Conscientiousness" }, high: { tr: "Plan ve düzen güçlü yanınız; işleri sonuca bağlarsınız.", en: "Planning and order are your strengths; you see things through." }, low: { tr: "Esnek ve spontane bir çalışma tarzınız var.", en: "You have a flexible, spontaneous working style." } },
      extra: { label: { tr: "Dışa Dönüklük", en: "Extraversion" }, high: { tr: "Sosyal etkileşim size enerji veriyor.", en: "Social interaction energizes you." }, low: { tr: "Enerjinizi sakin ve derin ortamlardan alıyorsunuz.", en: "You draw energy from calm, deep settings." } },
      agree: { label: { tr: "Uyumluluk", en: "Agreeableness" }, high: { tr: "İş birliği ve empati ilişkilerinizin merkezinde.", en: "Cooperation and empathy are central to your relationships." }, low: { tr: "Fikirlerinizi net savunur, gerektiğinde rekabetten çekinmezsiniz.", en: "You defend your views clearly and don't shy from competition." } },
      sensitivity: { label: { tr: "Duygusal Hassasiyet", en: "Emotional Sensitivity" }, high: { tr: "Duygularınızı yoğun yaşıyorsunuz; öz bakım rutinleri size iyi gelir.", en: "You feel emotions intensely; self-care routines serve you well." }, low: { tr: "Baskı altında sakin kalma eğilimindesiniz.", en: "You tend to stay calm under pressure." } },
    },
    questions: [
      { t: { tr: "Yeni fikirleri ve farklı bakış açılarını keşfetmekten keyif alırım.", en: "I enjoy exploring new ideas and different perspectives." }, dim: "openness" },
      { t: { tr: "Sanat, müzik veya edebiyat beni derinden etkiler.", en: "Art, music or literature moves me deeply." }, dim: "openness" },
      { t: { tr: "Planlarıma sadık kalır, işlerimi zamanında bitiririm.", en: "I stick to my plans and finish my work on time." }, dim: "consc" },
      { t: { tr: "Ayrıntılara özen gösteririm.", en: "I pay attention to details." }, dim: "consc" },
      { t: { tr: "Kalabalık ortamlarda enerjim yükselir.", en: "My energy rises in lively, crowded settings." }, dim: "extra" },
      { t: { tr: "Yeni insanlarla tanışmaktan keyif alırım.", en: "I enjoy meeting new people." }, dim: "extra" },
      { t: { tr: "İnsanların ihtiyaçlarını fark eder ve önemserim.", en: "I notice and care about people's needs." }, dim: "agree" },
      { t: { tr: "Çatışma yerine iş birliğini tercih ederim.", en: "I prefer cooperation over conflict." }, dim: "agree" },
      { t: { tr: "Küçük aksilikler modumu kolayca etkiler.", en: "Small setbacks easily affect my mood." }, dim: "sensitivity" },
      { t: { tr: "Endişelenmeye yatkınımdır.", en: "I am prone to worrying." }, dim: "sensitivity" },
    ],
  },
  {
    id: "overthinking",
    name: { tr: "Aşırı Düşünme Eğilimi", en: "Overthinking Tendency" },
    icon: "🔁", color: "#10B981", duration: "~2 dk",
    desc: { tr: "Zihinsel geviş getirme (tekrar tekrar düşünme) alışkanlıklarınıza dair bir öz-farkındalık aracı.", en: "A self-awareness tool about rumination (repetitive thinking) habits." },
    discover: { tr: ["Aşırı düşünme düzeyiniz", "Zihni meşgul eden döngüler", "Döngüyü kırma önerileri"], en: ["Your overthinking level", "The loops occupying your mind", "Tips for breaking the loop"] },
    type: "likert",
    questions: [
      { tr: "Verdiğim kararları sonrasında defalarca sorgularım.", en: "I repeatedly question decisions after making them." },
      { tr: "Geçmiş konuşmaları zihnimde tekrar tekrar oynatırım.", en: "I replay past conversations in my mind over and over." },
      { tr: "Olabilecek en kötü senaryoları detaylıca kurarım.", en: "I construct worst-case scenarios in detail." },
      { tr: "Basit seçimler bile bende uzun iç tartışmalara dönüşür.", en: "Even simple choices turn into long inner debates." },
      { tr: "Uykuya dalarken zihnim düşüncelerle dolar.", en: "My mind fills with thoughts as I try to fall asleep." },
      { tr: "Düşünmekten harekete geçmeye sıra gelmez.", en: "I never get from thinking to acting." },
    ],
    bands: [
      { min: 6, max: 13, label: { tr: "Düşük eğilim", en: "Low tendency" }, text: { tr: "Düşüncelerinizle sağlıklı bir mesafeniz var; karar verip ilerleyebiliyorsunuz.", en: "You keep a healthy distance from your thoughts; you can decide and move on." } },
      { min: 14, max: 21, label: { tr: "Orta düzey eğilim", en: "Moderate tendency" }, text: { tr: "Zaman zaman düşünce döngülerine kapılıyorsunuz. Karar için kendinize süre sınırı koymak ve düşünceleri kâğıda dökmek işe yarayan tekniklerdir.", en: "You occasionally get caught in thought loops. Setting a time limit for decisions and writing thoughts down are techniques that work." } },
      { min: 22, max: 30, label: { tr: "Yüksek eğilim", en: "High tendency" }, text: { tr: "Zihinsel döngüler enerjinizi alıyor görünüyor. 'Endişe saati' (günde 15 dk sınırlı düşünme zamanı) ve dikkat egzersizleri döngüyü kırmaya yardımcı olabilir.", en: "Mental loops seem to drain your energy. A 'worry hour' (15 minutes of contained thinking per day) and attention exercises can help break the loop." } },
    ],
  },
  {
    id: "burnout",
    name: { tr: "Enerji ve Tükenmişlik Öz Değerlendirmesi", en: "Energy & Burnout Self-Assessment" },
    icon: "🔋", color: "#F97316", duration: "~2 dk",
    desc: { tr: "Son dönem enerji düzeyinize dair bir öz-farkındalık aracı. Klinik bir değerlendirme değildir.", en: "A self-awareness tool about your recent energy level. Not a clinical evaluation." },
    discover: { tr: ["Güncel enerji düzeyiniz", "Enerjiyi tüketen alanlar", "Toparlanma önerileri"], en: ["Your current energy level", "What drains your energy", "Recovery suggestions"] },
    type: "likert",
    questions: [
      { tr: "Sabahları güne başlamakta zorlanıyorum.", en: "I struggle to start the day in the mornings." },
      { tr: "İşim/okulum bittiğinde kendimde hiç enerji kalmıyor.", en: "I have no energy left when work/school ends." },
      { tr: "Eskiden keyif aldığım şeyler artık yorucu geliyor.", en: "Things I used to enjoy now feel exhausting." },
      { tr: "Hafta sonu dinlensem de toparlanamıyorum.", en: "Even after resting on weekends, I don't recover." },
      { tr: "Kendimi işlerime karşı mesafeli ve isteksiz hissediyorum.", en: "I feel distant and unmotivated toward my work." },
      { tr: "Verimliliğimin düştüğünü fark ediyorum.", en: "I notice my productivity has dropped." },
    ],
    bands: [
      { min: 6, max: 13, label: { tr: "Enerji düzeyi iyi", en: "Energy level good" }, text: { tr: "Şu an enerjiniz dengede görünüyor. Dinlenme rutinlerinizi korumaya devam edin.", en: "Your energy seems balanced right now. Keep protecting your rest routines." } },
      { min: 14, max: 21, label: { tr: "Enerji azalıyor", en: "Energy declining" }, text: { tr: "Yorgunluk birikiyor olabilir. Küçük molalar, hareket ve iş dışı keyif alanları toparlanmayı destekler.", en: "Fatigue may be accumulating. Small breaks, movement and enjoyable non-work activities support recovery." } },
      { min: 22, max: 30, label: { tr: "Belirgin tükenmişlik hissi", en: "Notable burnout feeling" }, text: { tr: "Uzun süredir böyle hissediyorsanız bu yükü tek başınıza taşımak zorunda değilsiniz; güvendiğiniz biriyle konuşmak ve bir uzmandan destek almak iyi gelebilir. Bu değerlendirme klinik bir tanı aracı değildir.", en: "If you've felt this way for a long time, you don't have to carry this weight alone; talking to someone you trust and seeking professional support may help. This assessment is not a clinical diagnostic tool." } },
    ],
  },
  {
    id: "impostor",
    name: { tr: "Kendinden Şüphe (Impostor) Eğilimi", en: "Self-Doubt (Impostor) Tendency" },
    icon: "🎭", color: "#64748B", duration: "~2 dk",
    desc: { tr: "Başarılarınızı sahiplenme biçiminize dair bir öz-farkındalık aracı.", en: "A self-awareness tool about how you own your achievements." },
    discover: { tr: ["Kendinden şüphe düzeyiniz", "Başarıyı nasıl açıkladığınız", "Öz-değer önerileri"], en: ["Your self-doubt level", "How you explain success", "Self-worth suggestions"] },
    type: "likert",
    questions: [
      { tr: "Başarılarımı şansa veya tesadüfe bağlarım.", en: "I attribute my successes to luck or coincidence." },
      { tr: "İnsanların bir gün 'aslında yetersiz olduğumu' anlayacağından endişelenirim.", en: "I worry people will one day discover I'm 'actually inadequate'." },
      { tr: "Övgü aldığımda hak etmediğimi düşünürüm.", en: "When praised, I feel I don't deserve it." },
      { tr: "Hatalarım yeteneksizliğimin kanıtı gibi gelir.", en: "My mistakes feel like proof of incompetence." },
      { tr: "Kendimi çevremdekilerden daha az yetkin hissederim.", en: "I feel less competent than the people around me." },
      { tr: "Yeni bir işe başlamadan önce başarısız olacağımı varsayarım.", en: "Before starting something new, I assume I'll fail." },
    ],
    bands: [
      { min: 6, max: 13, label: { tr: "Düşük eğilim", en: "Low tendency" }, text: { tr: "Başarılarınızı büyük ölçüde sahiplenebiliyorsunuz — değerli bir beceri.", en: "You largely own your achievements — a valuable skill." } },
      { min: 14, max: 21, label: { tr: "Orta düzey eğilim", en: "Moderate tendency" }, text: { tr: "Zaman zaman kendinizden şüphe ediyorsunuz. Başarılarınızı somut kanıtlarla (bitirdiğiniz işlerin listesi gibi) görünür kılmak dengeyi destekler.", en: "You doubt yourself from time to time. Making your successes visible with concrete evidence (like a list of finished work) supports balance." } },
      { min: 22, max: 30, label: { tr: "Yüksek eğilim", en: "High tendency" }, text: { tr: "Kendinden şüphe sık tekrarlıyor görünüyor. Bu yaygın bir deneyimdir ve yetersizliğin kanıtı değildir; başarı kayıtları tutmak ve güvendiğiniz kişilerden gerçekçi geri bildirim almak yardımcı olabilir.", en: "Self-doubt seems to recur often. This is a common experience and not proof of inadequacy; keeping success records and getting realistic feedback from people you trust can help." } },
    ],
  },
  {
    id: "life-satisfaction",
    name: { tr: "Yaşam Doyumu Öz Değerlendirmesi", en: "Life Satisfaction Self-Assessment" },
    icon: "🌤️", color: "#38BDF8", duration: "~2 dk",
    desc: { tr: "Yaşamınızdan aldığınız genel doyuma dair bir öz-farkındalık aracı. Klinik bir değerlendirme değildir.", en: "A self-awareness tool about your overall life satisfaction. Not a clinical evaluation." },
    discover: { tr: ["Güncel doyum düzeyiniz", "Sizi besleyen alanlar", "Küçük iyileştirme önerileri"], en: ["Your current satisfaction level", "The areas that nourish you", "Small improvement tips"] },
    type: "likert",
    questions: [
      { tr: "Hayatımdan genel olarak memnunum.", en: "Overall, I am satisfied with my life." },
      { tr: "Günlük yaşamımda bana keyif veren şeyler var.", en: "There are things in my daily life that bring me joy." },
      { tr: "Kendimi enerjik ve motive hissediyorum.", en: "I feel energetic and motivated." },
      { tr: "İlişkilerimde desteklendiğimi hissediyorum.", en: "I feel supported in my relationships." },
      { tr: "Geleceğe umutla bakıyorum.", en: "I look to the future with hope." },
      { tr: "Şu anki yaşamım, olmasını istediğim yaşama yakın.", en: "My current life is close to the life I want." },
    ],
    bands: [
      { min: 6, max: 13, label: { tr: "Düşük yaşam doyumu", en: "Low life satisfaction" }, text: { tr: "Son dönemde doyumunuz düşük görünüyor. Bu bir klinik değerlendirme değildir; gün içine küçük keyif anları eklemek ve güvendiğiniz biriyle konuşmak iyi gelebilir. Bu his uzun süredir devam ediyorsa bir uzmandan destek almayı düşünebilirsiniz.", en: "Your satisfaction seems low lately. This is not a clinical evaluation; adding small moments of joy to your day and talking to someone you trust may help. If this feeling has persisted for a long time, consider seeking professional support." } },
      { min: 14, max: 21, label: { tr: "Orta düzey yaşam doyumu", en: "Moderate life satisfaction" }, text: { tr: "Bazı alanlar sizi besliyor, bazıları geliştirilebilir görünüyor. Sizi iyi hissettiren aktiviteleri bilinçli olarak takviminize eklemek dengeyi güçlendirir.", en: "Some areas nourish you; others look improvable. Deliberately scheduling activities that make you feel good strengthens the balance." } },
      { min: 22, max: 30, label: { tr: "Yüksek yaşam doyumu", en: "High life satisfaction" }, text: { tr: "Yaşamınızla aranız iyi görünüyor. Sizi besleyen rutinleri ve ilişkileri korumaya devam edin.", en: "You seem on good terms with your life. Keep protecting the routines and relationships that nourish you." } },
    ],
  },
  {
    id: "anger",
    name: { tr: "Öfke Eğilimi Öz Değerlendirmesi", en: "Anger Tendency Self-Assessment" },
    icon: "🔥", color: "#F43F5E", duration: "~2 dk",
    desc: { tr: "Öfkeyi deneyimleme ve ifade etme biçiminize dair bir öz-farkındalık aracı. Klinik bir değerlendirme değildir.", en: "A self-awareness tool about how you experience and express anger. Not a clinical evaluation." },
    discover: { tr: ["Öfke eğilim düzeyiniz", "Sizi tetikleyen durum kalıpları", "Sakinleşme önerileri"], en: ["Your anger tendency level", "The situations that trigger you", "Calming suggestions"] },
    type: "likert",
    questions: [
      { tr: "Küçük aksiliklerde bile öfkemin yükseldiğini hissederim.", en: "I feel my anger rise even at small setbacks." },
      { tr: "Öfkelendiğimde sonradan pişman olacağım sözler söylerim.", en: "When angry, I say things I later regret." },
      { tr: "Sinirlendiğimde sakinleşmem uzun sürer.", en: "It takes me a long time to calm down once upset." },
      { tr: "Trafikte veya sırada beklerken tahammülüm hızla tükenir.", en: "My patience runs out fast in traffic or queues." },
      { tr: "Öfkemi içimde biriktirir, sonra bir anda patlarım.", en: "I bottle up anger, then explode all at once." },
      { tr: "Öfkem ilişkilerimi veya işimi olumsuz etkiliyor.", en: "My anger negatively affects my relationships or work." },
    ],
    bands: [
      { min: 6, max: 13, label: { tr: "Düşük öfke eğilimi", en: "Low anger tendency" }, text: { tr: "Öfkenizle aranızda sağlıklı bir mesafe var; tetiklenmeleri büyük ölçüde yönetebiliyorsunuz.", en: "You keep a healthy distance from your anger; you largely manage your triggers." } },
      { min: 14, max: 21, label: { tr: "Orta düzey öfke eğilimi", en: "Moderate anger tendency" }, text: { tr: "Bazı durumlar öfkenizi hızla yükseltiyor. Tetikleyici günlüğü tutmak, tepki vermeden önce kısa bir mola vermek ve yavaş nefes egzersizleri işe yarayan tekniklerdir.", en: "Some situations raise your anger quickly. Keeping a trigger journal, taking a short pause before reacting and slow breathing exercises are techniques that work." } },
      { min: 22, max: 30, label: { tr: "Belirgin öfke eğilimi", en: "Notable anger tendency" }, text: { tr: "Öfke günlük yaşamınızı etkiliyor görünüyor. Bu bir klinik değerlendirme değildir; öfkeniz ilişkilerinize veya işinize zarar veriyorsa bir uzmanla çalışmak somut fayda sağlayabilir.", en: "Anger seems to affect your daily life. This is not a clinical evaluation; if anger is harming your relationships or work, working with a professional can bring concrete benefits." } },
    ],
  },
  {
    id: "communication-style",
    name: { tr: "İletişim Tarzı Profili", en: "Communication Style Profile" },
    icon: "🗣️", color: "#8B5CF6", duration: "~3 dk",
    desc: { tr: "Kendinizi ifade etme biçiminizin üç eksendeki (açık, pasif, baskın) kısa bir profili.", en: "A short profile of how you express yourself across three axes (assertive, passive, dominant)." },
    discover: { tr: ["Baskın iletişim tarzınız", "Eksen bazlı eğilim yüzdeleri", "İlişkileri rahatlatan öneriler"], en: ["Your dominant communication style", "Per-axis tendency percentages", "Tips that ease relationships"] },
    type: "likert-dims",
    scale: { tr: ["Hiç katılmıyorum", "Katılmıyorum", "Kararsızım", "Katılıyorum", "Tamamen katılıyorum"], en: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"] },
    dims: {
      assertive: { label: { tr: "Açık (Atılgan) İletişim", en: "Assertive Communication" }, high: { tr: "İhtiyaçlarınızı saygılı ve net ifade ediyorsunuz — sağlıklı iletişimin temeli.", en: "You express your needs clearly and respectfully — the foundation of healthy communication." }, low: { tr: "Açık ifade kasınızı güçlendirmek ilişkilerinizi rahatlatabilir; 'ben dili' iyi bir başlangıçtır.", en: "Strengthening your clear-expression muscle can ease your relationships; 'I statements' are a good start." } },
      passive: { label: { tr: "Pasif İletişim", en: "Passive Communication" }, high: { tr: "Çatışmadan kaçınmak için kendi ihtiyaçlarınızı sık geri plana atıyor olabilirsiniz; küçük konularda fikir belirterek başlayabilirsiniz.", en: "You may often set your needs aside to avoid conflict; start by voicing opinions on small matters." }, low: { tr: "Kendi ihtiyaçlarınızı geri plana atma eğiliminiz düşük.", en: "Your tendency to set your own needs aside is low." } },
      dominant: { label: { tr: "Baskın İletişim", en: "Dominant Communication" }, high: { tr: "Haklılığınızı korurken karşı tarafın alanını daraltıyor olabilirsiniz; yumuşatıcı dil ve dinleme molaları dengeyi kurar.", en: "You may narrow the other side's space while defending your point; softening language and listening pauses restore balance." }, low: { tr: "Baskın üslup eğiliminiz düşük.", en: "Your tendency toward a dominant tone is low." } },
    },
    questions: [
      { t: { tr: "Bir şey beni rahatsız ettiğinde bunu saygılı bir dille dile getiririm.", en: "When something bothers me, I voice it respectfully." }, dim: "assertive" },
      { t: { tr: "Hayır demem gerektiğinde gerekçemi açıklayarak hayır derim.", en: "When I need to say no, I say it and explain why." }, dim: "assertive" },
      { t: { tr: "Eleştiri alırken savunmaya geçmeden dinleyebilirim.", en: "I can listen to criticism without getting defensive." }, dim: "assertive" },
      { t: { tr: "Karşımdakini kırmamak için kendi isteğimden vazgeçerim.", en: "I give up what I want so as not to upset the other person." }, dim: "passive" },
      { t: { tr: "Rahatsız olsam da 'önemli değil' der geçerim.", en: "Even when bothered, I say 'it's fine' and move on." }, dim: "passive" },
      { t: { tr: "Grup kararlarında fikrimi söylemek yerine çoğunluğa uyarım.", en: "In group decisions, I follow the majority instead of voicing my view." }, dim: "passive" },
      { t: { tr: "Tartışmalarda sesim hızla yükselir.", en: "My voice rises quickly in arguments." }, dim: "dominant" },
      { t: { tr: "Haksız olduğunu düşündüğüm kişinin sözünü keserim.", en: "I interrupt people I think are wrong." }, dim: "dominant" },
      { t: { tr: "İstediğimi elde etmek için sert bir üslup kullanabilirim.", en: "I can use a harsh tone to get what I want." }, dim: "dominant" },
    ],
  },
];

const SelfTestIntro = ({ test, onStart, onBack }) => {
  const { lang, t } = useT();
  return (
  <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
    <Card className="w-full max-w-sm text-center" style={{ animation: "kg-countup 0.4s ease" }}>
      <button onClick={onBack} className="text-xs flex items-center gap-1 mb-3" style={{ color: C.textMuted }}><ArrowLeft size={14} /> {lang === "en" ? "Back" : "Geri"}</button>
      <div className="mb-1">
        <PenguMascot state="idle" size={80} bubble={{ tr: "Doğru ya da yanlış yok — içinden geldiği gibi işaretle 🐧", en: "No right or wrong — answer as you feel 🐧" }} />
      </div>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `linear-gradient(135deg, ${test.color}, ${C.accent1})`, fontSize: 30 }}>{test.icon}</div>
      <h2 className="font-semibold text-lg mb-2" style={{ color: C.text }}>{L(test.name, lang)}</h2>
      <div className="flex justify-center gap-2 mb-3">
        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#EEF0FF", color: C.primary }}>⏱ {test.duration}</span>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#EEF0FF", color: C.primary }}>❓ {test.questions.length} Soru</span>
      </div>
      <p className="text-sm mb-4" style={{ color: C.textMuted }}>{L(test.desc, lang)}</p>
      <div className="text-left rounded-xl p-3 mb-4" style={{ background: C.bg }}>
        <p className="text-xs font-semibold mb-2" style={{ color: C.text }}>{t("discover")}</p>
        {L(test.discover, lang).map((d) => (
          <p key={d} className="text-xs flex items-start gap-1.5 mb-1" style={{ color: C.textMuted }}>
            <Check size={13} style={{ color: test.color, marginTop: 1 }} className="flex-shrink-0" /> {d}
          </p>
        ))}
      </div>
      <Button className="w-full" style={{ background: `linear-gradient(135deg, ${test.color}, ${C.accent1})` }} onClick={onStart}>{t("startTest")}</Button>
    </Card>
  </div>
  );
};

const SelfTestRunner = ({ test, onExit }) => {
  const { lang, t: tt } = useT();
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [phase, setPhase] = useState("run");
  const [outcome, setOutcome] = useState(null);
  const total = test.questions.length;

  const computeOutcome = (finalAnswers) => {
    if (test.type === "binary") {
      const counts = {};
      Object.keys(test.dims).forEach((k) => (counts[k] = { a: 0, b: 0 }));
      test.questions.forEach((q, i) => { counts[q.dim][finalAnswers[i] === "a" ? "a" : "b"]++; });
      const sides = Object.entries(test.dims).map(([k, d]) => (counts[k].a >= counts[k].b ? d.a : d.b));
      return { sides };
    }
    if (test.type === "quiz") {
      const correct = test.questions.filter((q, i) => finalAnswers[i] === q.answer).length;
      const wrong = total - correct;
      return { correct, wrong, acc: Math.round((correct / total) * 100) };
    }
    if (test.type === "likert-dims") {
      const dims = Object.entries(test.dims).map(([k, d]) => {
        const idxs = test.questions.map((q, i) => ({ q, i })).filter((x) => x.q.dim === k);
        const avg = idxs.reduce((a, x) => a + finalAnswers[x.i], 0) / idxs.length;
        const pct = Math.round(((avg - 1) / 4) * 100);
        return { key: k, label: L(d.label, lang), pct, blurb: pct >= 70 ? L(d.high, lang) : pct <= 40 ? L(d.low, lang) : (lang === "en" ? "You are at a balanced level in this dimension." : "Bu boyutta dengeli bir düzeydesiniz.") };
      });
      return { dims };
    }
    const sum = finalAnswers.reduce((a, v) => a + v, 0);
    const band = test.bands.find((b) => sum >= b.min && sum <= b.max) || test.bands[test.bands.length - 1];
    const pctInRange = Math.round(((sum - total) / (total * 4)) * 100);
    return { sum, band, pctInRange };
  };

  // Sunucudan gelen ham sonucu, yerel computeOutcome ile AYNI şekle dönüştürür
  // (render kodu tek bir şekil bekler; kaynak API veya yerel fark etmez)
  const hydrateOutcome = (raw) => {
    if (!raw) return null;
    if (test.type === "binary") return { sides: raw.sides };
    if (test.type === "quiz") return { correct: raw.correct, wrong: raw.wrong, acc: raw.acc };
    if (test.type === "likert-dims") {
      const balanced = lang === "en" ? "You are at a balanced level in this dimension." : "Bu boyutta dengeli bir düzeydesiniz.";
      return { dims: raw.dims.map((d) => ({ key: d.key, label: L(d.label, lang), pct: d.pct, blurb: d.blurb ? L(d.blurb, lang) : balanced })) };
    }
    const pctInRange = Math.round(((raw.sum - total) / (total * 4)) * 100);
    return { sum: raw.sum, band: raw.band, pctInRange };
  };

  const answer = (v) => {
    const na = [...answers];
    na[qi] = v;
    setAnswers(na);
    if (qi + 1 < total) {
      setTimeout(() => setQi(qi + 1), 180);
    } else {
      setPhase("grading");
      (async () => {
        // Değerlendirme mantığı (bant eşikleri, doğru cevaplar) öncelikle sunucuda çalışır.
        // API erişilemezse yerel hesaplama devam eder — çevrimdışı sürekliliği bozmaz.
        const server = await api.submitSelfTest(test.id, na);
        const hydrated = server && server.outcome ? hydrateOutcome(server.outcome) : null;
        setOutcome(hydrated || computeOutcome(na));
        setPhase("result");
      })();
    }
  };

  if (phase === "grading") {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3" style={{ background: C.bg }}>
        <NovaCore size={64} />
        <p className="text-sm" style={{ color: C.textMuted }}>{lang === "en" ? "Evaluating your answers…" : "Yanıtlarınız değerlendiriliyor…"}</p>
      </div>
    );
  }

  if (phase === "result" && outcome) {
    const summaryText =
      test.type === "binary" ? outcome.sides.map((x) => L(x, lang)).join(" · ")
      : test.type === "quiz" ? (lang === "en" ? `${outcome.acc}% accuracy (${outcome.correct}/${total})` : `%${outcome.acc} doğruluk (${outcome.correct}/${total})`)
      : test.type === "likert-dims" ? (() => { const top = [...outcome.dims].sort((a, b) => b.pct - a.pct)[0]; return lang === "en" ? `Most prominent: ${top.label} (${top.pct}%)` : `En belirgin: ${top.label} (%${top.pct})`; })()
      : L(outcome.band.label, lang);
    const summary = { id: uid(), testId: test.id, name: L(test.name, lang), icon: test.icon, color: test.color, date: new Date().toISOString(), summaryText, answers };
    return (
      <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
        <Card className="w-full max-w-md text-center" style={{ animation: "kg-countup 0.4s ease" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `linear-gradient(135deg, ${test.color}, ${C.accent1})`, fontSize: 26 }}>{test.icon}</div>
          <h2 className="font-semibold text-lg mb-4" style={{ color: C.text }}>{L(test.name, lang)}</h2>

          {test.type === "binary" ? (
            <>
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {outcome.sides.map((s) => (
                  <span key={L(s, "tr")} className="px-3 py-1.5 rounded-full text-sm font-semibold text-white" style={{ background: `linear-gradient(90deg, ${test.color}, ${C.accent1})` }}>{L(s, lang)}</span>
                ))}
              </div>
              <div className="text-left rounded-xl p-3 mb-4 flex flex-col gap-1.5" style={{ background: C.bg }}>
                {outcome.sides.map((s) => (
                  <p key={L(s, "tr")} className="text-xs" style={{ color: C.textMuted }}><b style={{ color: C.text }}>{L(s, lang)}:</b> {L(SIDE_BLURBS[L(s, "tr")], lang)}</p>
                ))}
              </div>
            </>
          ) : test.type === "quiz" ? (
            <>
              <p className="text-3xl font-bold mb-3" style={{ background: `linear-gradient(90deg, ${test.color}, ${C.accent1})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>%{outcome.acc}</p>
              <div className="text-left rounded-xl p-3 mb-4 flex flex-col gap-2" style={{ background: C.bg }}>
                <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-1.5" style={{ color: C.text }}><Check size={15} style={{ color: C.success }} /> {lang === "en" ? "Correct" : "Doğru"}</span><b style={{ color: C.text }}>{outcome.correct}</b></div>
                <div className="flex items-center justify-between text-sm border-t pt-2" style={{ borderColor: C.border }}><span className="flex items-center gap-1.5" style={{ color: C.text }}><X size={15} style={{ color: C.danger }} /> {lang === "en" ? "Wrong" : "Yanlış"}</span><b style={{ color: C.text }}>{outcome.wrong}</b></div>
                <div className="flex items-center justify-between text-sm border-t pt-2" style={{ borderColor: C.border }}><span style={{ color: C.text }}>🎯 {lang === "en" ? "Accuracy" : "Doğruluk"}</span><b style={{ color: C.text }}>%{outcome.acc}</b></div>
              </div>
            </>
          ) : test.type === "likert-dims" ? (
            <div className="text-left mb-4 flex flex-col gap-3">
              {outcome.dims.map((d) => (
                <div key={d.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium" style={{ color: C.text }}>{d.label}</span>
                    <span style={{ color: C.textMuted }}>%{d.pct}</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: C.border }}>
                    <div className="h-2 rounded-full" style={{ width: `${d.pct}%`, background: `linear-gradient(90deg, ${test.color}, ${C.accent1})` }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: C.textMuted }}>{d.blurb}</p>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="text-xl font-bold mb-2" style={{ color: test.color }}>{L(outcome.band.label, lang)}</p>
              <div className="w-full h-2.5 rounded-full mb-1" style={{ background: C.border }}>
                <div className="h-2.5 rounded-full" style={{ width: `${clamp(outcome.pctInRange)}%`, background: `linear-gradient(90deg, ${C.success}, ${C.warning}, ${C.danger})` }} />
              </div>
              <p className="text-xs mb-3" style={{ color: C.textMuted }}>Puan: {outcome.sum} / {total * 5}</p>
              <p className="text-sm text-left rounded-xl p-3 mb-4" style={{ background: C.bg, color: C.textMuted }}>{L(outcome.band.text, lang)}</p>
            </>
          )}

          <div className="rounded-xl p-3 mb-4 text-xs flex gap-2 text-left" style={{ background: "#FFF7ED", color: "#9A3412" }}>
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{tt("selfDisclaimer")}</p>
          </div>

          <Button className="w-full" onClick={() => onExit(summary)}>{tt("backToCatalog")}</Button>
        </Card>
      </div>
    );
  }

  const q = test.questions[qi];
  return (
    <div className="min-h-full flex flex-col p-6" style={{ background: C.bg }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: C.text }}>{L(test.name, lang)}</span>
        <span className="text-xs" style={{ color: C.textMuted }}>{qi + 1}/{total}</span>
      </div>
      <div className="w-full h-1.5 rounded-full mb-8" style={{ background: C.border }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${((qi + 1) / total) * 100}%`, background: `linear-gradient(90deg, ${test.color}, ${C.accent1})` }} />
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full" key={qi} style={{ animation: "kg-countup 0.3s ease" }}>
        {test.type === "binary" ? (
          <>
            <p className="text-lg font-semibold text-center mb-6" style={{ color: C.text }}>{L(q.t, lang)}</p>
            <div className="flex flex-col gap-3">
              {["a", "b"].map((side) => (
                <button key={side} onClick={() => answer(side)}
                  className="px-4 py-4 rounded-2xl text-sm font-medium kg-btn-pop"
                  style={answers[qi] === side
                    ? { background: "#EEF0FF", border: `2px solid ${C.primary}`, color: C.primary }
                    : { background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
                  {L(q[side], lang)}
                </button>
              ))}
            </div>
          </>
        ) : test.type === "quiz" ? (
          <>
            <p className="text-lg font-semibold text-center mb-6" style={{ color: C.text }}>{L(q.t, lang)}</p>
            <div className="flex flex-col gap-2">
              {L(q.options, lang).map((opt, oi) => (
                <button key={oi} onClick={() => answer(oi)}
                  className="px-4 py-3 rounded-2xl text-sm font-medium kg-btn-pop"
                  style={answers[qi] === oi
                    ? { background: "#EEF0FF", border: `2px solid ${C.primary}`, color: C.primary }
                    : { background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
                  {opt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-center mb-6" style={{ color: C.text }}>{typeof q === "string" ? q : q.t ? L(q.t, lang) : L(q, lang)}</p>
            <div className="flex flex-col gap-2">
              {L(test.scale || LIKERT_LABELS, lang).map((label, i) => (
                <button key={i} onClick={() => answer(i + 1)}
                  className="px-4 py-3 rounded-2xl text-sm font-medium text-left kg-btn-pop"
                  style={answers[qi] === i + 1
                    ? { background: "#EEF0FF", border: `2px solid ${C.primary}`, color: C.primary }
                    : { background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {qi > 0 && (
        <button onClick={() => setQi(qi - 1)} className="text-xs flex items-center gap-1 mx-auto mt-4" style={{ color: C.textMuted }}>
          <ArrowLeft size={14} /> {tt("prevQ")}
        </button>
      )}
    </div>
  );
};

/* ============================================================
   USER: TEST CATALOG
   ============================================================ */
const MEASURE_EN = { "Dikkat": "Attention", "Tutarlılık": "Consistency", "Dürtü Kontrolü": "Impulse Control", "Hız": "Speed", "Bilişsel Esneklik": "Cognitive Flexibility", "Bellek": "Memory", "Görsel Dikkat": "Visual Attention", "İşitsel Dikkat": "Auditory Attention", "Esneklik": "Flexibility", "Çeldirici Direnci": "Distractor Resistance" };

const TEST_ACCENTS = {
  "sustained-attention": { color: "#5B5CE2", glyph: "🎯" },
  "go-nogo": { color: "#22C55E", glyph: "🚦" },
  "stroop": { color: "#EC4899", glyph: "🌈" },
  "working-memory": { color: "#8B5CF6", glyph: "🧠" },
  "visual-search": { color: "#06B6D4", glyph: "🔍" },
  "auditory": { color: "#F59E0B", glyph: "🔊" },
  "cognitive-flexibility": { color: "#EF4444", glyph: "🔀" },
};

const TestCatalog = ({ onSelect, onSelectSelf, ageGroup, onChangeAge }) => {
  const { lang, t } = useT();
  const isKidCat = ageGroup?.id === "6-9";
  return (
  <div className="p-5 max-w-3xl mx-auto pb-24">
    <div className="flex justify-center mb-3">
      <PenguMascot state="greet" size={92} bubble={isKidCat
        ? { tr: "Hangi oyunu deneyelim? Hepsi çok eğlenceli! 🐧", en: "Which game shall we try? They're all fun! 🐧" }
        : { tr: "Bugün hangi testi çözelim? 🐧", en: "Which test shall we take today? 🐧" }} />
    </div>
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h1 className="text-xl font-semibold" style={{ color: C.text }}>{t("catalogTitle")}</h1>
      {ageGroup && (
        <button
          onClick={onChangeAge}
          className="px-3 py-1.5 rounded-full text-xs font-semibold text-white kg-btn-pop flex items-center gap-1.5"
          style={{ background: `linear-gradient(90deg, ${ageGroup.color}, ${C.accent1})` }}
        >
          {ageGroup.emoji} {L(ageGroup.label, lang)} · {t("change")}
        </button>
      )}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {TEST_CATALOG.map((tc) => {
        const accent = TEST_ACCENTS[tc.id] || { color: C.primary, glyph: "✦" };
        return (
        <Card key={tc.id} className="flex flex-col gap-2" style={{ borderTop: `3px solid ${accent.color}` }}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm flex items-center gap-2" style={{ color: C.text }}>
              <span style={{ fontSize: 18 }}>{accent.glyph}</span>{L(tc.name, lang)}
            </span>
            {!tc.implemented && <Badge tone="muted"><Lock size={10} className="inline mr-1" />{t("soon")}</Badge>}
          </div>
          <p className="text-xs" style={{ color: C.textMuted }}>{L(tc.desc, lang)}</p>
          <div className="flex gap-1.5 flex-wrap">
            {tc.measures.map((m) => <Badge key={m}>{lang === "en" ? (MEASURE_EN[m] || m) : m}</Badge>)}
          </div>
          <div className="flex items-center justify-between mt-1 text-xs" style={{ color: C.textMuted }}>
            <span className="flex items-center gap-1"><Clock size={12} />{tc.duration}</span>
            <span>{tc.difficulty}</span>
          </div>
          <Button
            className="mt-2 w-full flex items-center justify-center gap-1"
            disabled={!tc.implemented}
            style={tc.implemented ? { background: `linear-gradient(135deg, ${accent.color}, ${C.accent1})`, color: "#fff" } : undefined}
            onClick={() => onSelect(tc)}
          >
            <Play size={14} /> {t("start")}
          </Button>
        </Card>
        );
      })}
    </div>

    <div className="flex items-center justify-between mt-8 mb-1">
      <h2 className="text-lg font-semibold" style={{ color: C.text }}>{t("selfTitle")}</h2>
    </div>
    <p className="text-xs mb-4" style={{ color: C.textMuted }}>
      {t("selfNote")}
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {SELF_TESTS.map((st) => (
        <Card key={st.id} className="flex flex-col gap-2" style={{ borderTop: `3px solid ${st.color}` }}>
          <span className="font-medium text-sm flex items-center gap-2" style={{ color: C.text }}>
            <span style={{ fontSize: 18 }}>{st.icon}</span>{L(st.name, lang)}
          </span>
          <p className="text-xs flex-1" style={{ color: C.textMuted }}>{L(st.desc, lang)}</p>
          <div className="flex items-center justify-between text-xs" style={{ color: C.textMuted }}>
            <span className="flex items-center gap-1"><Clock size={12} />{st.duration}</span>
            <span>{st.questions.length} {t("q")}</span>
          </div>
          <Button
            className="mt-1 w-full flex items-center justify-center gap-1"
            style={{ background: `linear-gradient(135deg, ${st.color}, ${C.accent1})` }}
            onClick={() => onSelectSelf(st)}
          >
            <Play size={14} /> {t("start")}
          </Button>
        </Card>
      ))}
    </div>
  </div>
  );
};

/* ============================================================
   USER: INSTRUCTIONS / COUNTDOWN
   ============================================================ */
const Instructions = ({ test, onStart, onBack }) => {
  const { lang, t } = useT();
  const accent = TEST_ACCENTS[test.id] || { color: C.primary, glyph: "✦" };
  return (
  <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
    <Card className="w-full max-w-sm text-center">
      <div className="mb-2">
        <PenguMascot state="thinking" size={88} bubble={{ tr: "Sessiz bir yer bul, odaklan — başlıyoruz! 🎯", en: "Find a quiet spot and focus — here we go! 🎯" }} />
      </div>
      <h2 className="font-semibold text-lg mb-2" style={{ color: C.text }}>{L(test.name, lang)}</h2>
      {test.age && (
        <div className="mb-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: `${test.age.color}1F`, color: test.age.color }}>
            {test.age.emoji} {L(test.age.label, lang)} {t("version")}
          </span>
        </div>
      )}
      <p className="text-sm mb-1" style={{ color: C.textMuted }}>{L(test.desc, lang)}</p>
      <p className="text-sm mb-4" style={{ color: C.textMuted }}>{t("duration")} {lang === "en" ? String(test.duration).replace("dk", "min") : test.duration} {t("willTake")}</p>
      <div className="text-left text-sm rounded-xl p-3 mb-4" style={{ background: C.bg, color: C.textMuted }}>
        <p>• {t("inst1")}</p>
        <p>• {t("inst2")}</p>
        <p>• {t("inst3")}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onBack}>{t("cancel")}</Button>
        <Button className="flex-1" onClick={onStart}>{t("startTest")}</Button>
      </div>
    </Card>
  </div>
  );
};

const Countdown = ({ onDone }) => {
  const { lang } = useT();
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) { const t = setTimeout(onDone, 500); return () => clearTimeout(t); }
    const t = setTimeout(() => setN((x) => x - 1), 800);
    return () => clearTimeout(t);
  }, [n]);
  const COUNT_COLORS = { 3: C.danger, 2: C.warning, 1: C.secondary, 0: C.success };
  return (
    <div
      className="min-h-full flex items-center justify-center kg-gradient-anim"
      style={{ background: `linear-gradient(120deg, ${C.text}, #2A2D3E, ${C.text})` }}
    >
      <span
        key={n}
        className="text-white text-7xl font-bold"
        style={{ animation: "kg-pop 0.6s ease", color: n === 0 ? C.success : COUNT_COLORS[n] }}
      >
        {n === 0 ? (lang === "en" ? "GO" : "BAŞLA") : n}
      </span>
    </div>
  );
};

/* ============================================================
   AUDIO ENGINE (for the auditory attention test)
   ============================================================ */
let sharedAudioCtx = null;
function playTone(freq) {
  try {
    if (!sharedAudioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      sharedAudioCtx = new AC();
    }
    const ctx = sharedAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio unavailable (e.g. autoplay policy) — test remains playable without sound.
  }
}

/* ============================================================
   USER: TEST RUNNER (the test engine)
   ============================================================ */
const TestRunner = ({ test, onFinish, onAbort }) => {
  const { lang } = useT();
  const [trials] = useState(() => buildTrials(test));
  const [index, setIndex] = useState(0);
  const [events, setEvents] = useState([]);
  const onsetRef = useRef(0);
  const answeredRef = useRef(false);
  const timeoutRef = useRef(null);
  const sessionId = useRef(uid());

  useEffect(() => {
    const handleVis = () => { if (document.hidden && onAbort) onAbort(); };
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trial = trials[index];
  const [blockIntro, setBlockIntro] = useState(() => (test.type === "distractor-cpt" ? 0 : null));
  const introShownRef = useRef(new Set(test.type === "distractor-cpt" ? [0] : []));
  const distractTimersRef = useRef([]);
  const BASE_WINDOW =
    test.type === "stroop" ? 2200 :
    test.type === "visual-search" ? 3500 :
    test.type === "auditory" ? 1400 :
    test.type === "cognitive-flexibility" ? 2000 :
    1200;
  const RESPONSE_WINDOW = Math.round(BASE_WINDOW * ((test.age && test.age.windowFactor) || 1));

  useEffect(() => {
    if (index >= trials.length) return;
    // Blok arası ekranı: yeni bloğa girerken 1.6 sn tanıtım göster, sayaç durdurulur.
    if (test.type === "distractor-cpt" && trial && trial.blockStart && blockIntro === null && !introShownRef.current.has(trial.block)) {
      introShownRef.current.add(trial.block);
      setBlockIntro(trial.block);
      return;
    }
    if (blockIntro !== null) {
      const t = setTimeout(() => setBlockIntro(null), index === 0 ? 1900 : 1600);
      return () => clearTimeout(t);
    }
    answeredRef.current = false;
    onsetRef.current = performance.now();
    if (test.type === "auditory" && trials[index]) playTone(trials[index].freq);
    // İşitsel çeldiriciler: yanıt penceresi içinde 1-2 rastgele kısa ton
    if (test.type === "distractor-cpt" && trial && trial.audioDistract) {
      const n = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < n; k++) {
        const delay = 150 + Math.random() * (RESPONSE_WINDOW * 0.6);
        distractTimersRef.current.push(setTimeout(() => playTone(240 + Math.random() * 700), delay));
      }
    }
    timeoutRef.current = setTimeout(() => handleResponse(null), RESPONSE_WINDOW);
    return () => {
      clearTimeout(timeoutRef.current);
      distractTimersRef.current.forEach(clearTimeout);
      distractTimersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, blockIntro]);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  const handleResponse = (response) => {
    if (answeredRef.current || !trial) return;
    answeredRef.current = true;
    clearTimeout(timeoutRef.current);
    const rt = response == null ? null : Math.round(performance.now() - onsetRef.current);

    let correct = false;
    let errorType = null;

    if (test.type === "target-detection" || test.type === "distractor-cpt") {
      if (trial.target) {
        correct = response === "tap";
        if (!correct) errorType = "omission";
      } else {
        correct = response == null;
        if (!correct) errorType = "commission";
      }
    } else if (test.type === "go-nogo" || test.type === "auditory") {
      if (trial.go) {
        correct = response === "tap";
        if (!correct) errorType = "omission";
      } else {
        correct = response == null;
        if (!correct) errorType = "commission";
      }
    } else if (test.type === "stroop") {
      correct = response === trial.ink;
      if (!correct) errorType = response == null ? "omission" : "commission";
    } else if (test.type === "visual-search") {
      correct = response === trial.targetIndex;
      if (!correct) errorType = response == null ? "omission" : "commission";
    } else if (test.type === "cognitive-flexibility") {
      correct = response === trial.correctCategory;
      if (!correct) errorType = response == null ? "omission" : "commission";
    }

    setEvents((prev) => [...prev, {
      timestamp: Date.now(),
      event: "response",
      stimulus: trial.stimulusId,
      response: response ?? "none",
      reactionTime: rt,
      correct,
      errorType,
      switchTrial: trial.switchTrial ?? null,
      block: trial.block ?? null,
      sessionId: sessionId.current,
    }]);

    setTimeout(advance, 150);
  };

  useEffect(() => {
    if (index >= trials.length && trials.length > 0) {
      const finalEvents = events;
      const timer = setTimeout(() => onFinish(finalEvents), 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (index >= trials.length) return null;

  const progress = Math.round((index / trials.length) * 100);

  return (
    <div className="min-h-full flex flex-col" style={{ background: C.bg }}>
      <div className="px-6 pt-6">
        <div className="w-full h-1.5 rounded-full" style={{ background: C.border }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: C.primary }} />
        </div>
        <p className="text-xs text-center mt-2" style={{ color: C.textMuted }}>%{progress}</p>
      </div>

      <div className="flex-1 flex items-center justify-center relative" style={{ overflow: "hidden" }}>
        {test.type === "distractor-cpt" && blockIntro !== null && (
          <div className="flex flex-col items-center gap-3 text-center px-8" style={{ animation: "kg-pop 0.4s ease" }}>
            <span style={{ fontSize: 52 }}>{DISTRACTOR_BLOCKS[blockIntro].icon}</span>
            <span className="text-lg font-semibold" style={{ color: C.text }}>
              {lang === "en" ? "Block" : "Blok"} {blockIntro + 1}/4 — {L(DISTRACTOR_BLOCKS[blockIntro].label, lang)}
            </span>
            <span className="text-sm" style={{ color: C.textMuted }}>{L(DISTRACTOR_BLOCKS[blockIntro].hint, lang)}</span>
          </div>
        )}

        {test.type === "distractor-cpt" && blockIntro === null && trial && (
          <>
            {trial.visualDistract && trial.distractors.map((d, di) => (
              <span
                key={`${trial.id}-d${di}`}
                className="absolute pointer-events-none select-none"
                style={{ top: `${d.top}%`, left: `${d.left}%`, fontSize: d.size, color: d.color, opacity: 0.85, animation: d.anim }}
              >
                {d.glyph}
              </span>
            ))}
            <button key={trial.id} onClick={() => handleResponse("tap")} className="flex flex-col items-center gap-4" style={{ animation: "kg-pop 0.35s ease" }}>
              <span style={{ fontSize: 90, color: COLOR_HEX[trial.color], lineHeight: 1 }}>{SHAPE_GLYPH[trial.shape]}</span>
              <span className="text-xs" style={{ color: C.textMuted }}>
                {lang === "en" ? "Tap ONLY the BLUE CIRCLE" : "Sadece MAVİ DAİRE'ye dokunun"} · {DISTRACTOR_BLOCKS[trial.block].icon} {L(DISTRACTOR_BLOCKS[trial.block].label, lang)}
              </span>
            </button>
          </>
        )}

        {test.type === "target-detection" && (
          <button key={trial.id} onClick={() => handleResponse("tap")} className="flex flex-col items-center gap-4" style={{ animation: "kg-pop 0.35s ease" }}>
            <span style={{ fontSize: 90, color: COLOR_HEX[trial.color], lineHeight: 1 }}>{SHAPE_GLYPH[trial.shape]}</span>
            <span className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Tap ONLY the BLUE CIRCLE" : "Sadece MAVİ DAİRE'ye dokunun"}</span>
          </button>
        )}

        {test.type === "go-nogo" && (
          <button key={trial.id} onClick={() => handleResponse("tap")} className="flex flex-col items-center gap-4" style={{ animation: "kg-pop 0.35s ease" }}>
            <div
              className="w-32 h-32 rounded-full"
              style={{ background: trial.go ? C.success : C.danger, animation: trial.go ? "kg-glow 1.1s ease-in-out infinite" : "none" }}
            />
            <span className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Green = tap · Red = don't tap" : "Yeşil = dokun · Kırmızı = dokunma"}</span>
          </button>
        )}

        {test.type === "stroop" && (
          <div className="flex flex-col items-center gap-6">
            <span className="text-5xl font-bold" style={{ color: COLOR_HEX[trial.ink] }}>{trial.word}</span>
            <div className="flex gap-3">
              {STROOP_WORDS.map((c) => (
                <button key={c.color} onClick={() => handleResponse(c.color)}
                  className="w-14 h-14 rounded-xl border-2" style={{ background: COLOR_HEX[c.color], borderColor: "#fff" }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Pick the INK COLOR of the word" : "Kelimenin YAZI RENGİNİ seçin"}</span>
          </div>
        )}

        {test.type === "visual-search" && (
          <div className="flex flex-col items-center gap-4">
            <span className="text-xs" style={{ color: C.textMuted }}>
              {lang === "en" ? "Find the target:" : "Hedefi bulun:"}{" "}
              <span style={{ color: COLOR_HEX[trial.targetColor], fontWeight: 600, fontSize: 16 }}>
                {SHAPE_GLYPH[trial.targetShape]}
              </span>
            </span>
            <div className="grid grid-cols-4 gap-2.5">
              {trial.cells.map((cell, idx) => (
                <button
                  key={idx}
                  onClick={() => handleResponse(idx)}
                  className="w-14 h-14 flex items-center justify-center rounded-lg"
                  style={{ background: C.surface, border: `1px solid ${C.border}` }}
                >
                  <span style={{ fontSize: 30, color: COLOR_HEX[cell.color] }}>{SHAPE_GLYPH[cell.shape]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {test.type === "auditory" && (
          <button key={trial.id} onClick={() => handleResponse("tap")} className="flex flex-col items-center gap-4">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: "#EEF0FF", animation: "kg-glow 1.1s ease-in-out infinite" }}
            >
              <span style={{ fontSize: 40 }}>🔊</span>
            </div>
            <span className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Tap on the high tone, not the low tone" : "Yüksek tonda dokunun, kalın tonda dokunmayın"}</span>
          </button>
        )}

        {test.type === "cognitive-flexibility" && (
          <div className="flex flex-col items-center gap-5">
            <Badge tone={trial.rule === "color" ? "default" : "success"}>
              {trial.rule === "color" ? (lang === "en" ? "Rule: COLOR" : "Kurala göre: RENK") : (lang === "en" ? "Rule: SHAPE" : "Kurala göre: ŞEKİL")}
            </Badge>
            <span style={{ fontSize: 70, color: COLOR_HEX[trial.color], lineHeight: 1 }}>{SHAPE_GLYPH[trial.shape]}</span>
            <div className="flex gap-3">
              {(trial.rule === "color" ? ["red", "blue"] : ["circle", "square"]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleResponse(opt)}
                  className="px-4 py-2 rounded-xl border text-sm font-medium"
                  style={{ borderColor: C.border, color: C.text }}
                >
                  {trial.rule === "color" ? (opt === "red" ? (lang === "en" ? "Red" : "Kırmızı") : (lang === "en" ? "Blue" : "Mavi")) : (opt === "circle" ? (lang === "en" ? "Circle" : "Daire") : (lang === "en" ? "Square" : "Kare"))}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   USER: MEMORY TEST RUNNER (adaptive digit span — different UX
   flow from the trial-based engine: study → recall → adapt)
   ============================================================ */
const MemoryTestRunner = ({ test, onFinish, onAbort }) => {
  const { lang } = useT();
  const MAX_ROUNDS = Math.max(5, Math.round(8 * ((test.age && test.age.trialFactor) || 1)));
  const SPAN_MAX = (test.age && test.age.spanMax) || 9;
  const [round, setRound] = useState(0);
  const [span, setSpan] = useState((test.age && test.age.spanStart) || 3);
  const [phase, setPhase] = useState("show"); // show | input | feedback
  const [sequence, setSequence] = useState([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [entered, setEntered] = useState([]);
  const [events, setEvents] = useState([]);
  const [lastCorrect, setLastCorrect] = useState(null);
  const onsetRef = useRef(0);
  const sessionId = useRef(uid());

  useEffect(() => {
    const handleVis = () => { if (document.hidden && onAbort) onAbort(); };
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (round >= MAX_ROUNDS) return;
    const seq = Array.from({ length: span }, () => Math.floor(Math.random() * 10));
    setSequence(seq);
    setRevealIndex(0);
    setEntered([]);
    setPhase("show");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    if (phase !== "show" || round >= MAX_ROUNDS) return;
    if (revealIndex >= sequence.length) {
      const t = setTimeout(() => { onsetRef.current = performance.now(); setPhase("input"); }, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealIndex((i) => i + 1), 700);
    return () => clearTimeout(t);
  }, [phase, revealIndex, sequence, round]);

  const submitDigit = (d) => {
    if (phase !== "input") return;
    const next = [...entered, d];
    setEntered(next);
    if (next.length === sequence.length) {
      const rt = Math.round(performance.now() - onsetRef.current);
      const correct = next.every((v, i) => v === sequence[i]);
      setLastCorrect(correct);
      setEvents((prev) => [...prev, {
        timestamp: Date.now(),
        event: "recall",
        stimulus: `span_${sequence.length}`,
        response: next.join(""),
        reactionTime: rt,
        correct,
        errorType: correct ? null : "commission",
        span: sequence.length,
        switchTrial: null,
        sessionId: sessionId.current,
      }]);
      setPhase("feedback");
      setTimeout(() => {
        setSpan((s) => (correct ? Math.min(s + 1, SPAN_MAX) : Math.max(s - 1, 2)));
        setRound((r) => r + 1);
      }, 600);
    }
  };

  useEffect(() => {
    if (round >= MAX_ROUNDS) {
      const finalEvents = events;
      const t = setTimeout(() => onFinish(finalEvents), 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  if (round >= MAX_ROUNDS) return null;

  const progress = Math.round((round / MAX_ROUNDS) * 100);

  return (
    <div className="min-h-full flex flex-col" style={{ background: C.bg }}>
      <div className="px-6 pt-6">
        <div className="w-full h-1.5 rounded-full" style={{ background: C.border }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: C.primary }} />
        </div>
        <p className="text-xs text-center mt-2" style={{ color: C.textMuted }}>%{progress}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {phase === "show" && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Memorize the sequence…" : "Dizi bellekte tutuluyor…"}</span>
            <span className="text-7xl font-bold" style={{ color: C.text }}>{sequence[revealIndex]}</span>
          </div>
        )}

        {phase === "input" && (
          <div className="flex flex-col items-center gap-5">
            <span className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Enter in the order you saw" : "Gördüğünüz sırayla girin"}</span>
            <div className="flex gap-2">
              {sequence.map((_, i) => (
                <span key={i} style={{ fontSize: 20, color: i < entered.length ? C.primary : C.border }}>●</span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => (
                <button
                  key={d}
                  onClick={() => submitDigit(d)}
                  className="w-14 h-14 rounded-xl text-lg font-semibold"
                  style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "feedback" && (
          lastCorrect
            ? <Check size={56} style={{ color: C.success }} />
            : <X size={56} style={{ color: C.danger }} />
        )}
      </div>
    </div>
  );
};

const Processing = () => {
  const { lang } = useT();
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4" style={{ background: C.bg }}>
      <PenguMascot state="thinking" size={96} />
      <NovaCore size={44} />
      <p className="text-sm" style={{ color: C.textMuted }}>{lang === "en" ? "Computing your results…" : "Sonuçlarınız hesaplanıyor…"}</p>
    </div>
  );
};

/* ============================================================
   USER: TEST ABORTED (kesinti/recovery — spec md. 45)
   ============================================================ */
const TestAborted = ({ test, onRestart, onCancel }) => (
  <div className="min-h-full flex items-center justify-center p-6" style={{ background: C.bg }}>
    <Card className="w-full max-w-sm text-center" style={{ animation: "kg-countup 0.4s ease" }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `${C.danger}1F` }}>
        <AlertCircle size={26} style={{ color: C.danger }} />
      </div>
      <h2 className="font-semibold text-lg mb-2" style={{ color: C.text }}>Test kesildi</h2>
      <p className="text-sm mb-2" style={{ color: C.textMuted }}>
        Test sırasında ekrandan ayrıldığınız algılandı. {test?.name} zamanlamaya duyarlı bir test olduğu için
        kesinti sonrası ölçüm geçerliliği bozulur ve kaldığınız yerden devam edilemez.
      </p>
      <p className="text-xs mb-4" style={{ color: C.textMuted }}>
        Bu oturumun verileri kaydedilmedi.
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>Vazgeç</Button>
        <Button className="flex-1" onClick={onRestart}>Yeniden Başlat</Button>
      </div>
    </Card>
  </div>
);

/* ============================================================
   USER: RESULTS
   ============================================================ */
const Confetti = () => {
  const pieces = useMemo(() => {
    const colors = [C.primary, C.secondary, C.accent1, C.accent2, C.accent3, C.warning];
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 0.6,
      size: 6 + Math.random() * 6,
    }));
  }, []);
  return (
    <div style={{ position: "relative", height: 0, overflow: "visible" }}>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: -10,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: 2,
            animation: `kg-confetti 1.6s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
};

const PercentileView = ({ result }) => {
  const { lang, t } = useT();
  const pct = useMemo(() => {
    const hash = [...result.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    return clamp(Math.round(result.overall * 0.85 + 8 + (hash % 7)), 1, 99);
  }, [result]);
  const [fb, setFb] = useState(null);
  return (
    <Card className="mb-4">
      <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>{t("compareOthers")}</h3>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-3xl font-bold" style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.accent1})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>%{pct}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <User key={i} size={18} style={{ color: i < Math.round(pct / 10) ? C.primary : C.border }} />
          ))}
        </div>
      </div>
      <p className="text-xs mt-2" style={{ color: C.textMuted }}>
        {lang === "en"
          ? <>You performed better than about {pct}% of users in this task. (Representative comparison — the real percentile will be computed once enough user data is collected.)</>
          : <>Bu görevde kullanıcıların yaklaşık %{pct}'inden daha iyi performans gösterdiniz. (Temsili karşılaştırma — gerçek yüzdelik dilim, yeterli kullanıcı verisi toplandığında hesaplanacaktır.)</>}
      </p>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: C.border }}>
        {fb ? (
          <span className="text-xs" style={{ color: C.success }}>{lang === "en" ? "Thanks for your feedback! 🎉" : "Geri bildiriminiz için teşekkürler! 🎉"}</span>
        ) : (
          <>
            <span className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Did you like this test?" : "Bu testi beğendiniz mi?"}</span>
            <button onClick={() => setFb("down")} className="text-xl kg-btn-pop">👎</button>
            <button onClick={() => setFb("up")} className="text-xl kg-btn-pop">👍</button>
          </>
        )}
      </div>
    </Card>
  );
};

const Results = ({ result, onDashboard }) => {
  const { lang, t } = useT();
  const strengths = [];
  const growth = [];
  Object.entries(result.subscores).forEach(([k, v]) => {
    const label = L(SUBSCORE_LABELS[k], lang) || k;
    (v >= 75 ? strengths : v < 60 ? growth : strengths).push({ label, v });
  });

  return (
    <div className="p-5 max-w-3xl mx-auto pb-24" style={{ position: "relative" }}>
      {result.overall >= 75 && <Confetti />}
      <div className="flex justify-center mb-2">
        <PenguMascot
          state={result.overall >= 60 ? "celebrate" : "encourage"}
          size={96}
          bubble={result.overall >= 75
            ? { tr: "Muhteşem bir sonuç! 🎉", en: "Amazing result! 🎉" }
            : result.overall >= 60
            ? { tr: "Güzel iş çıkardın! 👏", en: "Nice work! 👏" }
            : { tr: "Her deneme seni geliştirir — devam! 💪", en: "Every attempt makes you better — keep going! 💪" }}
        />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Check size={18} style={{ color: C.success }} />
        <h1 className="text-lg font-semibold" style={{ color: C.text }}>{t("testCompleted")} — {result.testName}</h1>
      </div>
      <p className="text-sm mb-4" style={{ color: C.textMuted }}>{t("overallScore")}</p>
      <div
        className="flex items-baseline gap-2 mb-5 px-4 py-3 rounded-2xl w-fit"
        style={{ background: `linear-gradient(135deg, ${C.primary}14, ${C.accent1}14)`, animation: "kg-countup 0.5s ease" }}
      >
        <span
          className="text-5xl font-bold"
          style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.accent1})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
        >
          {result.overall}
        </span>
        <span className="text-lg" style={{ color: C.textMuted }}>/100</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {Object.entries(result.subscores).map(([k, v]) => (
          <MetricCard key={k} label={L(SUBSCORE_LABELS[k], lang) || k} value={v} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Card><h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>{t("perfProfile")}</h3><RadarView subscores={result.subscores} /></Card>
        <Card><h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>{t("respDist")}</h3><DonutView stats={result.stats} /></Card>
      </div>

      {result.blockStats && (
        <Card className="mb-4">
          <h3 className="text-sm font-medium mb-1" style={{ color: C.text }}>{lang === "en" ? "Block Comparison" : "Blok Karşılaştırması"}</h3>
          <p className="text-xs mb-2" style={{ color: C.textMuted }}>
            {lang === "en"
              ? "Your accuracy per block — how much did distractors pull you off your baseline?"
              : "Blok bazında doğruluk — çeldiriciler sizi taban çizginizden ne kadar uzaklaştırdı?"}
          </p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={result.blockStats.map((b) => ({ name: `${DISTRACTOR_BLOCKS[b.block].icon} ${L(DISTRACTOR_BLOCKS[b.block].label, lang)}`, acc: b.acc, rt: b.meanRT }))}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.textMuted }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.textMuted }} />
              <Tooltip formatter={(v, n) => [n === "acc" ? `%${v}` : `${v} ms`, n === "acc" ? (lang === "en" ? "Accuracy" : "Doğruluk") : (lang === "en" ? "Avg. RT" : "Ort. RT")]} />
              <Bar dataKey="acc" radius={[6, 6, 0, 0]}>
                {result.blockStats.map((b) => (
                  <Cell key={b.block} fill={[C.primary, C.warning, C.secondary, C.danger][b.block]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="mb-4">
        <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>{t("errAnalysis")}</h3>
        <ErrorBarChart stats={result.stats} />
        <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
          <div><p style={{ color: C.textMuted }}>Ort. Tepki Süresi</p><p className="font-medium" style={{ color: C.text }}>{result.stats.meanRT} ms</p></div>
          <div><p style={{ color: C.textMuted }}>Tepki Değişkenliği</p><p className="font-medium" style={{ color: C.text }}>{result.stats.sdRT} ms</p></div>
          <div><p style={{ color: C.textMuted }}>Doğru Yanıt</p><p className="font-medium" style={{ color: C.text }}>{result.stats.correct}/{result.stats.total}</p></div>
        </div>
      </Card>

      <PercentileView result={result} />

      <Card className="mb-4">
        <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>Genel Performans</h3>
        <p className="text-sm mb-3" style={{ color: C.textMuted }}>
          Performansınız {result.overall >= 70 ? "genel olarak ortalama üzerinde" : result.overall >= 50 ? "genel olarak ortalama düzeyde" : "bu görevde dalgalı bir seyirde"} görünmektedir.
        </p>
        {strengths.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium mb-1" style={{ color: C.success }}>{t("strengths")}</p>
            <div className="flex flex-wrap gap-1.5">{strengths.map((s) => <Badge key={s.label} tone="success">{s.label}</Badge>)}</div>
          </div>
        )}
        {growth.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: C.warning }}>{t("growth")}</p>
            <div className="flex flex-wrap gap-1.5">{growth.map((s) => <Badge key={s.label} tone="warning">{s.label}</Badge>)}</div>
          </div>
        )}
      </Card>

      <div className="rounded-xl p-3 mb-4 text-xs flex gap-2" style={{ background: "#FFF7ED", color: "#9A3412" }}>
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <p>{t("resultDisclaimer")}</p>
      </div>

      <Button className="w-full" onClick={onDashboard}>{t("backToPanel")}</Button>
    </div>
  );
};

/* ============================================================
   NOTIFICATIONS (mock — spec md. 32)
   ============================================================ */
const timeAgo = (t) => {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
};

const INITIAL_NOTIFICATIONS = [
  { id: "n1", text: "Uzmanınız yeni bir değerlendirme gönderdi.", time: Date.now() - 1000 * 60 * 60 * 5, read: false },
  { id: "n2", text: "Yeni testiniz hazır.", time: Date.now() - 1000 * 60 * 60 * 26, read: true },
];

/* ============================================================
   GÜNLÜK SERİ (streak)
   ============================================================ */
const DAY_INITIALS = ["P", "S", "Ç", "P", "C", "C", "P"]; // Pzt → Paz

const TrialPromoModal = ({ onSeePlans, onClose }) => {
  const { lang, t } = useT();
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(23,25,35,0.6)" }}>
    <Card className="w-full max-w-sm text-center" style={{ animation: "kg-countup 0.4s ease" }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `linear-gradient(135deg, ${C.warning}, ${C.accent2})`, fontSize: 30 }}>👑</div>
      <h2 className="font-semibold text-lg mb-1" style={{ color: C.text }}>{lang === "en" ? "Continue with PRO" : "PRO ile devam edin"}</h2>
      <p className="text-sm mb-4" style={{ color: C.textMuted }}>{lang === "en" ? "You completed your first test! Continue without limits on PRO." : "İlk testinizi tamamladınız! PRO ile sınırsız devam edebilirsiniz."}</p>
      <div className="text-left rounded-xl p-3 mb-4 flex flex-col gap-2" style={{ background: C.bg }}>
        {[
          { icon: "✅", text: lang === "en" ? "Unlimited cognitive tests" : "Sınırsız bilişsel test" },
          { icon: "🧠", text: lang === "en" ? "All speed reading exercises" : "Tüm hızlı okuma egzersizleri" },
          { icon: "📈", text: lang === "en" ? "Progress tracking and comparison" : "Gelişim takibi ve karşılaştırma" },
          { icon: "📄", text: lang === "en" ? "PDF reports (Expert plan)" : "PDF raporlar (Expert planında)" },
        ].map((f) => (
          <p key={f.text} className="text-sm flex items-center gap-2" style={{ color: C.text }}>
            <span>{f.icon}</span> {f.text}
          </p>
        ))}
      </div>
      <Button className="w-full mb-2" onClick={onSeePlans}>{t("seePlans")}</Button>
      <button onClick={onClose} className="text-xs" style={{ color: C.textMuted }}>{lang === "en" ? "Not now" : "Şimdi değil"}</button>
    </Card>
  </div>
  );
};

const StreakModal = ({ streak, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(23,25,35,0.6)" }}>
    <Card className="w-full max-w-sm text-center" style={{ animation: "kg-pop 0.5s ease" }}>
      <div style={{ fontSize: 72, lineHeight: 1, animation: "kg-pop 0.6s ease" }}>🔥</div>
      <p className="text-4xl font-bold mt-1" style={{ color: C.warning }}>{streak.count}</p>
      <p className="text-sm font-medium mb-4" style={{ color: C.text }}>gün serisi</p>
      <div className="rounded-xl p-3 mb-4" style={{ background: C.bg }}>
        <div className="flex justify-between mb-1">
          {DAY_INITIALS.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span style={{ fontSize: 22, filter: streak.days[i] ? "none" : "grayscale(1) opacity(0.35)" }}>🔥</span>
              <span className="text-xs font-semibold" style={{ color: streak.days[i] ? C.warning : C.textMuted }}>{d}</span>
            </div>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: C.textMuted }}>Serini sürdür! Yarın da bir egzersiz tamamla.</p>
      </div>
      <Button className="w-full" onClick={onClose}>Devam</Button>
    </Card>
  </div>
);

/* ============================================================
   TOP NAV / BOTTOM NAV
   ============================================================ */
const TopNav = ({ role, setRole, screen, setScreen, hideDuringTest, notifications, setNotifications, plan, lang, setLang }) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const { t } = useT();
  if (hideDuringTest) return null;
  const unread = notifications.filter((n) => !n.read).length;
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const planInfo = PLANS.find((p) => p.id === plan);
  return (
    <div className="sticky top-0 z-20 border-b" style={{ background: C.surface, borderColor: C.border }}>
      <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setScreen(role === "user" ? "dashboard" : role === "expert" ? "expert-dashboard" : "admin-dashboard")}>
            <LogoMark size={28} radius={8} fontSize={13} />
            <span className="font-semibold" style={{ color: C.text }}>{BRAND}</span>
          </div>
          {BILLING_ENABLED && role === "user" && planInfo && (
            <button
              onClick={() => setScreen("subscription")}
              className="px-2 py-0.5 rounded-full text-xs font-semibold kg-btn-pop"
              style={plan === "FREE"
                ? { background: "#F3F4F6", color: C.textMuted }
                : { background: `linear-gradient(90deg, ${planInfo.color}, ${C.accent1})`, color: "#fff" }}
            >
              {planInfo.name.toUpperCase()}
            </button>
          )}
        </div>
        {role === "user" && (
          <div className="hidden sm:flex gap-1">
            {[
              { id: "dashboard", label: t("home") },
              { id: "catalog", label: t("tests") },
              { id: "training", label: t("reading") },
              { id: "history", label: t("results") },
              { id: "profile", label: t("profile") },
            ].map((n) => (
              <button
                key={n.id}
                onClick={() => setScreen(n.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={screen === n.id || (n.id === "profile" && screen === "subscription")
                  ? { background: "#EEF0FF", color: C.primary }
                  : { color: C.textMuted }}
              >
                {n.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "tr" ? "en" : "tr")}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold kg-btn-pop"
            style={{ background: C.bg, color: C.primary, border: `1px solid ${C.border}` }}
          >
            {lang === "tr" ? "🇹🇷 TR" : "🇬🇧 EN"}
          </button>
          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center kg-btn-pop"
              style={{ background: notifOpen ? "#EEF0FF" : "transparent", color: C.textMuted }}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-white flex items-center justify-center"
                  style={{ background: C.danger, fontSize: 10, fontWeight: 600 }}
                >
                  {unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-2 z-30" style={{ width: 300 }}>
                  <div className="rounded-2xl overflow-hidden" style={{ background: C.surface, boxShadow: "0 12px 32px rgba(23,25,35,0.18)" }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.border }}>
                      <span className="text-sm font-medium" style={{ color: C.text }}>Bildirimler</span>
                      {unread > 0 && (
                        <button onClick={markAllRead} className="text-xs font-medium" style={{ color: C.primary }}>Tümünü okundu işaretle</button>
                      )}
                    </div>
                    <div style={{ maxHeight: 280, overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <p className="text-sm px-4 py-6 text-center" style={{ color: C.textMuted }}>Bildirim yok.</p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => markRead(n.id)}
                            className="w-full text-left px-4 py-3 border-b flex gap-2 items-start"
                            style={{ borderColor: C.border, background: n.read ? "transparent" : "#EEF0FF66" }}
                          >
                            <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, marginTop: 5, background: n.read ? C.border : C.primary }} />
                            <span>
                              <p className="text-sm" style={{ color: C.text }}>{n.text}</p>
                              <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>{timeAgo(n.time)}</p>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="hidden sm:flex gap-1 p-1 rounded-lg items-center" style={{ background: C.bg }}>
            <span className="px-3 py-1.5 rounded-md text-xs font-medium" style={{ background: C.primary, color: "#fff" }}>
              {role === "user" ? (lang === "en" ? "User" : "Kullanıcı") : role === "expert" ? (lang === "en" ? "Expert" : "Uzman") : "Admin"}
            </span>
            <button onClick={() => setScreen("landing")} className="px-3 py-1.5 rounded-md text-xs font-medium" style={{ color: C.textMuted }}>
              {lang === "en" ? "Switch account" : "Hesap değiştir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   KAPSAMLI DEĞERLENDİRME RAPORU
   Format esini: batarya raporu düzeni (yatay çubuk + düzey tablosu) —
   içerik %100 kendi testlerimiz. Klinik dil yok; uyarı metni zorunlu.
   ============================================================ */
const BatteryReportBody = ({ sessions, trainings = [] }) => {
  const { lang } = useT();

  const latestByTest = useMemo(() => {
    const map = new Map();
    [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((se) => map.set(se.testId, se));
    return [...map.values()];
  }, [sessions]);

  const lastReading = useMemo(() => {
    const r = [...trainings].reverse().find((t) => t.exerciseId === "reading-test" && t.wpm);
    return r || null;
  }, [trainings]);

  const domainAvgs = useMemo(() => {
    const acc = {};
    latestByTest.forEach((se) => {
      Object.entries(se.subscores || {}).forEach(([k, v]) => {
        if (!acc[k]) acc[k] = [];
        acc[k].push(v);
      });
    });
    return Object.entries(acc).map(([k, arr]) => ({
      key: k,
      label: SUBSCORE_LABELS[k] ? L(SUBSCORE_LABELS[k], lang) : k,
      value: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    })).sort((a, b) => b.value - a.value);
  }, [latestByTest, lang]);

  const chartData = latestByTest.map((se) => ({ name: se.testName, value: se.overall })).reverse();

  return (
    <>
      <Card className="mb-4">
        <h3 className="text-sm font-medium mb-3" style={{ color: C.text }}>
          {lang === "en" ? "Applied Tests — Results" : "Uygulanan Testlerin Değerlendirme Sonuçları"}
        </h3>
        <div style={{ width: "100%", height: Math.max(180, chartData.length * 44) }}>
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={C.border} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: C.textMuted }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10, fill: C.text }} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 11, fill: C.text }}>
                {chartData.map((d, i) => <Cell key={i} fill={bandFor(d.value).color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mb-4" style={{ padding: 0, overflow: "hidden" }}>
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {[{ tr: "TEST", en: "TEST" }, { tr: "DÜZEY", en: "LEVEL" }, { tr: "PUAN", en: "SCORE" }].map((h, i) => (
                <th key={i} className="text-left px-4 py-2.5 font-semibold" style={{ color: C.textMuted, borderBottom: `1.5px solid ${C.border}` }}>{L(h, lang)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {latestByTest.map((se) => {
              const band = bandFor(se.overall);
              return (
                <tr key={se.testId}>
                  <td className="px-4 py-2.5" style={{ color: C.text, borderBottom: `1px solid ${C.border}` }}>{se.testName}</td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: band.color, borderBottom: `1px solid ${C.border}` }}>{L(band.label, lang)}</td>
                  <td className="px-4 py-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
                    <span className="px-2.5 py-1 rounded-md font-bold" style={{ background: band.bg, color: band.color }}>{se.overall}</span>
                  </td>
                </tr>
              );
            })}
            {lastReading && (
              <tr>
                <td className="px-4 py-2.5" style={{ color: C.text }}>{lang === "en" ? "Reading Speed" : "Okuma Hızı"}</td>
                <td className="px-4 py-2.5 font-medium" style={{ color: C.primary }}>{lang === "en" ? "Measured" : "Ölçüldü"}</td>
                <td className="px-4 py-2.5"><span className="px-2.5 py-1 rounded-md font-bold" style={{ background: `${C.primary}22`, color: C.primary }}>{lastReading.wpm} {lang === "en" ? "WPM" : "KDS"}</span></td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-medium mb-3" style={{ color: C.text }}>
          {lang === "en" ? "Cognitive Domain Summary" : "Bilişsel Alan Özeti"}
        </h3>
        <div className="flex flex-col gap-2.5">
          {domainAvgs.map((d) => {
            const band = bandFor(d.value);
            return (
              <div key={d.key} className="flex items-center gap-3">
                <span className="text-xs w-32 shrink-0" style={{ color: C.text }}>{d.label}</span>
                <div className="flex-1 h-2.5 rounded-full" style={{ background: C.bg }}>
                  <div className="h-2.5 rounded-full" style={{ width: `${d.value}%`, background: band.color, transition: "width 0.6s ease" }} />
                </div>
                <span className="text-xs font-semibold w-8 text-right" style={{ color: band.color }}>{d.value}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          {LEVEL_BANDS.map((b, i) => (
            <span key={i} className="px-2.5 py-1 rounded-md text-[10px] font-medium" style={{ background: b.bg, color: b.color }}>
              {b.min}+ · {L(b.label, lang)}
            </span>
          ))}
        </div>
      </Card>

      <p className="text-[10px] leading-relaxed" style={{ color: C.textMuted }}>
        {lang === "en"
          ? "This report is a self-awareness tool. It does not constitute a medical or psychological diagnosis and does not replace clinical evaluation. Levels are relative indicators computed from in-app performance; consult a qualified professional for any concern."
          : "Bu rapor bir öz-farkındalık aracıdır. Tıbbi veya psikolojik tanı niteliği taşımaz; klinik değerlendirmenin yerine geçmez. Düzeyler, uygulama içi performanstan hesaplanan göreli göstergelerdir; herhangi bir endişeniz için uzman bir profesyonele başvurunuz."}
      </p>
    </>
  );
};

const ComprehensiveReport = ({ sessions, trainings = [], currentUser, onBack }) => {
  const { lang } = useT();
  const testCount = new Set(sessions.map((se) => se.testId)).size;
  const lastReading = [...trainings].reverse().find((t) => t.exerciseId === "reading-test" && t.wpm) || null;
  const today = new Date().toLocaleDateString(lang === "en" ? "en-US" : "tr-TR", { day: "numeric", month: "long", year: "numeric" });

  if (sessions.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <button onClick={onBack} className="text-xs flex items-center gap-1 mb-4" style={{ color: C.textMuted }}><ArrowLeft size={14} /> {lang === "en" ? "Back" : "Geri"}</button>
        <PenguMascot state="encourage" size={96} bubble={{ tr: "Rapor için önce en az bir test tamamlamalısın 🐧", en: "Complete at least one test first for a report 🐧" }} />
      </div>
    );
  }

  return (
    <div className="p-5 max-w-3xl mx-auto pb-24 kg-report-print">
      <div className="flex items-center justify-between mb-4 kg-no-print">
        <button onClick={onBack} className="text-xs flex items-center gap-1" style={{ color: C.textMuted }}><ArrowLeft size={14} /> {lang === "en" ? "Back" : "Geri"}</button>
        <Button onClick={() => window.print()} className="flex items-center gap-1.5"><Download size={14} /> {lang === "en" ? "Print / PDF" : "Yazdır / PDF"}</Button>
      </div>

      <Card className="mb-4 text-center">
        <h1 className="text-lg font-bold" style={{ color: C.text }}>
          {lang === "en" ? "Comprehensive Evaluation Report" : "Kapsamlı Değerlendirme Raporu"}
        </h1>
        <p className="text-xs mt-1" style={{ color: C.textMuted }}>
          {currentUser?.name || "—"} · {today} · {testCount} {lang === "en" ? "tests" : "test"}
          {lastReading ? ` · ${lastReading.wpm} ${lang === "en" ? "WPM reading" : "KDS okuma"}` : ""}
        </p>
      </Card>

      <BatteryReportBody sessions={sessions} trainings={trainings} />
    </div>
  );
};

const BottomNav = ({ screen, setScreen }) => {
  const { t } = useT();
  return (
  <div className="fixed bottom-0 left-0 right-0 border-t sm:hidden" style={{ background: C.surface, borderColor: C.border }}>
    <div className="flex justify-around py-2">
      {[
        { id: "dashboard", icon: Home, label: t("home") },
        { id: "catalog", icon: ClipboardList, label: t("tests") },
        { id: "training", icon: BookOpen, label: t("trainingTab") },
        { id: "history", icon: BarChart3, label: t("results") },
        { id: "profile", icon: User, label: t("profile") },
      ].map((n, i) => (
        <button key={i} onClick={() => setScreen(n.id)} className="flex flex-col items-center gap-0.5 px-3 py-1"
          style={{ color: screen === n.id ? C.primary : C.textMuted }}>
          <n.icon size={18} /><span className="text-[10px]">{n.label}</span>
        </button>
      ))}
    </div>
  </div>
  );
};

/* ============================================================
   SHARED: MODAL
   ============================================================ */
const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(23,25,35,0.5)" }} onClick={onClose}>
    <div className={wide ? "w-full max-w-2xl" : "w-full max-w-md"} style={{ maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base" style={{ color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ color: C.textMuted }}><X size={18} /></button>
        </div>
        {children}
      </Card>
    </div>
  </div>
);

const FormField = ({ label, children }) => (
  <div>
    {label && <label className="text-xs" style={{ color: C.textMuted }}>{label}</label>}
    <div className={label ? "mt-1" : ""}>{children}</div>
  </div>
);
const inputStyle = { borderColor: C.border };
const inputClass = "border rounded-lg px-3 py-2 text-sm w-full";

/* ============================================================
   EXPERT PANEL — data
   ============================================================ */
const INITIAL_CLIENTS = [
  { id: "c1", name: "Ahmet Yıldız", email: "ahmet.yildiz@mail.com", phone: "0532 111 22 33", birthDate: "1994-03-12", lastTest: "Sürdürülebilir Dikkat", score: 82, date: "2026-08-01" },
  { id: "c2", name: "Elif Demir", email: "elif.demir@mail.com", phone: "0533 222 33 44", birthDate: "1998-07-22", lastTest: "Go / No-Go", score: 67, date: "2026-08-05" },
  { id: "c3", name: "Mert Kaya", email: "mert.kaya@mail.com", phone: "0534 333 44 55", birthDate: "1990-11-02", lastTest: "Stroop Benzeri Görev", score: 74, date: "2026-08-09" },
  { id: "c4", name: "Zeynep Aksoy", email: "zeynep.aksoy@mail.com", phone: "0535 444 55 66", birthDate: "2001-01-30", lastTest: "Sürdürülebilir Dikkat", score: 91, date: "2026-08-11" },
];

const INITIAL_ASSIGNMENTS = [
  { id: "a1", clientId: "c1", testId: "sustained-attention", testName: "Sürdürülebilir Dikkat", dueDate: "2026-08-01", note: "", status: "COMPLETED", createdAt: "2026-07-28" },
  { id: "a2", clientId: "c2", testId: "go-nogo", testName: "Tepki Hızı (Go / No-Go)", dueDate: "2026-08-05", note: "", status: "COMPLETED", createdAt: "2026-08-01" },
  { id: "a3", clientId: "c3", testId: "stroop", testName: "Stroop Benzeri Görev", dueDate: "2026-08-25", note: "Lütfen sessiz bir ortamda tamamlayın.", status: "PENDING", createdAt: "2026-08-18" },
];

/* ============================================================
   EXPERT PANEL — modals
   ============================================================ */
const NewClientModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", birthDate: "" });
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    onCreate({
      id: uid(),
      name: `${form.firstName.trim()} ${form.lastName.trim()}`,
      email: form.email,
      phone: form.phone,
      birthDate: form.birthDate,
      lastTest: null,
      score: null,
      date: null,
    });
    onClose();
  };
  return (
    <Modal title="Yeni Danışan" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Ad" value={form.firstName} onChange={update("firstName")} className={inputClass} style={inputStyle} />
          <input placeholder="Soyad" value={form.lastName} onChange={update("lastName")} className={inputClass} style={inputStyle} />
        </div>
        <input placeholder="E-posta" value={form.email} onChange={update("email")} className={inputClass} style={inputStyle} />
        <input placeholder="Telefon" value={form.phone} onChange={update("phone")} className={inputClass} style={inputStyle} />
        <FormField label="Doğum Tarihi">
          <input type="date" value={form.birthDate} onChange={update("birthDate")} className={inputClass} style={inputStyle} />
        </FormField>
        <Button onClick={submit} className="w-full mt-1">Danışanı Ekle</Button>
      </div>
    </Modal>
  );
};

const AssignTestModal = ({ client, onClose, onAssign }) => {
  const implementedTests = TEST_CATALOG.filter((t) => t.implemented);
  const [testId, setTestId] = useState(implementedTests[0]?.id || "");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const submit = () => {
    const test = implementedTests.find((t) => t.id === testId);
    if (!test) return;
    onAssign({
      id: uid(),
      clientId: client.id,
      testId: test.id,
      testName: L(test.name, "tr"),
      dueDate,
      note,
      status: "PENDING",
      createdAt: new Date().toISOString().slice(0, 10),
    });
    onClose();
  };
  return (
    <Modal title={`Test Ata — ${client.name}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <FormField label="Test Seç">
          <select value={testId} onChange={(e) => setTestId(e.target.value)} className={inputClass} style={inputStyle}>
            {implementedTests.map((t) => <option key={t.id} value={t.id}>{L(t.name, "tr")}</option>)}
          </select>
        </FormField>
        <FormField label="Son Tarih">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} style={inputStyle} />
        </FormField>
        <FormField label="Not (opsiyonel)">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Testi sessiz ortamda tamamlayınız."
            className={inputClass} style={inputStyle} />
        </FormField>
        <Button onClick={submit} className="w-full mt-1">Testi Ata ve Bildir</Button>
      </div>
    </Modal>
  );
};

/* ============================================================
   EXPERT PANEL — printable report (uses window.print for PDF export)
   ============================================================ */
const ReportPreview = ({ client, report, result, onClose }) => {
  const [note, setNote] = useState(report.note || "");
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "rgba(23,25,35,0.6)" }}>
      <div className="max-w-2xl mx-auto my-6 px-4">
        <div className="flex justify-end gap-2 mb-3 kg-no-print">
          <Button variant="ghost" onClick={onClose}>Kapat</Button>
          <Button onClick={() => window.print()}>Yazdır / PDF Olarak Kaydet</Button>
        </div>
        <div className="kg-print-area rounded-2xl p-8" style={{ background: "#fff" }}>
          <div className="flex items-center justify-between mb-8 pb-4 border-b" style={{ borderColor: C.border }}>
            <div className="flex items-center gap-2">
              <LogoMark size={32} radius={10} fontSize={15} />
              <span className="font-semibold text-lg" style={{ color: C.text }}>{BRAND}</span>
            </div>
            <span className="text-xs" style={{ color: C.textMuted }}>{new Date(report.date).toLocaleDateString("tr-TR")}</span>
          </div>

          <h1 className="text-xl font-semibold mb-1" style={{ color: C.text }}>Bilişsel Performans Değerlendirme Raporu</h1>
          <p className="text-sm mb-6" style={{ color: C.textMuted }}>{result.testName}</p>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div><span style={{ color: C.textMuted }}>Danışan</span><p className="font-medium" style={{ color: C.text }}>{client.name}</p></div>
            <div><span style={{ color: C.textMuted }}>Doğum Tarihi</span><p className="font-medium" style={{ color: C.text }}>{client.birthDate ? new Date(client.birthDate).toLocaleDateString("tr-TR") : "—"}</p></div>
          </div>

          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-4xl font-bold" style={{ color: C.primary }}>{result.overall}</span>
            <span style={{ color: C.textMuted }}>/100 Genel Skor</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div><h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>Performans Profili</h3><RadarView subscores={result.subscores} /></div>
            <div><h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>Hata Analizi</h3><ErrorBarChart stats={result.stats} /></div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>Uzman Notu</h3>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Değerlendirme notunuzu buraya ekleyin…"
              className="w-full border rounded-lg px-3 py-2 text-sm kg-no-print" style={{ borderColor: C.border }} />
            <p className="text-sm kg-print-only" style={{ color: C.text }}>{note || "—"}</p>
          </div>

          <div className="rounded-xl p-3 text-xs flex gap-2" style={{ background: "#FFF7ED", color: "#9A3412" }}>
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>Bu rapor klinik norm içermeyen bir skor modeliyle hesaplanmıştır; bir klinik tanı veya tıbbi değerlendirme değildir ve klinik değerlendirmenin yerine geçmez.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   EXPERT PANEL — dashboard
   ============================================================ */
const ExpertDashboard = ({ clients, setClients, assignments, setAssignments, setToast, addNotification, onOpenClient }) => {
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [assignClient, setAssignClient] = useState(null);

  const scored = clients.filter((c) => c.score != null);
  const avgScore = scored.length ? Math.round(mean(scored.map((c) => c.score))) : 0;
  const activeCount = assignments.filter((a) => a.status === "PENDING").length;
  const completedCount = assignments.filter((a) => a.status === "COMPLETED").length;

  return (
    <div className="p-5 max-w-4xl mx-auto pb-24">
      <h1 className="text-xl font-semibold mb-4" style={{ color: C.text }}>Uzman Paneli</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Toplam Danışan" value={clients.length} />
        <MetricCard label="Aktif Testler" value={activeCount} />
        <MetricCard label="Tamamlanan Testler" value={completedCount} />
        <MetricCard label="Ortalama Skor" value={avgScore} />
      </div>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: C.text }}>Danışanlar</h3>
          <Button variant="secondary" onClick={() => setNewClientOpen(true)}>+ Yeni Danışan</Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: C.textMuted }}>
              <th className="pb-2 font-normal">Ad Soyad</th>
              <th className="pb-2 font-normal">Son Test</th>
              <th className="pb-2 font-normal">Skor</th>
              <th className="pb-2 font-normal">Tarih</th>
              <th className="pb-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t" style={{ borderColor: C.border }}>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={c.name} size={28} />
                    <span style={{ color: C.text }}>{c.name}</span>
                  </div>
                </td>
                <td className="py-2" style={{ color: C.textMuted }}>{c.lastTest || "—"}</td>
                <td className="py-2" style={{ color: C.text }}>{c.score != null ? c.score : "—"}</td>
                <td className="py-2" style={{ color: C.textMuted }}>{c.date ? new Date(c.date).toLocaleDateString("tr-TR") : "—"}</td>
                <td className="py-2 text-right">
                  <button onClick={() => setAssignClient(c)} className="text-xs font-medium mr-3" style={{ color: C.secondary }}>Test Ata</button>
                  <button onClick={() => onOpenClient(c)} className="text-xs font-medium" style={{ color: C.primary }}>Detay →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {newClientOpen && (
        <NewClientModal
          onClose={() => setNewClientOpen(false)}
          onCreate={(c) => { setClients((prev) => [...prev, c]); setToast(`${c.name} danışan olarak eklendi.`); }}
        />
      )}
      {assignClient && (
        <AssignTestModal
          client={assignClient}
          onClose={() => setAssignClient(null)}
          onAssign={(a) => { setAssignments((prev) => [...prev, a]); addNotification("Yeni testiniz hazır."); setToast(`${assignClient.name} adlı danışana "${a.testName}" atandı. Bildirim gönderildi.`); }}
        />
      )}
    </div>
  );
};

/* ============================================================
   EXPERT PANEL — client detail (tabbed)
   ============================================================ */
const CLIENT_TABS = [
  { id: "profil", label: "Profil" },
  { id: "testler", label: "Testler" },
  { id: "sonuclar", label: "Sonuçlar" },
  { id: "gelisim", label: "Gelişim" },
  { id: "raporlar", label: "Raporlar" },
];

const ExpertClientDetail = ({ client, setClients, assignments, setAssignments, reports, setReports, setToast, addNotification, onBack }) => {
  const [tab, setTab] = useState("profil");
  const [assignOpen, setAssignOpen] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);

  const clientAssignments = assignments.filter((a) => a.clientId === client.id);
  const clientReports = reports.filter((r) => r.clientId === client.id);

  const completeAssignment = (assignmentId) => {
    const overall = 55 + Math.floor(Math.random() * 40);
    const a = clientAssignments.find((x) => x.id === assignmentId);
    setAssignments((prev) => prev.map((x) => (x.id === assignmentId ? { ...x, status: "COMPLETED" } : x)));
    setClients((prev) => prev.map((c) => (c.id === client.id
      ? { ...c, lastTest: a?.testName || c.lastTest, score: overall, date: new Date().toISOString().slice(0, 10) }
      : c)));
    setToast(`${client.name} testi tamamladı. Skor: ${overall}/100`);
  };

  const generateReport = () => {
    const report = { id: uid(), clientId: client.id, date: new Date().toISOString(), testName: client.lastTest || "—", overall: client.score ?? 0, note: "" };
    setReports((prev) => [...prev, report]);
    addNotification("Uzmanınız yeni bir değerlendirme gönderdi.");
    setReportPreview(report);
  };

  const mockResult = {
    testName: client.lastTest || "Test bekleniyor",
    overall: client.score ?? 0,
    subscores: client.score != null
      ? { attention: clamp(client.score + 4), speed: clamp(client.score - 6), impulseControl: clamp(client.score - 2), consistency: clamp(client.score + 2), accuracy: clamp(client.score) }
      : { attention: 0, speed: 0, impulseControl: 0, consistency: 0, accuracy: 0 },
    stats: { total: 16, correct: Math.round((16 * (client.score ?? 0)) / 100), omissions: 2, commissions: 1, meanRT: 430, sdRT: 65 },
  };

  const historySessions = client.score != null
    ? [client.score - 12, client.score - 5, client.score].map((v) => ({ overall: clamp(v) }))
    : [];

  const [batteryOpen, setBatteryOpen] = useState(false);
  // Demo batarya: danışanın skoru etrafında deterministik dağılım (id tohumlu).
  // ÜRETİM: GET /sessions?userId=<client> ile gerçek oturumlar gelecek.
  const clientBattery = useMemo(() => {
    if (client.score == null) return [];
    const seed = [...String(client.id)].reduce((a, c) => a + c.charCodeAt(0), 0);
    return TEST_CATALOG.map((t, i) => {
      const wobble = (((seed * (i + 3)) % 29) - 14); // -14..+14 deterministik
      const ov = clamp(client.score + wobble);
      return {
        id: `demo-${client.id}-${t.id}`,
        testId: t.id,
        testName: L(t.name, "tr"),
        overall: ov,
        subscores: { attention: clamp(ov + 4), speed: clamp(ov - 5), impulseControl: clamp(ov - 2), consistency: clamp(ov + 2), accuracy: clamp(ov + 1) },
        stats: { total: 16, correct: Math.round((16 * ov) / 100), omissions: 2, commissions: 1, meanRT: 430, sdRT: 65 },
        date: new Date(Date.now() - i * 86400000).toISOString(),
      };
    });
  }, [client.id, client.score]);

  return (
    <div className="p-5 max-w-3xl mx-auto pb-24">
      <button onClick={onBack} className="text-xs flex items-center gap-1 mb-3" style={{ color: C.textMuted }}><ArrowLeft size={14} />Danışanlara Dön</button>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={client.name} size={40} />
          <h1 className="text-lg font-semibold" style={{ color: C.text }}>{client.name}</h1>
        </div>
        <Button variant="secondary" onClick={() => setAssignOpen(true)}>+ Test Ata</Button>
      </div>

      <div className="flex gap-1 p-1 rounded-lg mb-4 w-fit flex-wrap" style={{ background: C.bg }}>
        {CLIENT_TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={tab === t.id ? { background: C.primary, color: "#fff" } : { color: C.textMuted }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profil" && (
        <Card className="text-sm flex flex-col gap-2">
          <div className="flex justify-between"><span style={{ color: C.textMuted }}>Ad Soyad</span><span style={{ color: C.text }}>{client.name}</span></div>
          <div className="flex justify-between"><span style={{ color: C.textMuted }}>E-posta</span><span style={{ color: C.text }}>{client.email || "—"}</span></div>
          <div className="flex justify-between"><span style={{ color: C.textMuted }}>Telefon</span><span style={{ color: C.text }}>{client.phone || "—"}</span></div>
          <div className="flex justify-between"><span style={{ color: C.textMuted }}>Doğum Tarihi</span><span style={{ color: C.text }}>{client.birthDate ? new Date(client.birthDate).toLocaleDateString("tr-TR") : "—"}</span></div>
        </Card>
      )}

      {tab === "testler" && (
        <Card>
          {clientAssignments.length === 0 ? (
            <p className="text-sm" style={{ color: C.textMuted }}>Henüz test ataması yok.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {clientAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.border }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.text }}>{a.testName}</p>
                    <p className="text-xs" style={{ color: C.textMuted }}>Son tarih: {a.dueDate || "—"}{a.note && ` · ${a.note}`}</p>
                  </div>
                  {a.status === "PENDING" ? (
                    <div className="flex items-center gap-2">
                      <Badge tone="warning">Bekliyor</Badge>
                      <button onClick={() => completeAssignment(a.id)} className="text-xs font-medium" style={{ color: C.primary }}>Tamamlandı işaretle</button>
                    </div>
                  ) : (
                    <Badge tone="success">Tamamlandı</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "sonuclar" && (
        client.score == null ? (
          <Card className="text-center py-8"><p style={{ color: C.textMuted }}>Bu danışan henüz bir test tamamlamadı.</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card><h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>Performans Profili</h3><RadarView subscores={mockResult.subscores} /></Card>
            <Card><h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>Tepki Dağılımı</h3><DonutView stats={mockResult.stats} /></Card>
          </div>
        )
      )}

      {tab === "gelisim" && (
        historySessions.length === 0 ? (
          <Card className="text-center py-8"><p style={{ color: C.textMuted }}>Gelişim grafiği için en az bir tamamlanmış test gerekir.</p></Card>
        ) : (
          <Card><h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>Gelişim Grafiği</h3><HistoryLineChart sessions={historySessions} /></Card>
        )
      )}

      {tab === "raporlar" && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium" style={{ color: C.text }}>Raporlar</h3>
            <Button onClick={() => setBatteryOpen(true)} disabled={client.score == null} className="mr-2">
              <BarChart3 size={14} className="inline mr-1" />Kapsamlı Batarya Raporu
            </Button>
            <Button variant="secondary" onClick={generateReport} disabled={client.score == null}>
              <FileText size={14} className="inline mr-1" />Yeni Rapor Oluştur
            </Button>
          </div>
          {clientReports.length === 0 ? (
            <p className="text-sm" style={{ color: C.textMuted }}>Henüz rapor oluşturulmadı.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {clientReports.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b pb-2" style={{ borderColor: C.border }}>
                  <span className="text-sm" style={{ color: C.text }}>{new Date(r.date).toLocaleDateString("tr-TR")} — {r.testName}</span>
                  <button onClick={() => setReportPreview(r)} className="text-xs font-medium" style={{ color: C.primary }}>Görüntüle / Yazdır</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {assignOpen && (
        <AssignTestModal
          client={client}
          onClose={() => setAssignOpen(false)}
          onAssign={(a) => { setAssignments((prev) => [...prev, a]); addNotification("Yeni testiniz hazır."); setToast(`${client.name} adlı danışana "${a.testName}" atandı. Bildirim gönderildi.`); }}
        />
      )}
      {reportPreview && (
        <ReportPreview client={client} report={reportPreview} result={mockResult} onClose={() => setReportPreview(null)} />
      )}

      {batteryOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "rgba(23,25,35,0.6)" }}>
          <div className="max-w-3xl mx-auto my-6 px-4">
            <div className="flex justify-end gap-2 mb-3 kg-no-print">
              <Button variant="ghost" onClick={() => setBatteryOpen(false)}>Kapat</Button>
              <Button onClick={() => window.print()}>Yazdır / PDF Olarak Kaydet</Button>
            </div>
            <div className="kg-print-area rounded-2xl p-6" style={{ background: "#fff" }}>
              <div className="flex items-center justify-between mb-5 pb-4 border-b" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-2">
                  <LogoMark size={32} radius={10} fontSize={15} />
                  <span className="font-semibold text-lg" style={{ color: C.text }}>{BRAND}</span>
                </div>
                <span className="text-xs" style={{ color: C.textMuted }}>{new Date().toLocaleDateString("tr-TR")}</span>
              </div>
              <h1 className="text-lg font-bold mb-1" style={{ color: C.text }}>Kapsamlı Batarya Raporu</h1>
              <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
                <div><span style={{ color: C.textMuted }}>Danışan</span><p className="font-medium" style={{ color: C.text }}>{client.name}</p></div>
                <div><span style={{ color: C.textMuted }}>Uygulanan Test</span><p className="font-medium" style={{ color: C.text }}>{clientBattery.length}</p></div>
              </div>
              <BatteryReportBody sessions={clientBattery} trainings={[]} />
              <p className="text-[10px] mt-3 italic" style={{ color: C.textMuted }}>
                Demo veri — üretimde danışanın gerçek oturumları API'den yüklenecektir.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   ADMIN PANEL — data & helpers
   ============================================================ */
const ADMIN_USERS = [
  { id: "u1", name: "Sinem Yılmaz", email: "user@example.com", role: "USER", plan: "PRO", joined: "2026-06-02", active: true },
  { id: "u2", name: "Ahmet Yıldız", email: "ahmet.yildiz@mail.com", role: "USER", plan: "FREE", joined: "2026-06-15", active: true },
  { id: "u3", name: "Elif Demir", email: "elif.demir@mail.com", role: "USER", plan: "FREE", joined: "2026-07-01", active: false },
  { id: "u4", name: "Deniz Acar", email: "deniz.acar@mail.com", role: "EXPERT", plan: "EXPERT", joined: "2026-05-20", active: true },
  { id: "u5", name: "Canan Öz", email: "canan.oz@mail.com", role: "EXPERT", plan: "EXPERT", joined: "2026-05-22", active: true },
  { id: "u6", name: "Mert Kaya", email: "mert.kaya@mail.com", role: "USER", plan: "PRO", joined: "2026-07-12", active: true },
  { id: "u7", name: "Zeynep Aksoy", email: "zeynep.aksoy@mail.com", role: "USER", plan: "FREE", joined: "2026-08-01", active: true },
  { id: "u8", name: "Admin Zihni", email: "admin@example.com", role: "ADMIN", plan: "ENTERPRISE", joined: "2026-05-01", active: true },
];
const ROLE_COLORS = { USER: "#5B5CE2", EXPERT: "#8B5CF6", ADMIN: "#EF4444" };
const ROLE_LABELS = { USER: "Kullanıcı", EXPERT: "Uzman", ADMIN: "Admin" };

const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)} className="rounded-full flex-shrink-0" style={{ width: 40, height: 22, background: on ? C.success : C.border, position: "relative", transition: "background 0.2s" }}>
    <span className="rounded-full" style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
  </button>
);

const AdminUserTable = ({ users }) => (
  <table className="w-full text-sm">
    <thead>
      <tr className="text-left" style={{ color: C.textMuted }}>
        <th className="pb-2 font-normal">Kullanıcı</th>
        <th className="pb-2 font-normal hidden sm:table-cell">E-posta</th>
        <th className="pb-2 font-normal">Rol</th>
        <th className="pb-2 font-normal">Plan</th>
        <th className="pb-2 font-normal">Durum</th>
      </tr>
    </thead>
    <tbody>
      {users.map((u) => (
        <tr key={u.id} className="border-t" style={{ borderColor: C.border }}>
          <td className="py-2">
            <div className="flex items-center gap-2">
              <Avatar name={u.name} size={26} />
              <span style={{ color: C.text }}>{u.name}</span>
            </div>
          </td>
          <td className="py-2 hidden sm:table-cell" style={{ color: C.textMuted }}>{u.email}</td>
          <td className="py-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${ROLE_COLORS[u.role]}1F`, color: ROLE_COLORS[u.role] }}>
              {ROLE_LABELS[u.role]}
            </span>
          </td>
          <td className="py-2" style={{ color: C.textMuted }}>{u.plan}</td>
          <td className="py-2">{u.active ? <Badge tone="success">Aktif</Badge> : <Badge tone="muted">Pasif</Badge>}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/* ============================================================
   ADMIN PANEL
   ============================================================ */
const AdminDashboard = ({ setToast }) => {
  const ADMIN_COLORS = [C.primary, C.secondary, C.accent1, C.accent2, C.accent3, C.warning, C.danger, C.success];
  const [section, setSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [testStates, setTestStates] = useState(() => Object.fromEntries(TEST_CATALOG.map((t) => [t.id, true])));
  const [settings, setSettings] = useState({ maintenance: false, registration: true, emails: true });

  const MENUS = [
    { key: "users", icon: Users, label: "Kullanıcılar" },
    { key: "experts", icon: Users, label: "Uzmanlar" },
    { key: "tests", icon: ClipboardList, label: "Testler" },
    { key: "analytics", icon: TrendingUp, label: "Analytics" },
    { key: "reports", icon: FileText, label: "Raporlar" },
    { key: "subs", icon: Shield, label: "Abonelikler" },
    { key: "settings", icon: Settings, label: "Ayarlar" },
    { key: "sessions", icon: BarChart3, label: "Sessions" },
  ];

  const filteredUsers = ADMIN_USERS.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const WEEKLY = [
    { gun: "Pzt", test: 34 }, { gun: "Sal", test: 41 }, { gun: "Çar", test: 29 },
    { gun: "Per", test: 47 }, { gun: "Cum", test: 52 }, { gun: "Cmt", test: 61 }, { gun: "Paz", test: 38 },
  ];
  const SUB_DIST = [
    { name: "Free", value: 120, color: "#6B7280" },
    { name: "Pro", value: 64, color: "#5B5CE2" },
    { name: "Expert", value: 22, color: "#8B5CF6" },
    { name: "Enterprise", value: 8, color: "#EC4899" },
  ];
  const MOCK_SESSIONS = [
    { user: "Mert Kaya", test: "Stroop Benzeri Görev", skor: 74, tarih: "2026-08-20" },
    { user: "Zeynep Aksoy", test: "Sürdürülebilir Dikkat", skor: 91, tarih: "2026-08-20" },
    { user: "Ahmet Yıldız", test: "Go / No-Go", skor: 82, tarih: "2026-08-19" },
    { user: "Elif Demir", test: "Çalışma Belleği", skor: 67, tarih: "2026-08-19" },
    { user: "Sinem Yılmaz", test: "Bilişsel Esneklik", skor: 79, tarih: "2026-08-18" },
  ];

  const sectionTitle = MENUS.find((m) => m.key === section)?.label;

  return (
    <div className="p-5 max-w-4xl mx-auto pb-24">
      <h1 className="text-xl font-semibold mb-4" style={{ color: C.text }}>Admin Paneli</h1>

      {section === "overview" ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            <MetricCard label="Total Users" value={214} />
            <MetricCard label="Total Experts" value={12} />
            <MetricCard label="Tests Completed" value={1032} />
            <MetricCard label="Average Score" value={76} />
            <MetricCard label="Daily Active Users" value={38} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MENUS.map((m, i) => (
              <Card key={m.key} className="flex flex-col items-center gap-2 py-5 cursor-pointer" onClick={() => setSection(m.key)}>
                <button onClick={() => setSection(m.key)} className="flex flex-col items-center gap-2 w-full">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ADMIN_COLORS[i % ADMIN_COLORS.length]}1F` }}>
                    <m.icon size={20} style={{ color: ADMIN_COLORS[i % ADMIN_COLORS.length] }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: C.text }}>{m.label}</span>
                </button>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => { setSection("overview"); setSearch(""); }} className="text-xs flex items-center gap-1 mb-3" style={{ color: C.textMuted }}>
            <ArrowLeft size={14} /> Genel Bakış
          </button>
          <h2 className="text-lg font-semibold mb-4" style={{ color: C.text }}>{sectionTitle}</h2>

          {(section === "users" || section === "experts") && (
            <Card>
              <input
                placeholder="Ada veya e-postaya göre ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full mb-4"
                style={{ borderColor: C.border }}
              />
              <AdminUserTable users={section === "experts" ? filteredUsers.filter((u) => u.role === "EXPERT") : filteredUsers} />
            </Card>
          )}

          {section === "tests" && (
            <Card>
              <div className="flex flex-col gap-3">
                {TEST_CATALOG.map((t) => {
                  const accent = TEST_ACCENTS[t.id] || { color: C.primary, glyph: "✦" };
                  return (
                    <div key={t.id} className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.border }}>
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent.color}1F`, fontSize: 16 }}>{accent.glyph}</span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: C.text }}>{L(t.name, "tr")}</p>
                          <p className="text-xs" style={{ color: C.textMuted }}>{t.duration} · {t.difficulty} · {t.trials} deneme</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {testStates[t.id] ? <Badge tone="success">Aktif</Badge> : <Badge tone="muted">Pasif</Badge>}
                        <Toggle
                          on={testStates[t.id]}
                          onChange={(v) => { setTestStates((s) => ({ ...s, [t.id]: v })); setToast(`${L(t.name, "tr")} ${v ? "aktifleştirildi" : "pasifleştirildi"}.`); }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {section === "analytics" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>Haftalık Tamamlanan Testler</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={WEEKLY}>
                    <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                    <XAxis dataKey="gun" tick={{ fontSize: 11, fill: C.textMuted }} />
                    <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
                    <Tooltip />
                    <Bar dataKey="test" radius={[6, 6, 0, 0]}>
                      {WEEKLY.map((_, i) => <Cell key={i} fill={[C.primary, C.secondary, C.accent1, C.accent2, C.accent3, C.warning, C.success][i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>Plan Dağılımı</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={SUB_DIST} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {SUB_DIST.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {section === "reports" && (
            <Card>
              <div className="flex flex-col gap-2">
                {MOCK_SESSIONS.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2" style={{ borderColor: C.border }}>
                    <span className="text-sm" style={{ color: C.text }}>{s.user} — {s.test}</span>
                    <button onClick={() => setToast("Rapor görüntüleme üretim ortamında aktif olacaktır.")} className="text-xs font-medium" style={{ color: C.primary }}>Görüntüle</button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {section === "subs" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <h3 className="text-sm font-medium mb-2" style={{ color: C.text }}>Abonelik Dağılımı</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={SUB_DIST} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {SUB_DIST.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                {SUB_DIST.map((d) => (
                  <Card key={d.name} className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: d.color }}>{d.name}</span>
                    <span className="text-2xl font-semibold" style={{ color: C.text }}>{d.value}</span>
                    <span className="text-xs" style={{ color: C.textMuted }}>abone</span>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {section === "settings" && (
            <Card>
              <div className="flex flex-col gap-4">
                {[
                  { key: "maintenance", label: "Bakım modu", desc: "Aktifken kullanıcılar sisteme erişemez." },
                  { key: "registration", label: "Yeni kayıtlara açık", desc: "Yeni kullanıcı kayıtlarını kabul et." },
                  { key: "emails", label: "E-posta bildirimleri", desc: "Sistem e-postalarını gönder." },
                ].map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.text }}>{s.label}</p>
                      <p className="text-xs" style={{ color: C.textMuted }}>{s.desc}</p>
                    </div>
                    <Toggle
                      on={settings[s.key]}
                      onChange={(v) => { setSettings((st) => ({ ...st, [s.key]: v })); setToast(`${s.label} ${v ? "açıldı" : "kapatıldı"}.`); }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {section === "sessions" && (
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: C.textMuted }}>
                    <th className="pb-2 font-normal">Kullanıcı</th>
                    <th className="pb-2 font-normal">Test</th>
                    <th className="pb-2 font-normal">Skor</th>
                    <th className="pb-2 font-normal">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_SESSIONS.map((s, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: C.border }}>
                      <td className="py-2" style={{ color: C.text }}>{s.user}</td>
                      <td className="py-2" style={{ color: C.textMuted }}>{s.test}</td>
                      <td className="py-2 font-medium" style={{ color: C.primary }}>{s.skor}</td>
                      <td className="py-2" style={{ color: C.textMuted }}>{new Date(s.tarih).toLocaleDateString("tr-TR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

/* ============================================================
   APP ROOT
   ============================================================ */
export default function App() {
  const [lang, setLang] = useState("tr");
  const [role, setRole] = useState("user");
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState("landing");
  const [activeTest, setActiveTest] = useState(null);
  const [lastEvents, setLastEvents] = useState(null);
  const [result, setResult] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
  const [reports, setReports] = useState([]);
  const [activeClientId, setActiveClientId] = useState(null);
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [plan, setPlan] = useState("FREE");
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[3]);
  const [ageReturn, setAgeReturn] = useState("dashboard");
  const [trainings, setTrainings] = useState([]);
  const [activeTraining, setActiveTraining] = useState(null);
  const [libraryText, setLibraryText] = useState(null);
  const [program, setProgram] = useState({ level: null, day: 1, completedToday: [], completedDays: 0 });
  const [streak, setStreak] = useState({ count: 0, days: [false, false, false, false, false, false, false], last: null });
  const [streakShow, setStreakShow] = useState(false);
  const [activeSelfTest, setActiveSelfTest] = useState(null);
  const [selfResults, setSelfResults] = useState([]);
  const [trialPromo, setTrialPromo] = useState(false);
  const promoShownRef = useRef(false);

  const markActivity = () => {
    const today = new Date().toDateString();
    if (streak.last === today) return;
    const idx = (new Date().getDay() + 6) % 7;
    setStreak((s) => {
      const days = [...s.days];
      days[idx] = true;
      return { count: s.count + 1, days, last: today };
    });
    setStreakShow(true);
  };
  const activeClient = clients.find((c) => c.id === activeClientId) || null;
  const addNotification = (text) => setNotifications((prev) => [{ id: uid(), text, time: Date.now(), read: false }, ...prev]);

  useEffect(() => {
    if (screen === "processing") {
      let cancelled = false;
      (async () => {
        const t0 = performance.now();
        // Önce sunucudan skorlamayı dene ("değer sunucuda")
        const server = await api.submitSession(activeTest.id, activeTest.type, activeTest.age, lastEvents);
        // Minimum 900ms "hesaplanıyor" ekranı (yerel fallback göz kırpmasın)
        await new Promise((res) => setTimeout(res, Math.max(0, 900 - (performance.now() - t0))));
        if (cancelled) return;
        const r = server && server.overall != null
          ? { id: server.id || uid(), testId: activeTest.id, testName: activeTest.name, date: server.date || new Date().toISOString(), overall: server.overall, subscores: server.subscores, stats: server.stats, blockStats: server.blockStats ?? null, source: "api" }
          : { ...computeResult(activeTest, lastEvents), source: "local" };
        setResult(r);
        setSessions((s) => [...s, r]);
        addNotification(lang === "en" ? "Your test result is ready." : "Test sonucunuz oluşturuldu.");
        markActivity();
        if (BILLING_ENABLED && !promoShownRef.current && plan === "FREE" && sessions.length === 0) {
          promoShownRef.current = true;
          setTimeout(() => setTrialPromo(true), 2500);
        }
        setScreen("results");
      })();
      return () => { cancelled = true; };
    }
  }, [screen]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }
  }, [toast]);

  const hideNav = screen === "countdown" || screen === "test" || screen === "training-run" || screen === "selftest-run" || screen === "level-test";

  return (
    <LangContext.Provider value={lang}>
    <div className="min-h-screen font-sans" style={{ background: C.bg, color: C.text }}>
      <GlobalMotionStyles />
      {screen !== "landing" && screen !== "auth" && screen !== "onboarding" && screen !== "age-select" && (
        <TopNav role={role} setRole={setRole} screen={screen} setScreen={setScreen} hideDuringTest={hideNav}
          notifications={notifications} setNotifications={setNotifications} plan={plan} lang={lang} setLang={setLang} />
      )}

      {screen === "landing" && (
        <Landing onStart={() => setScreen("auth")} onExpert={() => setScreen("auth-expert")} />
      )}

      {(screen === "auth" || screen === "auth-expert") && (
        <AuthScreen
          expertMode={screen === "auth-expert"}
          onBack={() => setScreen("landing")}
          onDone={(mode, detectedRole, name) => {
            setCurrentUser({ name, role: detectedRole });
            setRole(detectedRole);
            if (mode === "register") { setScreen("onboarding"); return; }
            if (detectedRole === "expert") setScreen("expert-dashboard");
            else if (detectedRole === "admin") setScreen("admin-dashboard");
            else setScreen("dashboard");
          }}
        />
      )}

      {screen === "onboarding" && <Onboarding onFinish={() => { setAgeReturn("dashboard"); setScreen("age-select"); }} />}

      {screen === "age-select" && (
        <AgeSelect current={ageGroup} onSelect={(g) => { setAgeGroup(g); setToast(lang === "en" ? `${L(g.label, "en")} group selected — tests will adapt accordingly.` : `${L(g.label, "tr")} grubu seçildi — testler buna göre uyarlanacak.`); setScreen(ageReturn); }} />
      )}

      {screen === "dashboard" && (
        <UserDashboard
          currentUser={currentUser}
          ageGroup={ageGroup}
          sessions={sessions}
          trainings={trainings}
          plan={plan}
          streak={streak}
          onGoCatalog={() => setScreen("catalog")}
          onGoTraining={() => setScreen("training")}
          onGoLibrary={() => setScreen("library")}
          onGoSubscription={() => setScreen("subscription")}
        />
      )}

      {screen === "history" && (
        <ResultsHistory
          sessions={sessions}
          selfResults={selfResults}
          onGoCatalog={() => setScreen("catalog")}
          onOpenResult={(s) => { setResult(s); setScreen("results"); }}
          onOpenReport={() => setScreen("full-report")}
        />
      )}

      {screen === "full-report" && (
        <ComprehensiveReport
          sessions={sessions}
          trainings={trainings}
          currentUser={currentUser}
          onBack={() => setScreen("history")}
        />
      )}

      {screen === "profile" && (
        <ProfileScreen
          sessions={sessions}
          plan={plan}
          onGoSubscription={() => setScreen("subscription")}
          setToast={setToast}
          onLogout={() => setScreen("landing")}
          onDeleteAccount={() => { setSessions([]); setNotifications([]); setScreen("landing"); setToast("Hesabınız ve tüm verileriniz silindi."); }}
        />
      )}

      {screen === "subscription" && BILLING_ENABLED && (
        <SubscriptionScreen
          plan={plan} setPlan={setPlan}
          setToast={setToast} addNotification={addNotification}
          onBack={() => setScreen("profile")}
        />
      )}

      {screen === "training" && (
        <TrainingCatalog
          trainings={trainings}
          ageGroup={ageGroup}
          program={program}
          onStartLevelTest={() => setScreen("level-test")}
          onOpenLibrary={() => setScreen("library")}
          onSelect={(ex) => { setLibraryText(null); setActiveTraining({ ...ex, name: L(ex.name, lang), desc: L(ex.desc, lang) }); setScreen("training-run"); }}
        />
      )}

      {screen === "level-test" && (
        <ReadingTestExercise
          ex={{ id: "level", name: "Seviye Belirleme Testi", icon: "🎚️", color: C.primary }}
          ageGroup={ageGroup}
          initialText={READING_TEXTS.find((t) => t.id === "r3")}
          onBack={() => setScreen("training")}
          onFinish={(r) => {
            let lvl = r.wpm < 120 ? "Başlangıç" : r.wpm <= 200 ? "Orta" : "İleri";
            if (r.comp < 60 && lvl !== "Başlangıç") lvl = lvl === "İleri" ? "Orta" : "Başlangıç";
            setProgram({ level: lvl, day: 1, completedToday: [], completedDays: 0 });
            setTrainings((prev) => [...prev, { id: uid(), exerciseId: "reading-test", name: "Seviye Belirleme Testi", date: new Date().toISOString(), ...r }]);
            markActivity();
            setScreen("training");
            setToast(lang === "en" ? `Your level is set: ${lvl} — your 21-day program is ready! 🎉` : `Seviyeniz belirlendi: ${lvl} — 21 günlük programınız hazır! 🎉`);
          }}
        />
      )}

      {screen === "library" && (
        <LibraryScreen
          ageGroup={ageGroup}
          onBack={() => setScreen("training")}
          onStartExercise={(exId, text) => {
            const entry = TRAINING_CATALOG.find((e) => e.id === exId);
            if (!entry) return;
            setLibraryText(text);
            setActiveTraining({ ...entry, name: L(entry.name, lang), desc: L(entry.desc, lang) });
            setScreen("training-run");
          }}
        />
      )}

      {screen === "training-run" && activeTraining && (() => {
        const finish = (r) => {
          api.submitTraining(activeTraining.id, r.score, r.detail, r.wpm); // fire-and-forget
          setTrainings((prev) => [...prev, { id: uid(), exerciseId: activeTraining.id, name: activeTraining.name, date: new Date().toISOString(), ...r }]);
          markActivity();
          setLibraryText(null);
          if (program.level) {
            const plan = dayPlan(program.day, program.level);
            if (plan.includes(activeTraining.id) && !program.completedToday.includes(activeTraining.id)) {
              const nextToday = [...program.completedToday, activeTraining.id];
              if (nextToday.filter((id) => plan.includes(id)).length >= 3) {
                setProgram((p) => ({ ...p, day: Math.min(PROGRAM_LENGTH, p.day + 1), completedToday: [], completedDays: p.completedDays + 1 }));
                setToast(lang === "en" ? `🎉 Day ${program.day} training complete! Day ${Math.min(PROGRAM_LENGTH, program.day + 1)} awaits tomorrow.` : `🎉 Gün ${program.day} antrenmanı tamamlandı! Yarın Gün ${Math.min(PROGRAM_LENGTH, program.day + 1)} sizi bekliyor.`);
                setScreen("training");
                return;
              }
              setProgram((p) => ({ ...p, completedToday: nextToday }));
            }
          }
          setScreen("training");
          setToast(lang === "en" ? `${activeTraining.name} completed — Score ${r.score}/100` : `${activeTraining.name} tamamlandı — Skor ${r.score}/100`);
        };
        const back = () => { setLibraryText(null); setScreen("training"); };
        const props = { ex: exTheme(activeTraining, ageGroup, lang), onFinish: finish, onBack: back, ageGroup, initialText: libraryText };
        if (activeTraining.id === "eye") return <EyeTrainingExercise {...props} />;
        if (activeTraining.id === "growshape") return <GrowShapeExercise {...props} />;
        if (activeTraining.id === "benzer") return <SimilarWordsExercise {...props} />;
        if (activeTraining.id === "oddeven") return <OddEvenExercise {...props} />;
        if (activeTraining.id === "arithmetic") return <ArithmeticSprintExercise {...props} />;
        if (activeTraining.id === "synonym") return <SynonymHuntExercise {...props} />;
        if (activeTraining.id === "number-memory") return <NumberMemoryExercise {...props} />;
        if (activeTraining.id === "pattern") return <PatternHuntExercise {...props} />;
        if (activeTraining.id === "block-reading") return <BlockReadingExercise {...props} />;
        if (activeTraining.id === "reading-test") return <ReadingTestExercise {...props} />;
        if (activeTraining.id === "match") return <MatchExercise {...props} />;
        if (activeTraining.id === "schulte") return <SchulteExercise {...props} />;
        if (activeTraining.id === "flash") return <FlashWordExercise {...props} />;
        if (activeTraining.id === "rsvp") return <RSVPExercise {...props} />;
        return <PeripheralExercise {...props} />;
      })()}

      {screen === "catalog" && (
        <TestCatalog
          ageGroup={ageGroup}
          onChangeAge={() => { setAgeReturn("catalog"); setScreen("age-select"); }}
          onSelectSelf={(st) => { setActiveSelfTest(st); setScreen("selftest-intro"); }}
          onSelect={(t) => {
            setActiveTest({
              ...t,
              name: L(t.name, lang),
              desc: L(t.desc, lang),
              trials: Math.max(6, Math.round((t.trials || 12) * ageGroup.trialFactor)),
              age: ageGroup,
            });
            setScreen("instructions");
          }}
        />
      )}

      {screen === "selftest-intro" && activeSelfTest && (
        <SelfTestIntro test={activeSelfTest} onStart={() => setScreen("selftest-run")} onBack={() => setScreen("catalog")} />
      )}

      {screen === "selftest-run" && activeSelfTest && (
        <SelfTestRunner
          test={activeSelfTest}
          onExit={(summary) => {
            if (summary && summary.id) {
              // Not: skorlama artık SelfTestRunner içinde, sonuç ekranı gösterilmeden ÖNCE
              // sunucuya gönderilip bekleniyor — burada tekrar göndermeye gerek yok.
              setSelfResults((prev) => [...prev, summary]);
              addNotification(lang === "en" ? "Your self-assessment result was saved." : "Öz değerlendirme sonucunuz kaydedildi.");
            }
            markActivity();
            setScreen("catalog");
          }}
        />
      )}

      {screen === "instructions" && activeTest && (
        <Instructions test={activeTest} onBack={() => setScreen("catalog")} onStart={() => setScreen("countdown")} />
      )}

      {screen === "countdown" && <Countdown onDone={() => setScreen("test")} />}

      {screen === "test" && activeTest && activeTest.type === "digit-span" && (
        <MemoryTestRunner test={activeTest} onFinish={(events) => { setLastEvents(events); setScreen("processing"); }} onAbort={() => setScreen("aborted")} />
      )}
      {screen === "test" && activeTest && activeTest.type !== "digit-span" && (
        <TestRunner test={activeTest} onFinish={(events) => { setLastEvents(events); setScreen("processing"); }} onAbort={() => setScreen("aborted")} />
      )}

      {screen === "aborted" && activeTest && (
        <TestAborted test={activeTest} onRestart={() => setScreen("countdown")} onCancel={() => setScreen("catalog")} />
      )}

      {screen === "processing" && <Processing />}

      {screen === "results" && result && <Results result={result} onDashboard={() => setScreen("dashboard")} />}

      {screen === "expert-dashboard" && (
        <ExpertDashboard
          clients={clients} setClients={setClients}
          assignments={assignments} setAssignments={setAssignments}
          setToast={setToast} addNotification={addNotification}
          onOpenClient={(c) => { setActiveClientId(c.id); setScreen("expert-client"); }}
        />
      )}
      {screen === "expert-client" && activeClient && (
        <ExpertClientDetail
          client={activeClient} setClients={setClients}
          assignments={assignments} setAssignments={setAssignments}
          reports={reports} setReports={setReports}
          setToast={setToast} addNotification={addNotification}
          onBack={() => setScreen("expert-dashboard")}
        />
      )}

      {screen === "admin-dashboard" && <AdminDashboard setToast={setToast} />}

      {role === "user" && !["landing", "auth", "onboarding", "age-select", "countdown", "test", "processing", "training-run", "selftest-run", "level-test"].includes(screen) && (
        <BottomNav screen={screen} setScreen={setScreen} />
      )}

      {streakShow && <StreakModal streak={streak} onClose={() => setStreakShow(false)} />}

      {trialPromo && (
        <TrialPromoModal
          onSeePlans={() => { setTrialPromo(false); setScreen("subscription"); }}
          onClose={() => setTrialPromo(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm text-white" style={{ background: C.text }}>
          {toast}
        </div>
      )}
    </div>
    </LangContext.Provider>
  );
}
