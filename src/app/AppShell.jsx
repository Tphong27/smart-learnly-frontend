import { PublicLayout } from './layouts/PublicLayout'
import { HomePage } from '../features/home/HomePage'

export function AppShell() {
  return (
    <PublicLayout>
      <HomePage />
    </PublicLayout>
  )
}
