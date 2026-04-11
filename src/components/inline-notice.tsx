import type { ReactNode } from "react"

import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"

type InlineNoticeProps = {
  children: ReactNode
  variant?: "error" | "success" | "info" | "warning"
  className?: string
}

const variantStyles = {
  error: {
    container: "border-red-200 bg-red-50 text-red-700",
    icon: <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />,
  },
  success: {
    container: "border-green-200 bg-green-50 text-green-700",
    icon: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />,
  },
  info: {
    container: "border-blue-200 bg-blue-50 text-blue-700",
    icon: <Info className="mt-0.5 h-4 w-4 shrink-0" />,
  },
  warning: {
    container: "border-yellow-200 bg-yellow-50 text-yellow-700",
    icon: <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />,
  },
}

export function InlineNotice({
  children,
  variant = "info",
  className,
}: InlineNoticeProps) {
  const config = variantStyles[variant]

  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-4 py-3 text-sm", config.container, className)}>
      {config.icon}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
