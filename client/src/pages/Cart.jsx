import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import PageLanguageBar from '@/components/PageLanguageBar'
import { clearCart, getCart, removeCartItem, updateCartItem } from '@/api/client'
import { useLanguage } from '@/i18n/LanguageContext'
import { getStoredUser, isLoggedIn } from '@/utils/auth'
import './Cart.css'

function Cart() {
  const navigate = useNavigate()
  const { t, formatPrice } = useLanguage()
  const user = getStoredUser()
  const [cart, setCart] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingItemId, setUpdatingItemId] = useState(null)

  const loadCart = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getCart()
      setCart(data)
    } catch (fetchError) {
      setError(fetchError.message || t('cartLoadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!isLoggedIn()) {
      setIsLoading(false)
      return
    }

    loadCart()
  }, [loadCart])

  const handleQuantityChange = async (itemId, nextQuantity) => {
    if (nextQuantity < 1) return

    setUpdatingItemId(itemId)
    setError('')

    try {
      const data = await updateCartItem(itemId, nextQuantity)
      setCart(data)
    } catch (updateError) {
      setError(updateError.message || t('cartUpdateFailed'))
    } finally {
      setUpdatingItemId(null)
    }
  }

  const handleRemove = async (itemId) => {
    setUpdatingItemId(itemId)
    setError('')

    try {
      const data = await removeCartItem(itemId)
      setCart(data.cart)
    } catch (removeError) {
      setError(removeError.message || t('cartRemoveFailed'))
    } finally {
      setUpdatingItemId(null)
    }
  }

  const handleClearCart = async () => {
    const confirmed = window.confirm(t('cartClearConfirm'))
    if (!confirmed) return

    setError('')

    try {
      const data = await clearCart()
      setCart(data.cart)
    } catch (clearError) {
      setError(clearError.message || t('cartClearFailed'))
    }
  }

  if (!user || !isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  const items = cart?.items || []
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0,
  )

  return (
    <>
      <PageLanguageBar />
      <main className="cart-page">
        <div className="cart-card">
          <header className="cart-header">
            <h1>{t('cartTitle')}</h1>
            <p>{t('cartSubtitle', { name: user.name })}</p>
          </header>

          {isLoading && <p className="cart-status">{t('loading')}</p>}
          {error && <p className="cart-error">{error}</p>}

          {!isLoading && !error && items.length === 0 && (
            <p className="cart-status">{t('cartEmpty')}</p>
          )}

          {!isLoading && !error && items.length > 0 && (
            <>
              <ul className="cart-list">
                {items.map((item) => (
                  <li key={item._id} className="cart-item">
                    <Link to={`/products/${item.product._id}`} className="cart-item-image-link">
                      <img src={item.product.image} alt={item.product.name} />
                    </Link>
                    <div className="cart-item-info">
                      <Link to={`/products/${item.product._id}`} className="cart-item-name">
                        {item.product.name}
                      </Link>
                      <p className="cart-item-price">{formatPrice(item.product.price)}</p>
                      <div className="cart-item-actions">
                        <div className="cart-quantity-control">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                            disabled={updatingItemId === item._id || item.quantity <= 1}
                            aria-label={t('cartQuantityDecrease')}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                            disabled={updatingItemId === item._id}
                            aria-label={t('cartQuantityIncrease')}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="cart-remove-button"
                          onClick={() => handleRemove(item._id)}
                          disabled={updatingItemId === item._id}
                        >
                          {t('cartRemove')}
                        </button>
                      </div>
                    </div>
                    <strong className="cart-item-total">
                      {formatPrice(item.product.price * item.quantity)}
                    </strong>
                  </li>
                ))}
              </ul>

              <div className="cart-summary">
                <div className="cart-summary-row">
                  <span>{t('cartTotalQuantity')}</span>
                  <strong>
                    {totalQuantity}
                    {t('unitPiece')}
                  </strong>
                </div>
                <div className="cart-summary-row cart-summary-total">
                  <span>{t('cartTotalPrice')}</span>
                  <strong>{formatPrice(totalPrice)}</strong>
                </div>
                <button
                  type="button"
                  className="cart-checkout-button"
                  onClick={() => navigate('/checkout')}
                >
                  {t('cartCheckout')}
                </button>
                <button type="button" className="cart-clear-button" onClick={handleClearCart}>
                  {t('cartClear')}
                </button>
              </div>
            </>
          )}

          <div className="cart-footer">
            <Link to="/orders" className="cart-footer-button">
              {t('cartOrdersLink')}
            </Link>
            <Link to="/" className="cart-footer-button">
              {t('cartContinueShopping')}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default Cart
