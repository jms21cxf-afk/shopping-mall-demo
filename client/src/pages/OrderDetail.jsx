import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import CheckoutProgress from '@/components/CheckoutProgress'
import { getOrder } from '@/api/client'
import { getStoredUser, isLoggedIn } from '@/utils/auth'
import {
  formatPrice,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/utils/order'
import './OrderDetail.css'
import '@/components/CheckoutProgress.css'

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function OrderDetail() {
  const { id } = useParams()
  const location = useLocation()
  const user = getStoredUser()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const showSuccess = location.state?.orderSuccess

  useEffect(() => {
    if (!isLoggedIn()) {
      setIsLoading(false)
      return
    }

    getOrder(id)
      .then((data) => {
        setOrder(data)
      })
      .catch((fetchError) => {
        setError(fetchError.message || '주문 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [id])

  if (!user || !isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="order-detail-page">
      <div className="order-detail-card">
        <header className="order-detail-header">
          <h1>주문 상세</h1>
          {showSuccess && (
            <>
              <CheckoutProgress currentStep={3} />
              <div className="order-detail-success-hero">
                <div className="order-detail-success-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12.5 9.5 17 19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="order-detail-success-title">주문이 성공적으로 완료되었습니다!</p>
                <p className="order-detail-success-subtitle">주문해 주셔서 감사합니다.</p>
              </div>
            </>
          )}
        </header>

        {isLoading && <p className="order-detail-status">불러오는 중...</p>}
        {error && <p className="order-detail-error">{error}</p>}

        {!isLoading && !error && order && (
          <>
            <section className="order-detail-section">
              <h2>주문 정보</h2>
              <dl className="order-detail-meta">
                <div>
                  <dt>주문번호</dt>
                  <dd>{order.orderNumber}</dd>
                </div>
                <div>
                  <dt>주문일시</dt>
                  <dd>{formatDate(order.createdAt)}</dd>
                </div>
                <div>
                  <dt>주문 상태</dt>
                  <dd>{ORDER_STATUS_LABELS[order.status] || order.status}</dd>
                </div>
                <div>
                  <dt>결제 수단</dt>
                  <dd>{PAYMENT_METHOD_LABELS[order.payment?.method] || order.payment?.method}</dd>
                </div>
              </dl>
            </section>

            <section className="order-detail-section">
              <h2>배송지</h2>
              <p className="order-detail-address">
                {order.shippingAddress.recipientName} / {order.shippingAddress.phone}
                <br />
                [{order.shippingAddress.postalCode || '-'}] {order.shippingAddress.address1}
                {order.shippingAddress.address2 ? ` ${order.shippingAddress.address2}` : ''}
                {order.shippingAddress.deliveryMemo && (
                  <>
                    <br />
                    메모: {order.shippingAddress.deliveryMemo}
                  </>
                )}
              </p>
            </section>

            <section className="order-detail-section">
              <h2>주문 상품</h2>
              <ul className="order-detail-item-list">
                {order.items.map((item) => (
                  <li key={item._id} className="order-detail-item">
                    <img src={item.image} alt={item.name} />
                    <div>
                      <Link to={`/products/${item.product}`} className="order-detail-item-name">
                        {item.name}
                      </Link>
                      <p>
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <strong>{formatPrice(item.lineTotal)}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className="order-detail-section order-detail-summary">
              <div className="order-detail-summary-row">
                <span>상품 금액</span>
                <strong>{formatPrice(order.itemsTotal)}</strong>
              </div>
              <div className="order-detail-summary-row">
                <span>배송비</span>
                <strong>{order.shippingFee === 0 ? '무료' : formatPrice(order.shippingFee)}</strong>
              </div>
              <div className="order-detail-summary-row order-detail-summary-total">
                <span>총 결제 금액</span>
                <strong>{formatPrice(order.totalAmount)}</strong>
              </div>
            </section>
          </>
        )}

        <div className="order-detail-footer">
          <Link to="/orders" className="order-detail-footer-button">
            주문 내역 보기
          </Link>
          <Link to="/" className="order-detail-footer-button">
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    </main>
  )
}

export default OrderDetail
