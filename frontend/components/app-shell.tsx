"use client"

import { useEffect, useRef } from "react"
import { SplashScreen } from "@/components/splash-screen"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { DarkModeSync } from "@/components/dark-mode-sync"
import { useAppStore } from "@/store"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const hydrateAuth = useAppStore((s) => s.hydrateAuth)
  const fetchTours = useAppStore((s) => s.fetchTours)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    hydrateAuth()
    fetchTours()
  }, [hydrateAuth, fetchTours])

  return (
    <>
      <DarkModeSync />
      <SplashScreen />
      <div className="relative min-h-screen bg-background">
        <div className="mx-auto max-w-md min-h-screen flex flex-col relative overflow-x-hidden">
          {children}
        </div>
        <BottomTabBar />
      </div>
    </>
  )
}
