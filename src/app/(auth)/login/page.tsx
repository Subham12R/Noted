import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"
import { Suspense } from "react"

export const metadata = {
  title: "Sign In - Noted",
  description: "Sign in to your Noted account",
}

function LoginFormFallback() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1
              className="text-5xl text-purple-600"
              style={{ fontFamily: "var(--font-grandhotel)" }}
            >
              Noted
            </h1>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm">
          {/* Welcome text */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Welcome back
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Sign in to continue to your notes
            </p>
          </div>

          {/* Login Form */}
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
