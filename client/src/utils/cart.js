/** 장바구니에 담긴 상품의 총 수량(개수)을 계산합니다. */
export function getCartItemCount(cart) {
  if (!cart?.items?.length) return 0

  // 각 item.quantity를 더해 배지에 표시할 숫자를 만듭니다.
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}
