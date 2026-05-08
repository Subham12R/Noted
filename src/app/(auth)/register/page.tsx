import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"

export const metadata = {
  title: "Sign Up - Noted",
  description: "Create your Noted account",
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="max-w-4xl mx-auto">
        <div className="border-x border-neutral-800 min-h-screen">
            {/* Hero Section */}
            <div className="p-8 md:p-12">
              <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
                Create Your Account
              </h1>
              <p className="text-neutral-500 text-base max-w-xl">
                Start your journey to better note-taking. Organize, collaborate, and create with ease.
                No setup friction — just open and write.
              </p>
            </div>

            {/* Form Section */}
            <div className="border-t border-neutral-800 p-8 md:p-12">
              <div className="max-w-4xl">
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

            {/* Footer Section */}
            <div className="border-t border-neutral-800 px-8 md:px-12 py-6 flex items-center justify-between">
              <p className="text-xs text-neutral-600">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
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
