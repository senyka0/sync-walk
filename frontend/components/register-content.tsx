"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { getApiErrorMessage } from "@/lib/api";
import { Headphones } from "lucide-react";
import { toast } from "sonner";

export function RegisterContent() {
  const router = useRouter();
  const { register } = useAppStore();
  const dict = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error(dict.auth.fillFields);
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success(dict.auth.accountCreated);
      router.push("/");
    } catch (error) {
      toast.error(getApiErrorMessage(error, dict.auth.registrationFailed));
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
            <p className="text-white/60 text-sm">
              {dict.auth.createYourAccount}
            </p>
          </div>
        </div>

        <div className="w-full bg-card rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-foreground mb-5">
            {dict.auth.register}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {dict.auth.fullName}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Olena Kovalenko"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-coral/40"
              />
            </div>
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-coral/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-coral text-white rounded-xl py-3.5 font-bold text-sm mt-2 active-scale disabled:opacity-70 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                dict.auth.createAccount
              )}
            </button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">
            {dict.auth.haveAccount}{" "}
            <Link href="/auth/login" className="text-coral font-semibold">
              {dict.auth.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
