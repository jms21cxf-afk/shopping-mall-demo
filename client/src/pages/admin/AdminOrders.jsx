import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getAdminOrders, updateAdminOrderStatus } from '@/api/client'
import { getStoredUser } from '@/utils/auth'
import {
  ADMIN_ORDER_FILTERS,
  ADMIN_ORDER_PROGRESS_STEPS,
  ADMIN_ORDER_STATUS_OPTIONS,
  formatPrice,
  getAdminFilterIdForStatus,
  getAdminOrderFilterCounts,
  getAdminOrderProgressIndex,
  getAdminOrderStatusMeta,
  matchesAdminOrderFilter,
  normalizeAdminOrderStatus,
} from '@/utils/order'
import './AdminOrders.css'

function formatOrderDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatAddress(shippingAddress) {
  if (!shippingAddress) return '-'
  const postal = shippingAddress.postalCode ? `[${shippingAddress.postalCode}] ` : ''
  const line2 = shippingAddress.address2 ? ` ${shippingAddress.address2}` : ''
  return `${postal}${shippingAddress.address1 || ''}${line2}`.trim() || '-'
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-orders-search-icon">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-orders-filter-icon">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-orders-eye-icon">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-orders-back-icon">
      <path d="M15 6 9 12l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function OrderProgressTracker({ status }) {
  const currentIndex = getAdminOrderProgressIndex(status)

  if (status === 'cancelled') {
    return <p className="admin-orders-cancelled-note">취소된 주문입니다.</p>
  }

  return (
    <ol className="admin-orders-progress" aria-label="주문 진행 단계">
      {ADMIN_ORDER_PROGRESS_STEPS.map((step, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <li
            key={step.key}
            className={`admin-orders-progress-step${isComplete ? ' is-complete' : ''}${isCurrent ? ' is-current' : ''}`}
          >
            <span className="admin-orders-progress-dot" aria-hidden="true" />
            <span className="admin-orders-progress-label">{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function AdminOrders() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [orders, setOrders] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (user?.userType !== 'admin') {
      setIsLoading(false)
      return
    }

    getAdminOrders()
      .then((data) => {
        setOrders(data)
      })
      .catch((fetchError) => {
        setError(fetchError.message || '주문 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [user?.userType])

  const searchableOrders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    if (!keyword) return orders

    return orders.filter((order) => {
      const customerName = order.user?.name?.toLowerCase() || ''
      const orderNumber = order.orderNumber?.toLowerCase() || ''
      return customerName.includes(keyword) || orderNumber.includes(keyword)
    })
  }, [orders, searchQuery])

  const filterCounts = useMemo(() => getAdminOrderFilterCounts(searchableOrders), [searchableOrders])

  const filteredOrders = useMemo(
    () => searchableOrders.filter((order) => matchesAdminOrderFilter(order, activeFilter)),
    [searchableOrders, activeFilter],
  )

  const handleStatusChange = async (orderId, nextStatus, currentStatus) => {
    if (nextStatus === currentStatus) return

    if (nextStatus === 'cancelled' && !window.confirm('이 주문을 취소하시겠습니까?')) {
      return
    }

    setUpdatingId(orderId)
    setError('')

    try {
      const result = await updateAdminOrderStatus(orderId, nextStatus)
      setOrders((prev) =>
        prev.map((order) => (String(order._id) === String(orderId) ? result.order : order)),
      )
      setActiveFilter(getAdminFilterIdForStatus(result.order.status))
    } catch (updateError) {
      setError(updateError.message || '주문 상태 변경에 실패했습니다.')
    } finally {
      setUpdatingId(null)
    }
  }

  const resetFilters = () => {
    setSearchQuery('')
    setActiveFilter('all')
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.userType !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="admin-orders-page">
      <header className="admin-orders-topbar">
        <button
          type="button"
          className="admin-orders-back"
          onClick={() => navigate('/admin')}
          aria-label="관리자 대시보드로 돌아가기"
        >
          <BackIcon />
        </button>
        <h1>주문 관리</h1>
      </header>

      <main className="admin-orders-main">
        <div className="admin-orders-toolbar">
          <label className="admin-orders-search">
            <SearchIcon />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="주문번호 또는 고객명으로 검색..."
            />
          </label>
          <button type="button" className="admin-orders-filter-button" onClick={resetFilters}>
            <FilterIcon />
            필터
          </button>
        </div>

        <div className="admin-orders-filters" role="tablist" aria-label="주문 상태 필터">
          {ADMIN_ORDER_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter.id}
              className={`admin-orders-filter-tab${activeFilter === filter.id ? ' admin-orders-filter-tab--active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
              <span className="admin-orders-filter-count">{filterCounts[filter.id]}</span>
            </button>
          ))}
        </div>

        {isLoading && <p className="admin-orders-message">불러오는 중...</p>}
        {error && <p className="admin-orders-error">{error}</p>}

        {!isLoading && !error && filteredOrders.length === 0 && (
          <p className="admin-orders-message">표시할 주문이 없습니다.</p>
        )}

        {!isLoading && filteredOrders.length > 0 && (
          <ul className="admin-orders-list">
            {filteredOrders.map((order) => {
              const displayStatus = getAdminOrderStatusMeta(order.status)
              const customerName = order.user?.name || order.shippingAddress?.recipientName || '고객'
              const selectValue = normalizeAdminOrderStatus(order.status)
              const isUpdating = updatingId === order._id

              return (
                <li key={order._id} className="admin-orders-card">
                  <div className="admin-orders-card-header">
                    <div className="admin-orders-card-meta">
                      <div>
                        <strong>{order.orderNumber}</strong>
                        <span>
                          {customerName}
                          {order.user?.email ? ` · ${order.user.email}` : ''}
                        </span>
                        <span>{formatOrderDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="admin-orders-card-summary">
                      <span
                        className={`admin-orders-status-badge admin-orders-status-badge--${displayStatus.tone}`}
                      >
                        {displayStatus.label}
                      </span>
                    </div>
                  </div>

                  <div className="admin-orders-card-body">
                    <div className="admin-orders-info-block">
                      <h3>주문 상품</h3>
                      <ul className="admin-orders-product-list">
                        {order.items.map((item) => (
                          <li key={item._id} className="admin-orders-product-item">
                            <img src={item.image} alt={item.name} />
                            <div>
                              <strong>{item.name}</strong>
                              <span>
                                {formatPrice(item.price)} × {item.quantity}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="admin-orders-info-block">
                      <h3>배송 주소</h3>
                      <p>{order.shippingAddress.recipientName}</p>
                      <p>{formatAddress(order.shippingAddress)}</p>
                      <p>{order.shippingAddress.phone || order.user?.phone || '-'}</p>
                    </div>
                  </div>

                  <div className="admin-orders-card-status">
                    <OrderProgressTracker status={order.status} />

                    <div className="admin-orders-status-row">
                      <label className="admin-orders-status-control">
                        <span className="admin-orders-status-control-label">주문확인</span>
                        <select
                          key={`${order._id}-${order.status}`}
                          className="admin-orders-status-select"
                          value={selectValue}
                          disabled={isUpdating}
                          onChange={(event) =>
                            handleStatusChange(order._id, event.target.value, selectValue)
                          }
                        >
                          {ADMIN_ORDER_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <strong className="admin-orders-footer-price">
                        {formatPrice(order.totalAmount)}
                      </strong>

                      <Link to={`/orders/${order._id}`} className="admin-orders-detail-button">
                        <EyeIcon />
                        상세보기
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

export default AdminOrders
