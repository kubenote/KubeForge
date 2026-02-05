"use client"

import { Toaster as SonnerToaster } from "sonner"
import { useTheme } from "@/contexts/ThemeContext"

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
