const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || `Request failed: ${response.status}`)
    error.status = response.status
    throw error
  }

  return data
}

export function checkUsername(username) {
  const params = new URLSearchParams({ username })
  return apiFetch(`/users/check-username?${params.toString()}`)
}

export function createUser(userData) {
  return apiFetch('/users/signup', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

export function getUsers() {
  return apiFetch('/users')
}

export function getUser(id) {
  return apiFetch(`/users/${id}`)
}

export function loginUser(credentials) {
  return apiFetch('/users/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function checkSku(sku) {
  const params = new URLSearchParams({ sku })
  return apiFetch(`/products/check-sku?${params.toString()}`)
}

export function createProduct(productData) {
  return apiFetch('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  })
}

export function getProducts(category, { page, limit } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  const query = params.toString()
  return apiFetch(`/products${query ? `?${query}` : ''}`)
}

export function getBestSellerProducts(limit = 3) {
  const params = new URLSearchParams({ limit: String(limit) })
  return apiFetch(`/products/best-sellers?${params.toString()}`)
}

export function getProduct(id) {
  return apiFetch(`/products/${id}`)
}

export function updateProduct(id, productData) {
  return apiFetch(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  })
}

export function deleteProduct(id) {
  return apiFetch(`/products/${id}`, {
    method: 'DELETE',
  })
}

// --- 장바구니 API (로그인 필요, Authorization 헤더 자동 포함) ---

export function getCart() {
  return apiFetch('/carts')
}

/** 상품을 장바구니에 담습니다. 같은 상품이 있으면 서버에서 수량을 합칩니다. */
export function addCartItem(productId, quantity = 1) {
  return apiFetch('/carts/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  })
}

export function updateCartItem(itemId, quantity) {
  return apiFetch(`/carts/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  })
}

export function removeCartItem(itemId) {
  return apiFetch(`/carts/items/${itemId}`, {
    method: 'DELETE',
  })
}

export function clearCart() {
  return apiFetch('/carts', {
    method: 'DELETE',
  })
}

// --- 주문 API (로그인 필요) ---

export function createOrder(orderData) {
  return apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  })
}

export function getMyOrders() {
  return apiFetch('/orders')
}

export function getOrder(id) {
  return apiFetch(`/orders/${id}`)
}

// --- 관리자 주문 API ---

export function getAdminOrders() {
  return apiFetch('/orders/admin/all')
}

export function updateAdminOrderStatus(id, status) {
  return apiFetch(`/orders/admin/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
