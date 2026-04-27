"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import {
  User,
  Headphones,
  LogOut,
  ChevronRight,
  Settings,
  Sun,
  Moon,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export function ProfileContent() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    logout,
    purchasedAccess,
    isDarkMode,
    toggleDarkMode,
    language,
  } = useAppStore();

  const purchasedCount = Object.keys(purchasedAccess ?? {}).length;
  const dict = useI18n();

  const handleLogout = () => {
    logout();
    toast.success(dict.profile.loggedOut);
    router.push("/");
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-5">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {dict.profile.signInRequired}
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          {dict.profile.signInRequiredHint}
        </p>
        <Link
          href="/auth/login"
          className="w-full max-w-xs bg-coral text-white rounded-2xl py-3.5 text-center font-bold active-scale"
        >
          {dict.auth.signIn}
        </Link>
        <Link
          href="/auth/register"
          className="w-full max-w-xs bg-card border border-border text-foreground rounded-2xl py-3.5 text-center font-bold active-scale"
        >
          {dict.profile.createAccount}
        </Link>
        <Link
          href="/room/join"
          className="w-full max-w-xs bg-surface border border-border text-foreground rounded-2xl py-3.5 text-center font-bold active-scale"
        >
          {dict.auth.enterRoomCode}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-safe page-enter">
      <div className="bg-card px-5 pt-8 pb-10 relative overflow-hidden border-b border-border">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-coral/20" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-muted/40" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-coral flex items-center justify-center text-white text-2xl font-bold ring-2 ring-coral/30">
            {user.name[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>
      <div className="px-5 mt-5 flex flex-col gap-3">
        <Link
          href="/profile/tours"
          className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border active-scale"
        >
          <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-coral" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">
              {dict.profile.myTours}
            </p>
            <p className="text-xs text-muted-foreground">
              {purchasedCount} {dict.profile.purchased}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        <Link
          href="/room/join"
          className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border active-scale"
        >
          <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-coral" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">
              {dict.profile.joinGroup}
            </p>
            <p className="text-xs text-muted-foreground">
              {dict.profile.joinGroupSubtitle}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            {isDarkMode ? (
              <Moon className="w-5 h-5 text-foreground" />
            ) : (
              <Sun className="w-5 h-5 text-foreground" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">
              {dict.profile.darkMode}
            </p>
            <p className="text-xs text-muted-foreground">
              {isDarkMode ? dict.common.yes : dict.common.no}
            </p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              isDarkMode ? "bg-coral" : "bg-muted"
            }`}
            role="switch"
            aria-checked={isDarkMode}
            aria-label={dict.profile.toggleDarkMode}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                isDarkMode ? "translate-x-1" : "-translate-x-5"
              }`}
            />
          </button>
        </div>

        <Link
          href="/settings/language"
          className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border active-scale w-full text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">
              {dict.profile.changeLanguage}
            </p>
            <p className="text-xs text-muted-foreground">
              {language === "en"
                ? dict.profile.languageEn
                : dict.profile.languageUk}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-destructive/30 active-scale w-full text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-destructive text-sm">
              {dict.profile.logout}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
