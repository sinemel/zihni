"use client";

import { useEffect, useState } from "react";
import App from "../src/App";

export default function Page() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // API adresi ortamdan gelir; prototipteki apiFetch bu değişkeni okur
    window.KOGNITA_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    setReady(true);
  }, []);
  if (!ready) return null; // Uygulama tarayıcıda hidrate olur (SSR'de recharts/perf API'leri gerekmez)
  return <App />;
}
