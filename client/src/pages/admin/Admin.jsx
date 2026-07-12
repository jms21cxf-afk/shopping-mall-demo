import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getAdminOrders, getProducts, getUsers } from '@/api/client'
import { getStoredUser } from '@/utils/auth'
import { formatPrice } from '@/utils/order'
import './Admin.css'

const RECENT_ORDER_LIMIT = 3

function formatCount(value) {
  return Number(value).toLocaleString('ko-KR')
}

function isSameMonth(dateValue, year, month) {
  const date = new Date(dateValue)
  return date.getFullYear() === year && date.getMonth() === month
}

function getMonthInfo(monthOffset = 0) {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
  return { year: target.getFullYear(), month: target.getMonth() }
}

function countByMonth(items, getDate, monthOffset) {
  const { year, month } = getMonthInfo(monthOffset)
  return items.filter((item) => isSameMonth(getDate(item), year, month)).length
}

function sumByMonth(items, getDate, getAmount, monthOffset) {
  const { year, month } = getMonthInfo(monthOffset)
  return items
    .filter((item) => isSameMonth(getDate(item), year, month))
    .reduce((sum, item) => sum + getAmount(item), 0)
}

function formatMonthChange(current, previous) {
  if (previous === 0) {
    if (current === 0) return '지난달 대비 0%'
    return '지난달 대비 +100%'
  }

  const rate = Math.round(((current - previous) / previous) * 100)
  const sign = rate > 0 ? '+' : ''
  return `지난달 대비 ${sign}${rate}%`
}

function buildDashboardStats(orders, products, users) {
  const customers = users.filter((entry) => entry.userType === 'customer')
  const revenueOrders = orders.filter((order) => order.status !== 'cancelled')
  const totalRevenue = revenueOrders.reduce((sum, order) => sum + order.totalAmount, 0)

  const ordersThisMonth = countByMonth(orders, (order) => order.createdAt, 0)
  const ordersLastMonth = countByMonth(orders, (order) => order.createdAt, 1)
  const productsThisMonth = countByMonth(products, (product) => product.createdAt, 0)
  const productsLastMonth = countByMonth(products, (product) => product.createdAt, 1)
  const customersThisMonth = countByMonth(customers, (customer) => customer.createdAt, 0)
  const customersLastMonth = countByMonth(customers, (customer) => customer.createdAt, 1)
  const revenueThisMonth = sumByMonth(
    revenueOrders,
    (order) => order.createdAt,
    (order) => order.totalAmount,
    0,
  )
  const revenueLastMonth = sumByMonth(
    revenueOrders,
    (order) => order.createdAt,
    (order) => order.totalAmount,
    1,
  )

  return [
    {
      label: '총 주문',
      value: formatCount(orders.length),
      change: formatMonthChange(ordersThisMonth, ordersLastMonth),
      icon: 'cart',
      tone: 'blue',
    },
    {
      label: '총 상품',
      value: formatCount(products.length),
      change: formatMonthChange(productsThisMonth, productsLastMonth),
      icon: 'box',
      tone: 'green',
    },
    {
      label: '총 고객',
      value: formatCount(customers.length),
      change: formatMonthChange(customersThisMonth, customersLastMonth),
      icon: 'users',
      tone: 'purple',
    },
    {
      label: '총 매출',
      value: formatPrice(totalRevenue),
      change: formatMonthChange(revenueThisMonth, revenueLastMonth),
      icon: 'chart',
      tone: 'orange',
    },
  ]
}

function formatOrderDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getRecentOrderStatus(status) {
  if (['pending', 'paid'].includes(status)) {
    return { label: '주문확인', tone: 'pending' }
  }
  if (status === 'preparing') {
    return { label: '상품준비중', tone: 'pending' }
  }
  if (status === 'shipping_started') {
    return { label: '배송시작', tone: 'shipping' }
  }
  if (status === 'shipped') {
    return { label: '배송중', tone: 'shipping' }
  }
  if (status === 'delivered') {
    return { label: '배송완료', tone: 'completed' }
  }
  if (status === 'cancelled') {
    return { label: '주문취소', tone: 'cancelled' }
  }
  return { label: status, tone: 'pending' }
}

const QUICK_ACTIONS = [
  { label: '새 상품 등록', primary: true, to: '/admin/products/new' },
  { label: '주문 관리', to: '/admin/orders' },
  { label: '매출 분석' },
  { label: '고객 관리', to: '/users' },
]

const MANAGEMENT_CARDS = [
  {
    title: '상품 관리',
    description: '상품 등록, 수정, 삭제 및 재고 관리',
    icon: 'box',
    tone: 'blue',
    to: '/admin/products',
  },
  {
    title: '주문 관리',
    description: '주문 조회, 상태 변경 및 배송 관리',
    icon: 'cart',
    tone: 'green',
    to: '/admin/orders',
  },
  {
    title: '고객 관리',
    description: '고객 정보 조회 및 관리',
    icon: 'users',
    tone: 'purple',
    to: '/users',
  },
]

function StatIcon({ type }) {
  if (type === 'cart') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6 6h15l-1.5 9H8L6 3H2" />
      </svg>
    )
  }

  if (type === 'box') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Zm0 2.2 6.5 3.25L12 11.7 5.5 8.45 12 5.2Zm-7 5.3 7 3.5v6.55l-7-3.5V10.5Zm9 10.05v-6.55l7-3.5v6.55l-7 3.5Z" />
      </svg>
    )
  }

  if (type === 'users') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.09.35-2.09.94-2.93A13.2 13.2 0 0 0 8 13Zm8 0c-.34 0-.66.03-1 .08A4.28 4.28 0 0 1 18 17v2h6v-2c0-2.66-5.33-4-8-4Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 18v-2h16v2H4Zm6-4V8h4v6h-4Zm-6-6h16v2H4V8Z" />
    </svg>
  )
}

function Admin() {
  const user = getStoredUser()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [dashboardError, setDashboardError] = useState('')
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)

  useEffect(() => {
    // 대시보드 통계·최근 주문에 필요한 데이터를 한 번에 불러옵니다.
    Promise.all([getAdminOrders(), getProducts(), getUsers()])
      .then(([ordersData, productsData, usersData]) => {
        setOrders(ordersData)
        setProducts(Array.isArray(productsData) ? productsData : productsData.products || [])
        setUsers(usersData)
      })
      .catch((fetchError) => {
        setDashboardError(fetchError.message || '대시보드 데이터를 불러오지 못했습니다.')
      })
      .finally(() => {
        setIsDashboardLoading(false)
      })
  }, [])

  const dashboardStats = useMemo(
    () => buildDashboardStats(orders, products, users),
    [orders, products, users],
  )
  const recentOrders = useMemo(() => orders.slice(0, RECENT_ORDER_LIMIT), [orders])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.userType !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-brand">
          <span className="admin-logo">Shopping Mall Demo</span>
          <span className="admin-badge">ADMIN</span>
        </div>
        <Link to="/" className="admin-back-link">
          쇼핑몰로 돌아가기
        </Link>
      </header>

      <main className="admin-main">
        <section className="admin-intro">
          <h1>관리자 대시보드</h1>
          <p>Shopping Mall Demo 쇼핑몰 관리 시스템에 오신 것을 환영합니다.</p>
        </section>

        <section className="admin-stats">
          {dashboardStats.map((stat) => (
            <article key={stat.label} className={`admin-stat-card admin-stat-card--${stat.tone}`}>
              <div>
                <p className="admin-stat-label">{stat.label}</p>
                <strong className="admin-stat-value">
                  {isDashboardLoading ? '...' : stat.value}
                </strong>
                <p className="admin-stat-change">
                  {isDashboardLoading ? '불러오는 중...' : stat.change}
                </p>
              </div>
              <div className="admin-stat-icon">
                <StatIcon type={stat.icon} />
              </div>
            </article>
          ))}
        </section>

        {dashboardError && <p className="admin-dashboard-error">{dashboardError}</p>}

        <section className="admin-panels">
          <article className="admin-panel">
            <h2>빠른 작업</h2>
            <div className="admin-quick-actions">
              {QUICK_ACTIONS.map((action) =>
                action.to ? (
                  <Link
                    key={action.label}
                    to={action.to}
                    className={
                      action.primary
                        ? 'admin-action-button admin-action-button--primary'
                        : 'admin-action-button admin-action-button--outline'
                    }
                  >
                    {action.primary ? `+ ${action.label}` : action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    className="admin-action-button admin-action-button--outline"
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>
          </article>

          <article className="admin-panel">
            <div className="admin-panel-head">
              <h2>최근 주문</h2>
              <Link to="/admin/orders" className="admin-text-link">
                전체보기
              </Link>
            </div>
            <div className="admin-order-list">
              {isDashboardLoading && <p className="admin-order-status">불러오는 중...</p>}
              {!isDashboardLoading && !dashboardError && recentOrders.length === 0 && (
                <p className="admin-order-status">최근 주문이 없습니다.</p>
              )}
              {!isDashboardLoading &&
                !dashboardError &&
                recentOrders.map((order) => {
                  const displayStatus = getRecentOrderStatus(order.status)
                  const customerName =
                    order.user?.name || order.shippingAddress?.recipientName || '고객'

                  return (
                    <Link key={order._id} to={`/orders/${order._id}`} className="admin-order-item">
                      <div>
                        <strong>{order.orderNumber}</strong>
                        <p>{customerName}</p>
                        <span>{formatOrderDate(order.createdAt)}</span>
                      </div>
                      <div className="admin-order-meta">
                        <span className={`admin-status admin-status--${displayStatus.tone}`}>
                          {displayStatus.label}
                        </span>
                        <strong>{formatPrice(order.totalAmount)}</strong>
                      </div>
                    </Link>
                  )
                })}
            </div>
          </article>
        </section>

        <section className="admin-management-grid">
          {MANAGEMENT_CARDS.map((card) => {
            const content = (
              <>
                <div className={`admin-management-icon admin-management-icon--${card.tone}`}>
                  <StatIcon type={card.icon} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </>
            )

            if (card.to) {
              return (
                <Link key={card.title} to={card.to} className="admin-management-card">
                  {content}
                </Link>
              )
            }

            return (
              <article key={card.title} className="admin-management-card">
                {content}
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}

export default Admin
