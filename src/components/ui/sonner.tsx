"use client"

import { Toaster as SonnerToaster } from "sonner"
import { useTheme } from "@/contexts/theme.context"

export function Toaster() {
  const { resolvedTheme } = useTheme()
  return (
    <SonnerToaster
      theme={resolvedTheme as "light" | "dark"}
      position="bottom-right"
      richColors
      closeButton
    />
  )
}
