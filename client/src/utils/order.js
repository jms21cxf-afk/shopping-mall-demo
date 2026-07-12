export const ORDER_STATUS_LABELS = {
  pending: '주문확인',
  paid: '주문확인',
  preparing: '상품준비중',
  shipping_started: '배송시작',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '주문취소',
}

export const PAYMENT_METHOD_LABELS = {
  card: '신용/체크카드',
  bank_transfer: '무통장 입금',
  naver_pay: 'N pay',
  demo: '데모 결제',
}

export const FREE_SHIPPING_THRESHOLD = 50000
export const SHIPPING_FEE = 3000

export function calculateShippingFee(itemsTotal) {
  return itemsTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
}

export function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`
}

export const ORDER_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'processing', label: '처리중' },
  { id: 'shipping', label: '배송중' },
  { id: 'completed', label: '완료' },
  { id: 'cancelled', label: '취소' },
]

export function matchesOrderFilter(order, filterId) {
  if (filterId === 'all') return true
  if (filterId === 'processing') {
    return ['pending', 'paid', 'preparing', 'shipping_started'].includes(order.status)
  }
  if (filterId === 'shipping') return order.status === 'shipped'
  if (filterId === 'completed') return order.status === 'delivered'
  if (filterId === 'cancelled') return order.status === 'cancelled'
  return true
}

export function getOrderFilterCounts(orders) {
  return ORDER_FILTERS.reduce((counts, filter) => {
    counts[filter.id] = orders.filter((order) => matchesOrderFilter(order, filter.id)).length
    return counts
  }, {})
}

// --- 관리자 주문 관리 전용 상태 ---

export const ADMIN_ORDER_STATUS_OPTIONS = [
  { value: 'paid', label: '주문확인' },
  { value: 'preparing', label: '상품준비중' },
  { value: 'shipping_started', label: '배송시작' },
  { value: 'shipped', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'cancelled', label: '주문취소' },
]

export const ADMIN_ORDER_PROGRESS_STEPS = [
  { key: 'confirmed', label: '주문확인', statuses: ['pending', 'paid'] },
  { key: 'preparing', label: '상품준비중', statuses: ['preparing'] },
  { key: 'shipping_started', label: '배송시작', statuses: ['shipping_started'] },
  { key: 'shipped', label: '배송중', statuses: ['shipped'] },
  { key: 'delivered', label: '배송완료', statuses: ['delivered'] },
]

export const ADMIN_ORDER_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'confirmed', label: '주문확인', statuses: ['pending', 'paid'] },
  { id: 'preparing', label: '상품준비중', statuses: ['preparing'] },
  { id: 'shipping_started', label: '배송시작', statuses: ['shipping_started'] },
  { id: 'shipped', label: '배송중', statuses: ['shipped'] },
  { id: 'delivered', label: '배송완료', statuses: ['delivered'] },
  { id: 'cancelled', label: '주문취소', statuses: ['cancelled'] },
]

export function normalizeAdminOrderStatus(status) {
  return status === 'pending' ? 'paid' : status
}

export function getAdminOrderStatusMeta(status) {
  const meta = {
    pending: { label: '주문확인', tone: 'confirmed' },
    paid: { label: '주문확인', tone: 'confirmed' },
    preparing: { label: '상품준비중', tone: 'preparing' },
    shipping_started: { label: '배송시작', tone: 'shipping-started' },
    shipped: { label: '배송중', tone: 'shipped' },
    delivered: { label: '배송완료', tone: 'delivered' },
    cancelled: { label: '주문취소', tone: 'cancelled' },
  }

  return meta[status] || { label: status, tone: 'confirmed' }
}

export function getAdminOrderProgressIndex(status) {
  if (status === 'cancelled') return -1
  return ADMIN_ORDER_PROGRESS_STEPS.findIndex((step) => step.statuses.includes(status))
}

export function matchesAdminOrderFilter(order, filterId) {
  if (filterId === 'all') return true

  const filter = ADMIN_ORDER_FILTERS.find((entry) => entry.id === filterId)
  if (!filter?.statuses) return true

  return filter.statuses.includes(order.status)
}

export function getAdminOrderFilterCounts(orders) {
  return ADMIN_ORDER_FILTERS.reduce((counts, filter) => {
    if (filter.id === 'all') {
      counts[filter.id] = orders.length
      return counts
    }

    counts[filter.id] = orders.filter((order) => filter.statuses.includes(order.status)).length
    return counts
  }, {})
}

export function getAdminFilterIdForStatus(status) {
  const filter = ADMIN_ORDER_FILTERS.find(
    (entry) => entry.id !== 'all' && entry.statuses?.includes(status),
  )
  return filter?.id || 'all'
}
