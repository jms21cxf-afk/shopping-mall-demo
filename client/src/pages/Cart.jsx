import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { clearCart, getCart, removeCartItem, updateCartItem } from '@/api/client'
import { getStoredUser, isLoggedIn } from '@/utils/auth'
import './Cart.css'

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`
}

function Cart() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [cart, setCart] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingItemId, setUpdatingItemId] = useState(null) // 수량 변경/삭제 중인 항목 id

  // 서버에서 현재 사용자의 장바구니 데이터를 불러옵니다.
  const loadCart = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getCart()
      setCart(data)
    } catch (fetchError) {
      setError(fetchError.message || '장바구니를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 페이지 진입 시 장바구니 목록을 한 번 불러옵니다.
  useEffect(() => {
    if (!isLoggedIn()) {
      setIsLoading(false)
      return
    }

    loadCart()
  }, [loadCart])

  // 수량 +/- 버튼: API로 수량을 변경하고 화면 상태를 갱신합니다.
  const handleQuantityChange = async (itemId, nextQuantity) => {
    if (nextQuantity < 1) return

    setUpdatingItemId(itemId)
    setError('')

    try {
      const data = await updateCartItem(itemId, nextQuantity)
      setCart(data)
    } catch (updateError) {
      setError(updateError.message || '수량 변경에 실패했습니다.')
    } finally {
      setUpdatingItemId(null)
    }
  }

  // 개별 상품을 장바구니에서 제거합니다.
  const handleRemove = async (itemId) => {
    setUpdatingItemId(itemId)
    setError('')

    try {
      const data = await removeCartItem(itemId)
      setCart(data.cart)
    } catch (removeError) {
      setError(removeError.message || '상품 삭제에 실패했습니다.')
    } finally {
      setUpdatingItemId(null)
    }
  }

  // 장바구니 전체를 비웁니다.
  const handleClearCart = async () => {
    const confirmed = window.confirm('장바구니를 비우시겠습니까?')
    if (!confirmed) return

    setError('')

    try {
      const data = await clearCart()
      setCart(data.cart)
    } catch (clearError) {
      setError(clearError.message || '장바구니 비우기에 실패했습니다.')
    }
  }

  // 로그인하지 않은 사용자는 장바구니 페이지 접근 불가
  if (!user || !isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  const items = cart?.items || []
  // 하단 요약 영역에 표시할 총 수량·총 금액 계산
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0,
  )

  return (
    <main className="cart-page">
      <div className="cart-card">
        <header className="cart-header">
          <h1>장바구니</h1>
          <p>{user.name}님의 장바구니입니다.</p>
        </header>

        {isLoading && <p className="cart-status">불러오는 중...</p>}
        {error && <p className="cart-error">{error}</p>}

        {!isLoading && !error && items.length === 0 && (
          <p className="cart-status">장바구니에 담긴 상품이 없습니다.</p>
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
                          aria-label="수량 감소"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                          disabled={updatingItemId === item._id}
                          aria-label="수량 증가"
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
                        삭제
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
                <span>총 수량</span>
                <strong>{totalQuantity}개</strong>
              </div>
              <div className="cart-summary-row cart-summary-total">
                <span>총 상품금액</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>
              <button
                type="button"
                className="cart-checkout-button"
                onClick={() => navigate('/checkout')}
              >
                주문하기
              </button>
              <button type="button" className="cart-clear-button" onClick={handleClearCart}>
                장바구니 비우기
              </button>
            </div>
          </>
        )}

        <div className="cart-footer">
          <Link to="/orders" className="cart-footer-button">
            주문 내역
          </Link>
          <Link to="/" className="cart-footer-button">
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    </main>
  )
}

export default Cart
