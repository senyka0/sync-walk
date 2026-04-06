"use client"

import { useRouter } from "next/navigation"
import AppShell from "@/components/app-shell"
import { useAppStore } from "@/store"
import { useI18n } from "@/lib/i18n"

export default function LanguageSettingsPage() {
  const router = useRouter()
  const language = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const dict = useI18n()

  const handleSelect = (lang: "en" | "uk") => {
    setLanguage(lang)
    router.back()
  }

  return (
    <AppShell>
      <main className="flex flex-col min-h-screen px-5 pt-6 pb-safe page-enter">
        <h1 className="text-xl font-bold text-foreground mb-4">
          {dict.language.title}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {dict.language.description}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleSelect("en")}
            className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold active-scale ${
              language === "en"
                ? "bg-coral text-white border-coral"
                : "bg-card text-foreground border-border"
            }`}
          >
            <span>{dict.language.english}</span>
            {language === "en" && (
              <span className="text-[11px] uppercase tracking-wide">
                {dict.language.selectedEn}
              </span>
            )}
          </button>

          <button
            onClick={() => handleSelect("uk")}
            className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold active-scale ${
              language === "uk"
                ? "bg-coral text-white border-coral"
                : "bg-card text-foreground border-border"
            }`}
          >
            <span>{dict.language.ukrainian}</span>
            {language === "uk" && (
              <span className="text-[11px] uppercase tracking-wide">
                {dict.language.selectedUk}
              </span>
            )}
          </button>
        </div>
      </main>
    </AppShell>
  )
}
