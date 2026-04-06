"use client"

import { useEffect, useState } from "react"
import { Headphones } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export function SplashScreen() {
  const dict = useI18n()
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFading(true), 1800)
    const hideTimer = setTimeout(() => setVisible(false), 2200)
    return () => {
      clearTimeout(timer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-navy transition-opacity duration-400 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-coral shadow-2xl">
          <Headphones className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">SyncWalk</h1>
          <p className="text-sm text-white/60 font-medium">{dict.auth.appSubtitle}</p>
        </div>
      </div>
      <div className="absolute bottom-12 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-coral/80 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
