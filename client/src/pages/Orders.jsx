import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import PageLanguageBar from '@/components/PageLanguageBar'
import { getMyOrders } from '@/api/client'
import { useLanguage } from '@/i18n/LanguageContext'
import { getDisplayOrderStatus, getOrderFilters } from '@/i18n/orderI18n'
import { getStoredUser, isLoggedIn } from '@/utils/auth'
import { getOrderFilterCounts, matchesOrderFilter } from '@/utils/order'
import './Orders.css'

function formatOrderDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="orders-clock-icon">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function Orders() {
  const user = getStoredUser()
  const { t, formatPrice } = useLanguage()
  const [orders, setOrders] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const orderFilters = useMemo(() => getOrderFilters(t), [t])

  useEffect(() => {
    if (!isLoggedIn()) {
      setIsLoading(false)
      return
    }

    getMyOrders()
      .then((data) => {
        setOrders(data)
      })
      .catch((fetchError) => {
        setError(fetchError.message || t('ordersLoadError'))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [t])

  const filterCounts = useMemo(() => getOrderFilterCounts(orders), [orders])
  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order, activeFilter)),
    [orders, activeFilter],
  )

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <PageLanguageBar />
      <main className="orders-page">
        <div className="orders-container">
          <header className="orders-header">
            <h1>{t('ordersTitle')}</h1>
            {user?.name && <p className="orders-header-user">{t('ordersSubtitle', { name: user.name })}</p>}
          </header>

          <div className="orders-filters" role="tablist" aria-label={t('ordersTitle')}>
            {orderFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={activeFilter === filter.id}
                className={`orders-filter${activeFilter === filter.id ? ' orders-filter--active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
                <span className="orders-filter-count">{filterCounts[filter.id]}</span>
              </button>
            ))}
          </div>

          {isLoading && <p className="orders-message">{t('ordersLoading')}</p>}
          {error && <p className="orders-error">{error}</p>}

          {!isLoading && !error && filteredOrders.length === 0 && (
            <p className="orders-message">{t('ordersEmpty')}</p>
          )}

          {!isLoading && !error && filteredOrders.length > 0 && (
            <ul className="orders-list">
              {filteredOrders.map((order) => {
                const displayStatus = getDisplayOrderStatus(order.status, t)

                return (
                  <li key={order._id} className="orders-card">
                    <Link to={`/orders/${order._id}`} className="orders-card-link">
                      <div className="orders-card-header">
                        <div className="orders-card-meta">
                          <ClockIcon />
                          <div>
                            <strong className="orders-card-number">
                              {t('ordersOrderNumber', { number: order.orderNumber })}
                            </strong>
                            <span className="orders-card-date">
                              {t('ordersOrderDate', { date: formatOrderDate(order.createdAt) })}
                            </span>
                          </div>
                        </div>
                        <div className="orders-card-summary">
                          <span className={`orders-status-badge orders-status-badge--${displayStatus.tone}`}>
                            {displayStatus.label}
                          </span>
                          <strong className="orders-card-total">{formatPrice(order.totalAmount)}</strong>
                        </div>
                      </div>

                      <ul className="orders-card-items">
                        {order.items.map((item) => (
                          <li key={item._id} className="orders-product">
                            <img src={item.image} alt={item.name} className="orders-product-image" />
                            <div className="orders-product-info">
                              <strong className="orders-product-name">{item.name}</strong>
                              <span className="orders-product-meta">
                                {t('ordersQuantity', { quantity: item.quantity })}
                              </span>
                            </div>
                            <strong className="orders-product-price">{formatPrice(item.lineTotal)}</strong>
                          </li>
                        ))}
                      </ul>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="orders-footer">
            <Link to="/">{t('ordersContinueShopping')}</Link>
          </p>
        </div>
      </main>
    </>
  )
}

export default Orders
