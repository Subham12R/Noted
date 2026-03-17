import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"

export const metadata = {
  title: "Sign Up - Noted",
  description: "Create your Noted account",
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-[#121212]">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 bg-neutral-900 dark:bg-neutral-800 items-center justify-center p-12">
        <div className="text-center max-w-lg">
          <h2
            className="text-5xl text-white mb-6"
            style={{ fontFamily: "var(--font-grandhotel)" }}
          >
            Noted
          </h2>
          <p className="text-neutral-400 text-lg mb-8">
            Start your journey to better note-taking. 
            Organize, collaborate, and create with ease.
          </p>
          <div className="flex justify-center gap-4">
            <div className="w-3 h-3 bg-neutral-600 rounded-full" />
            <div className="w-3 h-3 bg-indigo-500 rounded-full" />
            <div className="w-3 h-3 bg-neutral-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* Right side - Form */}
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
                Create your account
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Start organizing your thoughts today
              </p>
            </div>

            {/* Register Form */}
            <RegisterForm />

            {/* Sign in link */}
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
