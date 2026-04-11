import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
  badge?: ReactNode
}

type SegmentedControlProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn("inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm", className)}>
      {options.map((option) => {
        const active = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-blue-700 text-white shadow-sm hover:bg-blue-800"
                : "text-gray-500 hover:bg-blue-50 hover:text-blue-800"
            )}
          >
            {option.icon}
            <span>{option.label}</span>
            {option.badge}
          </button>
        )
      })}
    </div>
  )
}
