import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const LiveIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
})

LiveIcon.displayName = "LiveIcon"

// Animated live indicator dot for when collaboration is active
export const LiveIndicator = memo(({ isActive, className }: { isActive: boolean; className?: string }) => {
  if (!isActive) return null

  return (
    <span
      className={`inline-flex items-center justify-center ${className || ""}`}
      title="Live collaboration active"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
    </span>
  )
})

LiveIndicator.displayName = "LiveIndicator"
