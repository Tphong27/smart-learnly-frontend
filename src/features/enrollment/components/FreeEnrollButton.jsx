import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, useToast } from '@/shared/components/ui'
import { enrollmentService, getAccessToken } from '@/services'

export function FreeEnrollButton({ courseId, label = 'Enroll for free', onEnrolled, redirectTo = '/learning/courses', size = 'md' }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  async function handleEnroll() {
    if (!getAccessToken()) {
      toast.info('Please sign in to enroll in this course.')
      navigate('/login')
      return
    }
    if (!courseId) {
      toast.error('Course is not available right now.')
      return
    }

    setLoading(true)
    try {
      const result = await enrollmentService.enrollFree(courseId)
      if (result?.alreadyEnrolled) {
        toast.info('You already have access to this course.')
      } else if (result?.reactivated) {
        toast.success('Welcome back. Access has been restored.')
      } else {
        toast.success('Enrollment successful. Happy learning.')
      }
      onEnrolled?.(result)
      if (redirectTo) navigate(redirectTo)
    } catch (err) {
      toast.error(err?.message || 'Could not enroll in this course.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button type="button" onClick={handleEnroll} loading={loading} size={size}>
      {label}
    </Button>
  )
}
