import { useEffect, useMemo, useState } from 'react'

import { Link, Navigate } from 'react-router-dom'

import { getMyOrders } from '@/api/client'

import { getStoredUser, isLoggedIn } from '@/utils/auth'

import { formatPrice, getOrderFilterCounts, matchesOrderFilter, ORDER_FILTERS } from '@/utils/order'

import './Orders.css'



function formatOrderDate(value) {

  if (!value) return '-'

  const date = new Date(value)

  const year = date.getFullYear()

  const month = String(date.getMonth() + 1).padStart(2, '0')

  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`

}



function getDisplayStatus(status) {

  if (['pending', 'paid', 'preparing', 'shipping_started'].includes(status)) {

    return { label: '처리중', tone: 'processing' }

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

  return { label: status, tone: 'processing' }

}



function matchesFilter(order, filterId) {
  return matchesOrderFilter(order, filterId)
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

  const [orders, setOrders] = useState([])

  const [activeFilter, setActiveFilter] = useState('all')

  const [error, setError] = useState('')

  const [isLoading, setIsLoading] = useState(true)



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

        setError(fetchError.message || '주문 내역을 불러오지 못했습니다.')

      })

      .finally(() => {

        setIsLoading(false)

      })

  }, [])



  const filterCounts = useMemo(() => getOrderFilterCounts(orders), [orders])

  const filteredOrders = useMemo(

    () => orders.filter((order) => matchesFilter(order, activeFilter)),

    [orders, activeFilter],

  )



  if (!isLoggedIn()) {

    return <Navigate to="/login" replace />

  }



  return (

    <main className="orders-page">

      <div className="orders-container">

        <header className="orders-header">

          <h1>주문 내역</h1>

          {user?.name && <p className="orders-header-user">{user.name}님의 주문 내역입니다.</p>}

        </header>



        <div className="orders-filters" role="tablist" aria-label="주문 상태 필터">

          {ORDER_FILTERS.map((filter) => (

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



        {isLoading && <p className="orders-message">불러오는 중...</p>}

        {error && <p className="orders-error">{error}</p>}



        {!isLoading && !error && filteredOrders.length === 0 && (

          <p className="orders-message">표시할 주문 내역이 없습니다.</p>

        )}



        {!isLoading && !error && filteredOrders.length > 0 && (

          <ul className="orders-list">

            {filteredOrders.map((order) => {

              const displayStatus = getDisplayStatus(order.status)



              return (

                <li key={order._id} className="orders-card">

                  <Link to={`/orders/${order._id}`} className="orders-card-link">

                    <div className="orders-card-header">

                      <div className="orders-card-meta">

                        <ClockIcon />

                        <div>

                          <strong className="orders-card-number">주문 #{order.orderNumber}</strong>

                          <span className="orders-card-date">주문일: {formatOrderDate(order.createdAt)}</span>

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

                            <span className="orders-product-meta">수량: {item.quantity}</span>

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

          <Link to="/">쇼핑 계속하기</Link>

        </p>

      </div>

    </main>

  )

}



export default Orders

