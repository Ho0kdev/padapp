"use client"

import * as React from "react"
import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success" | "info" | "warning"
  action?: React.ReactNode
}

export function useToast() {
  const toast = React.useCallback((props: ToastProps | string) => {
    // Si se pasa un string directamente, mostrarlo como mensaje simple
    if (typeof props === "string") {
      sonnerToast(props)
      return
    }

    const { title, description, variant = "default", action } = props

    const message = title || description || ""
    const options = {
      description: title && description ? description : undefined,
      action,
    }

    switch (variant) {
      case "destructive":
        sonnerToast.error(message, options)
        break
      case "success":
        sonnerToast.success(message, options)
        break
      case "info":
        sonnerToast.info(message, options)
        break
      case "warning":
        sonnerToast.warning(message, options)
        break
      default:
        sonnerToast(message, options)
    }
  }, [])

  // Métodos de conveniencia
  const success = React.useCallback((message: string, options?: { description?: string; action?: React.ReactNode }) => {
    sonnerToast.success(message, options)
  }, [])

  const error = React.useCallback((message: string, options?: { description?: string; action?: React.ReactNode }) => {
    sonnerToast.error(message, options)
  }, [])

  const info = React.useCallback((message: string, options?: { description?: string; action?: React.ReactNode }) => {
    sonnerToast.info(message, options)
  }, [])

  const warning = React.useCallback((message: string, options?: { description?: string; action?: React.ReactNode }) => {
    sonnerToast.warning(message, options)
  }, [])

  return {
    toast,
    success,
    error,
    info,
    warning
  }
}