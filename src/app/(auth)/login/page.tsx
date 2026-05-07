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
      <div className="h-12 bg-neutral-800 animate-pulse" />
      <div className="h-12 bg-neutral-800 animate-pulse" />
      <div className="h-12 bg-neutral-800 animate-pulse" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4 py-12">
      <div className="w-full max-w-4xl">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <h1
              className="text-5xl text-white tracking-tight"
              style={{ fontFamily: "var(--font-grandhotel)" }}
            >
              Noted
            </h1>
          </Link>
          <p className="text-neutral-500 text-sm mt-2">
            Capture ideas, organize thoughts, collaborate seamlessly.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#121212] border border-neutral-800 p-8 md:p-12">
          {/* Welcome text */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Welcome back
            </h2>
            <p className="text-neutral-500 text-sm">
              Sign in to continue to your notes
            </p>
          </div>

          {/* Login Form */}
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>

          {/* Sign up link */}
          <p className="text-center text-sm text-neutral-500 mt-8 pt-6 border-t border-neutral-800">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-white hover:text-neutral-300 font-medium transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-600 mt-8">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
