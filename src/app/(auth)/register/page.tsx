import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"

export const metadata = {
  title: "Sign Up - Noted",
  description: "Create your Noted account",
}

export default function RegisterPage() {
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
              Create your account
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Start organizing your thoughts today
            </p>
          </div>

          {/* Register Form */}
          <RegisterForm />

          {/* Sign in link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
