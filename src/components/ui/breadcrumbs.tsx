// src/components/ui/breadcrumbs.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Home, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  showBackButton?: boolean
}

export function Breadcrumbs({ items, className, showBackButton = true }: BreadcrumbsProps) {
  const router = useRouter()

  return (
    <div className={cn("flex items-center gap-2 mb-4", className)}>
      {/* Back button for mobile */}
      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="lg:hidden p-2 h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto flex-1 min-w-0" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
          {/* Home link */}
          <li className="flex items-center">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Dashboard"
            >
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </li>

          {/* Breadcrumb items */}
          {items.map((item, index) => {
            const isLast = index === items.length - 1

            return (
              <li key={index} className="flex items-center gap-1 sm:gap-2 min-w-0">
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-[200px]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-[250px]">
                    {item.label}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
