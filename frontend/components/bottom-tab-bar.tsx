"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Ticket, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BottomTabBar() {
  const pathname = usePathname();
  const dict = useI18n();

  const tabs = [
    { href: "/", icon: Home, label: dict.bottomTabs.home },
    { href: "/profile", icon: User, label: dict.bottomTabs.profile },
  ];

  const isHidden =
    pathname.includes("/live") ||
    pathname.includes("/done") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/pay") ||
    pathname.startsWith("/room/create") ||
    pathname.startsWith("/tours/");
  if (isHidden) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around px-4 py-2">
        {tabs.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl active-scale transition-colors ${
                isActive ? "text-coral" : "text-muted-foreground"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-all ${isActive ? "scale-110" : ""}`}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-semibold tracking-wide ${
                  isActive ? "text-coral" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
