// 포트원 V2 — 콘솔 > 결제 연동에서 확인
export const PORTONE_STORE_ID =
  import.meta.env.VITE_PORTONE_STORE_ID || 'store-4a59024b-e660-4115-8076-4e612b0311de'

export const PORTONE_CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY || ''

/** PortOne V2 SDK 로드 여부 */
export function isPortOneReady() {
  return Boolean(window.PortOne?.requestPayment)
}

/** 결제 시도마다 고유해야 하는 paymentId 생성 (KG이니시스 oid 최대 40자) */
export function createPaymentId() {
  const id = `pay${Date.now()}${Math.random().toString(36).slice(2, 8)}`
  return id.slice(0, 40)
}

/**
 * KG이니시스 등 PG 결제창 호출 (PortOne V2)
 * @returns {Promise<object>} 결제 성공 응답
 */
export async function requestPortOnePayment({
  paymentId,
  orderName,
  totalAmount,
  customer,
}) {
  if (!isPortOneReady()) {
    throw new Error('PortOne SDK가 로드되지 않았습니다. 페이지를 새로고침해 주세요.')
  }

  if (!PORTONE_CHANNEL_KEY) {
    throw new Error(
      'VITE_PORTONE_CHANNEL_KEY가 설정되지 않았습니다. 포트원 콘솔 > 결제 연동 > KG이니시스 채널 키를 .env에 추가해 주세요.',
    )
  }

  if (!customer?.email?.trim()) {
    throw new Error('구매자 이메일은 필수 입력입니다.')
  }

  const response = await window.PortOne.requestPayment({
    storeId: PORTONE_STORE_ID,
    channelKey: PORTONE_CHANNEL_KEY,
    paymentId,
    orderName,
    totalAmount: Math.round(totalAmount),
    currency: 'CURRENCY_KRW',
    payMethod: 'CARD',
    customer,
  })

  // code가 있으면 사용자 취소 또는 결제 실패
  if (response?.code != null) {
    throw new Error(response.message || '결제에 실패했습니다.')
  }

  return response
}

/** 장바구니 상품명으로 주문명 생성 */
export function buildOrderName(items) {
  if (!items?.length) return '쇼핑몰 주문'

  const firstName = items[0].product?.name || '상품'
  if (items.length === 1) return firstName

  return `${firstName} 외 ${items.length - 1}건`
}
