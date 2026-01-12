"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: Locale) => {
    // Remove the current locale prefix from the pathname
    const segments = pathname.split("/");
    const currentLocaleIndex = locales.includes(segments[1] as Locale) ? 1 : -1;

    let newPath: string;
    if (currentLocaleIndex === 1) {
      // Replace existing locale
      segments[1] = newLocale;
      newPath = segments.join("/");
    } else {
      // Add locale prefix
      newPath = `/${newLocale}${pathname}`;
    }

    // For default locale (en), we can omit the prefix
    if (newLocale === "en") {
      newPath = newPath.replace(/^\/en/, "") || "/";
    }

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
