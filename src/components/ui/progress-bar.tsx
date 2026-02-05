import { useEffect, useState } from "react"

export function TopProgressBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!loading) {
      setProgress(100)
      const timeout = setTimeout(() => setProgress(0), 500) // hide after reaching 100
      return () => clearTimeout(timeout)
    }

    // Start incrementally progressing
    setProgress(0)
    let current = 0
    const interval = setInterval(() => {
      current += Math.random() * 10
      if (current < 90) {
        setProgress(current)
      } else {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [loading])

  return (
    <div
      className="fixed top-0 left-0 h-[5px] bg-brand transition-all duration-200 z-50"
      style={{ width: `${progress}%`, opacity: progress === 0 ? 0 : 1 }}
    />
  )
}
