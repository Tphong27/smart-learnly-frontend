import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'

export function EmptyCartState() {
  return (
    <div className="admin-empty cart-empty">
      <ShoppingCart size={36} />
      <h2>Your cart is empty</h2>
      <p>Add a paid course or class before checkout.</p>

      <Link to="/" className="button button--primary">
        Browse courses
      </Link>
    </div>
  )
}