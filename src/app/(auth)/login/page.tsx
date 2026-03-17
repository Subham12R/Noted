import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"
import { Suspense } from "react"

export const metadata = {
  title: "Sign In - Noted",
  description: "Sign in to your Noted account",
}

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <div className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
      <div className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
      <div className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-[#121212]">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo - Mobile only */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-block">
              <h1
                className="text-4xl text-indigo-600"
                style={{ fontFamily: "var(--font-grandhotel)" }}
              >
                Noted
              </h1>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
            {/* Welcome text */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
                Welcome back
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Sign in to continue to your notes
              </p>
            </div>

            {/* Login Form */}
            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm />
            </Suspense>

            {/* Sign up link */}
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 bg-indigo-600 dark:bg-indigo-900 items-center justify-center p-12">
        <div className="text-center max-w-lg">
          <h2
            className="text-5xl text-white mb-6"
            style={{ fontFamily: "var(--font-grandhotel)" }}
          >
            Noted
          </h2>
          <p className="text-indigo-100 text-lg mb-8">
            Capture ideas, organize thoughts, and collaborate seamlessly. 
            Your notes, beautifully organized.
          </p>
          <div className="flex justify-center gap-4">
            <div className="w-3 h-3 bg-indigo-400 rounded-full" />
            <div className="w-3 h-3 bg-white/30 rounded-full" />
            <div className="w-3 h-3 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
