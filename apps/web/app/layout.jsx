import "./globals.css";

export const metadata = {
  title: "Kognita — Bilişsel Performans Platformu",
  description:
    "Dikkat, tepki hızı ve bilişsel becerileriniz için interaktif değerlendirme ve antrenman. Klinik tanı koymaz; sonuçlar klinik değerlendirmenin yerini tutmaz.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
