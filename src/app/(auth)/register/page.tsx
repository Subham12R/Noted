import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"

export const metadata = {
  title: "Sign Up - Noted",
  description: "Create your Noted account",
}

export default function RegisterPage() {
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
            Start your journey to better note-taking.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#121212] border border-neutral-800 p-8 md:p-12">
          {/* Welcome text */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Create your account
            </h2>
            <p className="text-neutral-500 text-sm">
              Start organizing your thoughts today
            </p>
          </div>

          {/* Register Form */}
          <RegisterForm />

          {/* Sign in link */}
          <p className="text-center text-sm text-neutral-500 mt-8 pt-6 border-t border-neutral-800">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-white hover:text-neutral-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-600 mt-8">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
