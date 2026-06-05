import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Smart Learnly` : 'Smart Learnly'
  }, [title])
}
