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
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="max-w-4xl mx-auto">
        <div className="border-x border-neutral-800 min-h-screen">
            {/* Hero Section */}
            <div className="p-8 md:p-12">
              <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
                Sign In to Your Workspace
              </h1>
              <p className="text-neutral-500 text-base max-w-3xl">
                Bring your own models for full control, or use our optimized defaults to get started instantly.
                No setup friction — just open and write.
              </p>
            </div>

            {/* Form Section */}
            <div className="border-t border-neutral-800 p-8 md:p-12">
              <div className="max-w-4xl">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Welcome back. Sign in to continue.
                </h2>
             
              </div>

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

            {/* Footer Section */}
            <div className="border-t border-neutral-800 px-8 md:px-12 py-6 flex items-center justify-between">
              <p className="text-xs text-neutral-600">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
              <p className="text-xs text-neutral-600">
                &copy; {new Date().getFullYear()} Noted
              </p>
            </div>
          </div>
        </div>
      </div>
    
  )
}
