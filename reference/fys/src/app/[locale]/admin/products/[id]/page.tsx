"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/I18nProvider";
import { localizePathname } from "@/i18n/paths";

export default function EditProductPage() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    router.replace(localizePathname(locale, "/admin/products"));
  }, [locale, router]);

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.3em] text-sky-200">Products</p>
      <h1 className="text-2xl font-semibold text-white">Redirecting to products…</h1>
    </div>
  );
}
