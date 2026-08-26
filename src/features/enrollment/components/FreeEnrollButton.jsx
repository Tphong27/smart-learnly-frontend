import { useNavigate } from 'react-router-dom'
import { Button, useToast } from '@/shared/components/ui'
import { getAccessToken } from '@/services'

/** Self-study free enroll đã tắt — hướng học viên sang opening class. */
export function FreeEnrollButton({
  label = 'View opening classes',
  redirectTo = '/learning/opening-schedule',
  size = 'md',
}) {
  const navigate = useNavigate()
  const toast = useToast()

  function handleClick() {
    if (!getAccessToken()) {
      toast.info('Please sign in to register for an opening class.')
      navigate('/login', {
        state: { from: redirectTo || '/learning/opening-schedule' },
      })
      return
    }

    toast.info('Please register via an opening class for this course.')
    navigate(redirectTo || '/learning/opening-schedule')
  }

  return (
    <Button type="button" onClick={handleClick} size={size}>
      {label}
    </Button>
  )
}
