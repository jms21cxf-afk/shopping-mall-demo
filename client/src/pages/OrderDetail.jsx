import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import CheckoutProgress from '@/components/CheckoutProgress'
import PageLanguageBar from '@/components/PageLanguageBar'
import { getOrder } from '@/api/client'
import { useLanguage } from '@/i18n/LanguageContext'
import { getOrderStatusLabel, getPaymentMethodLabel } from '@/i18n/orderI18n'
import { getStoredUser, isLoggedIn } from '@/utils/auth'
import './OrderDetail.css'
import '@/components/CheckoutProgress.css'

function OrderDetail() {
  const { id } = useParams()
  const location = useLocation()
  const user = getStoredUser()
  const { t, formatPrice, locale } = useLanguage()
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
        setError(fetchError.message || t('orderDetailLoadError'))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [id, t])

  if (!user || !isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleString(locale)
  }

  return (
    <>
      <PageLanguageBar />
      <main className="order-detail-page">
        <div className="order-detail-card">
          <header className="order-detail-header">
            <h1>{t('orderDetailTitle')}</h1>
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
                  <p className="order-detail-success-title">{t('orderDetailSuccessTitle')}</p>
                  <p className="order-detail-success-subtitle">{t('orderDetailSuccessSubtitle')}</p>
                </div>
              </>
            )}
          </header>

          {isLoading && <p className="order-detail-status">{t('orderDetailLoading')}</p>}
          {error && <p className="order-detail-error">{error}</p>}

          {!isLoading && !error && order && (
            <>
              <section className="order-detail-section">
                <h2>{t('orderDetailInfo')}</h2>
                <dl className="order-detail-meta">
                  <div>
                    <dt>{t('orderDetailNumber')}</dt>
                    <dd>{order.orderNumber}</dd>
                  </div>
                  <div>
                    <dt>{t('orderDetailDate')}</dt>
                    <dd>{formatDate(order.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>{t('orderDetailStatus')}</dt>
                    <dd>{getOrderStatusLabel(order.status, t)}</dd>
                  </div>
                  <div>
                    <dt>{t('orderDetailPayment')}</dt>
                    <dd>{getPaymentMethodLabel(order.payment?.method, t)}</dd>
                  </div>
                </dl>
              </section>

              <section className="order-detail-section">
                <h2>{t('orderDetailShipping')}</h2>
                <p className="order-detail-address">
                  {order.shippingAddress.recipientName} / {order.shippingAddress.phone}
                  <br />
                  [{order.shippingAddress.postalCode || '-'}] {order.shippingAddress.address1}
                  {order.shippingAddress.address2 ? ` ${order.shippingAddress.address2}` : ''}
                  {order.shippingAddress.deliveryMemo && (
                    <>
                      <br />
                      {t('orderDetailMemo')}: {order.shippingAddress.deliveryMemo}
                    </>
                  )}
                </p>
              </section>

              <section className="order-detail-section">
                <h2>{t('orderDetailItems')}</h2>
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
                  <span>{t('orderDetailItemsAmount')}</span>
                  <strong>{formatPrice(order.itemsTotal)}</strong>
                </div>
                <div className="order-detail-summary-row">
                  <span>{t('orderDetailShippingFee')}</span>
                  <strong>{order.shippingFee === 0 ? t('free') : formatPrice(order.shippingFee)}</strong>
                </div>
                <div className="order-detail-summary-row order-detail-summary-total">
                  <span>{t('orderDetailTotal')}</span>
                  <strong>{formatPrice(order.totalAmount)}</strong>
                </div>
              </section>
            </>
          )}

          <div className="order-detail-footer">
            <Link to="/orders" className="order-detail-footer-button">
              {t('orderDetailViewOrders')}
            </Link>
            <Link to="/" className="order-detail-footer-button">
              {t('orderDetailContinueShopping')}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default OrderDetail
