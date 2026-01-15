"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { locales, defaultLocale, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const displayLabels: Record<Locale, string> = {
    en: "EN",
    zh: "文",
  };

  const handleLocaleChange = (newLocale: Locale) => {
    if (!pathname || newLocale === locale) return;

    const segments = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
    const hasLocale = locales.includes(segments[0] as Locale);
    const pathSegments = hasLocale ? segments.slice(1) : segments;
    const trailingPath = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "";

    const nextPath =
      newLocale === defaultLocale
        ? trailingPath || "/"
        : `/${newLocale}${trailingPath}`;

    try {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    } catch (error) {
      console.warn("Failed to set locale cookie", error);
    }

    router.push(nextPath === "" ? "/" : nextPath);
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 p-1",
        className
      )}
    >
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleLocaleChange(loc)}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-full text-xs font-semibold transition-all duration-200",
            locale === loc
              ? "bg-[#c4f70e] text-black shadow-[0_0_12px_rgba(196,247,14,0.35)]"
              : "text-white/70 hover:text-white hover:bg-white/10"
          )}
          aria-label={`Switch to ${displayLabels[loc]}`}
        >
          {displayLabels[loc]}
        </button>
      ))}
    </div>
  );
}
