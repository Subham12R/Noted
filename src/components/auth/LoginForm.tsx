"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { OAuthButtons } from "./OAuthButtons";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { signInWithEmail, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signInWithEmail(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isLoading || isSubmitting;

  return (
    <div className="w-full">
      <OAuthButtons disabled={disabled} redirectTo={redirectTo} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-800" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-[#1a1a1a] text-neutral-500">
            or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-950/30 border border-red-900 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-300 mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={disabled}
            className="w-full rounded px-4 py-3 bg-[#1a1a1a] border border-neutral-800 focus:border-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white placeholder-neutral-600"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-300"
            >
              Password
            </label>
            <a
              href="#"
              className="text-sm text-neutral-400 hover:text-white font-medium transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={disabled}
            minLength={8}
            className="w-full rounded px-4 py-3 bg-[#1a1a1a] border border-neutral-800 focus:border-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white placeholder-neutral-600"
          />
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded py-3 px-4 bg-white hover:bg-neutral-200 text-black font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </div>
  );
}
