"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { getApiErrorMessage } from "@/lib/api";
import { Headphones, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function LoginContent() {
  const router = useRouter();
  const { login } = useAppStore();
  const dict = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(dict.auth.fillFields);
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success(dict.auth.welcomeBack);
      router.push("/");
    } catch (error) {
      toast.error(getApiErrorMessage(error, dict.auth.invalidCredentials));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-primary px-5 page-enter">
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-coral rounded-2xl flex items-center justify-center shadow-xl">
            <Headphones className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">SyncWalk</h1>
            <p className="text-white/60 text-sm">{dict.auth.appSubtitle}</p>
          </div>
        </div>
        <div className="w-full bg-card rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-foreground mb-5">
            {dict.auth.signIn}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {dict.auth.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="olena@email.com"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-coral/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {dict.auth.password}
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-coral/40 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-coral text-white rounded-xl py-3.5 font-bold text-sm mt-2 active-scale disabled:opacity-70 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                dict.auth.signIn
              )}
            </button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">
            {dict.auth.noAccount}{" "}
            <Link href="/auth/register" className="text-coral font-semibold">
              {dict.auth.register}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
