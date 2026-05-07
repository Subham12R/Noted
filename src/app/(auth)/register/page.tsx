import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"

export const metadata = {
  title: "Sign Up - Noted",
  description: "Create your Noted account",
}

export default function RegisterPage() {
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
            Create Your<br />Account
          </h1>
          <p className="text-neutral-500 text-base max-w-xl">
            Start your journey to better note-taking. Organize, collaborate, and create with ease.
            No setup friction — just open and write.
          </p>
        </div>

        {/* Register Form Card */}
        <div className="border border-neutral-800 bg-black p-8 md:p-12">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold text-white mb-2">
              Create your account
            </h2>
            <p className="text-neutral-500 text-sm mb-8">
              Start organizing your thoughts today
            </p>

            <RegisterForm />

            <p className="text-sm text-neutral-500 mt-8 pt-6 border-t border-neutral-800">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-white hover:text-neutral-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-neutral-600">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
          <p className="text-xs text-neutral-600">
            &copy; {new Date().getFullYear()} Noted
          </p>
        </div>
      </div>
    </div>
  )
}
