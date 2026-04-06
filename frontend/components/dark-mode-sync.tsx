"use client"

import { useEffect } from "react"
import { useAppStore } from "@/store"

export function DarkModeSync() {
  const isDarkMode = useAppStore((s) => s.isDarkMode)

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDarkMode])

  return null
}
