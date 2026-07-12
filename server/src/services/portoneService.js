const PORTONE_API_BASE = 'https://api.portone.io';

const getApiSecret = () => process.env.PORTONE_API_SECRET;

/** 포트원 V2 결제 단건 조회 */
async function getPortOnePayment(paymentId) {
  const apiSecret = getApiSecret();

  if (!apiSecret) {
    throw new Error('PORTONE_API_SECRET is not configured');
  }

  const response = await fetch(
    `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `PortOne ${apiSecret}`,
      },
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.message || data?.type || `PortOne payment lookup failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

/**
 * 결제 완료 여부 및 금액 검증
 * @param {string} paymentId - 클라이언트에서 전달한 PortOne paymentId
 * @param {number} expectedAmount - 서버에서 계산한 주문 총액
 */
async function verifyPortOnePayment(paymentId, expectedAmount) {
  const payment = await getPortOnePayment(paymentId);

  if (payment.status !== 'PAID') {
    const error = new Error('결제가 완료되지 않았습니다.');
    error.status = 400;
    throw error;
  }

  const paidAmount = Number(payment.amount?.total);

  if (Number.isNaN(paidAmount) || paidAmount !== expectedAmount) {
    const error = new Error('결제 금액이 주문 금액과 일치하지 않습니다.');
    error.status = 400;
    throw error;
  }

  return payment;
}

module.exports = {
  getPortOnePayment,
  verifyPortOnePayment,
};
