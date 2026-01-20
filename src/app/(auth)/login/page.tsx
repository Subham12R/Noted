import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"
import Image from "next/image"

export const metadata = {
  title: "Sign In - Noted",
  description: "Sign in to your Noted account",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
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
              Welcome back
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Sign in to continue to your notes
            </p>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-center items-center px-12 text-white">
          {/* Floating notes illustration */}
          <div className="relative w-full max-w-lg">
            {/* Main card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-white/20 rounded w-3/4" />
                <div className="h-4 bg-white/20 rounded w-full" />
                <div className="h-4 bg-white/20 rounded w-5/6" />
                <div className="h-4 bg-white/20 rounded w-2/3" />
              </div>
            </div>

            {/* Floating card 1 */}
            <div className="absolute -top-8 -right-8 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-xl transform rotate-6">
              <div className="w-24 h-16 flex flex-col gap-2">
                <div className="h-2 bg-white/30 rounded w-full" />
                <div className="h-2 bg-white/30 rounded w-3/4" />
                <div className="h-2 bg-white/30 rounded w-5/6" />
              </div>
            </div>

            {/* Floating card 2 */}
            <div className="absolute -bottom-6 -left-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-xl transform -rotate-3">
              <div className="w-20 h-12 flex flex-col gap-2">
                <div className="h-2 bg-white/30 rounded w-full" />
                <div className="h-2 bg-white/30 rounded w-2/3" />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="mt-12 text-center">
            <h3 className="text-2xl font-bold mb-3">Organize your thoughts</h3>
            <p className="text-white/70 max-w-sm">
              Capture ideas, collaborate in real-time, and keep everything in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 mt-8 justify-center">
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm border border-white/20">
              Real-time collaboration
            </span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm border border-white/20">
              Rich text editing
            </span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm border border-white/20">
              Whiteboard
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
