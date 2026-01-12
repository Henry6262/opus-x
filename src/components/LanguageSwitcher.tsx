"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, defaultLocale, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

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

    router.push(nextPath === "" ? "/" : nextPath);
  };

  return (
    <div className={cn("flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 p-1", className)}>
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleLocaleChange(loc)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-full transition-all duration-200",
            locale === loc
              ? "bg-[#c4f70e] text-black"
              : "text-white/60 hover:text-white hover:bg-white/10"
          )}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
}
