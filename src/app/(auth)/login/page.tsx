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
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
        {/* Hero Card */}
        <div className="border border-neutral-800 bg-[#1a1a1a] p-8 md:p-12 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-2 py-0.5 bg-white text-black text-xs font-medium">
              Live
            </span>
            <span className="text-neutral-500 text-sm">
              Agentic Note Taking Environment - Start Writing in Seconds
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
            Sign In to Your<br />Workspace
          </h1>
          <p className="text-neutral-500 text-base max-w-xl">
            Bring your own models for full control, or use our optimized defaults to get started instantly.
            No setup friction — just open and write.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="border border-neutral-800 bg-black p-8 md:p-12">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold text-white mb-2">
              Welcome back
            </h2>
            <p className="text-neutral-500 text-sm mb-8">
              Sign in to continue to your notes
            </p>

            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm />
            </Suspense>

            <p className="text-sm text-neutral-500 mt-8 pt-6 border-t border-neutral-800">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-white hover:text-neutral-300 font-medium transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-neutral-600">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
          <p className="text-xs text-neutral-600">
            &copy; {new Date().getFullYear()} Noted
          </p>
        </div>
      </div>
    </div>
  )
}
