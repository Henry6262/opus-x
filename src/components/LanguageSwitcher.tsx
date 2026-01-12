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

    const rawSegments = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
    const hasLocale = locales.includes(rawSegments[0] as Locale);
    const pathSegments = hasLocale ? rawSegments.slice(1) : rawSegments;

    let newPath = "";
    if (newLocale !== defaultLocale) {
      newPath = `/${newLocale}`;
    }
    if (pathSegments.length > 0) {
      newPath += `/${pathSegments.join("/")}`;
    }
    if (newPath === "") newPath = "/";

    router.push(newPath);
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
