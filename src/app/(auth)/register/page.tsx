import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"

export const metadata = {
  title: "Sign Up - Noted",
  description: "Create your Noted account",
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Image (opposite of login) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-center items-center px-12 text-white">
          {/* Illustration - Collaborative workspace */}
          <div className="relative w-full max-w-lg">
            {/* Main workspace card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500" />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 -ml-2" />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 -ml-2" />
                </div>
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">3 online</span>
              </div>

              {/* Content lines */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-purple-400/30 flex items-center justify-center">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="h-3 bg-white/20 rounded flex-1" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-purple-400/30 flex items-center justify-center">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="h-3 bg-white/20 rounded w-4/5" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-white/30" />
                  <div className="h-3 bg-white/20 rounded w-3/4" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-white/30" />
                  <div className="h-3 bg-white/20 rounded w-5/6" />
                </div>
              </div>
            </div>

            {/* Cursor indicator 1 */}
            <div className="absolute top-16 right-12 flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.5 3.5L6.5 18L11.5 13L17.5 14.5L5.5 3.5Z" />
              </svg>
              <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded">Sarah</span>
            </div>

            {/* Cursor indicator 2 */}
            <div className="absolute bottom-20 left-8 flex items-center gap-1">
              <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.5 3.5L6.5 18L11.5 13L17.5 14.5L5.5 3.5Z" />
              </svg>
              <span className="text-xs bg-green-400 text-green-900 px-2 py-0.5 rounded">Alex</span>
            </div>
          </div>

          {/* Text */}
          <div className="mt-12 text-center">
            <h3 className="text-2xl font-bold mb-3">Work together, seamlessly</h3>
            <p className="text-white/70 max-w-sm">
              Invite your team, share ideas instantly, and watch your notes come to life.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-10">
            <div className="text-center">
              <div className="text-3xl font-bold">10k+</div>
              <div className="text-white/60 text-sm">Active users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">50k+</div>
              <div className="text-white/60 text-sm">Notes created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">99%</div>
              <div className="text-white/60 text-sm">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form (opposite of login) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <Link href="/" className="inline-block mb-12">
            <h1
              className="text-5xl text-purple-600"
              style={{ fontFamily: "var(--font-grandhotel)" }}
            >
              Noted
            </h1>
          </Link>

          {/* Welcome text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Create your account
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Start organizing your thoughts today
            </p>
          </div>

          {/* Register Form */}
          <RegisterForm />

          {/* Sign in link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
