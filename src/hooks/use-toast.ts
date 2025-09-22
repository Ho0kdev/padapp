"use client"

import * as React from "react"
import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  action?: React.ReactNode
}

export function useToast() {
  const toast = React.useCallback((props: ToastProps) => {
    const { title, description, variant = "default", action } = props

    if (variant === "destructive") {
      sonnerToast.error(title || "Error", {
        description,
        action,
      })
    } else {
      sonnerToast.success(title || "Éxito", {
        description,
        action,
      })
    }
  }, [])

  return { toast }
}