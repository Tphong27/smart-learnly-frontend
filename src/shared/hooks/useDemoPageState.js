import { useEffect, useState } from 'react'

export function useDemoPageState() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const timerId = window.setTimeout(() => setLoading(false), 180)

    return () => window.clearTimeout(timerId)
  }, [])

  return {
    loading,
    error,
    setError,
  }
}
