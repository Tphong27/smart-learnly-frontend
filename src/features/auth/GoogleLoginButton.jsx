import { useEffect, useRef } from 'react'

const GOOGLE_SCRIPT_ID = 'google-identity-services'

export function GoogleLoginButton({ onCredential, onError }) {
  const containerRef = useRef(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return undefined
    const renderButton = () => {
      if (!window.google || !containerRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => onCredential(credential),
      })
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline', size: 'large', width: containerRef.current.clientWidth, text: 'continue_with',
      })
    }
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID)
    if (existingScript) { renderButton(); return undefined }
    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = renderButton
    script.onerror = () => onError('Không thể tải Google Identity Services.')
    document.head.appendChild(script)
    return undefined
  }, [clientId, onCredential, onError])

  if (!clientId) return null
  return <div className="google-login-button" ref={containerRef} />
}
