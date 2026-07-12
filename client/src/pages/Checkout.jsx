import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import CheckoutProgress from '@/components/CheckoutProgress'
import { createOrder, getCart, getUser } from '@/api/client'
import { getStoredUser, isLoggedIn } from '@/utils/auth'
import {
  calculateShippingFee,
  formatPrice,
  FREE_SHIPPING_THRESHOLD,
} from '@/utils/order'
import {
  buildOrderName,
  createPaymentId,
  requestPortOnePayment,
} from '@/utils/portone'
import './Checkout.css'

const INITIAL_FORM = {
  recipientName: '',
  phone: '',
  email: '',
  postalCode: '',
  address1: '',
  address2: '',
  deliveryMemo: '',
}

function buildFormFromUser(user, prev = INITIAL_FORM) {
  return {
    ...prev,
    recipientName: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address1: user?.address || '',
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getOrderFailureMessage(error) {
  const message = error?.message?.trim() || ''

  if (!message) {
    return '주문에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }

  if (/취소|cancel/i.test(message)) {
    return '주문이 취소되었습니다. 다시 결제를 진행해 주세요.'
  }

  if (message.startsWith('주문에 실패했습니다.') || message.startsWith('주문이 취소되었습니다.')) {
    return message
  }

  return `주문에 실패했습니다. ${message}`
}

function FieldLabel({ children, required = false }) {
  return (
    <span className="checkout-field-label">
      {children}
      {required && <span className="checkout-required">*</span>}
    </span>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="checkout-back-icon">
      <path d="M15 6 9 12l6 6" />
    </svg>
  )
}

function Checkout() {
  const navigate = useNavigate()
  const storedUser = getStoredUser()
  const [profile, setProfile] = useState(null)
  const [cart, setCart] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState('')
  const [orderError, setOrderError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const errorBannerRef = useRef(null)
  const addressInputRef = useRef(null)
  const emailInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function loadCheckoutData() {
      if (!isLoggedIn()) {
        if (!cancelled) setIsLoading(false)
        return
      }

      const localUser = getStoredUser()
      const userId = localUser?._id

      if (!cancelled) {
        setIsLoading(true)
        setError('')
      }

      try {
        const [profileData, cartData] = await Promise.all([
          userId ? getUser(userId).catch(() => localUser) : Promise.resolve(localUser),
          getCart(),
        ])

        if (cancelled) return

        const resolvedProfile = profileData || localUser
        setProfile(resolvedProfile)
        setCart(cartData)
        setForm((prev) => buildFormFromUser(resolvedProfile, prev))
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || '주문 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadCheckoutData()

    return () => {
      cancelled = true
    }
  }, [])

  const applyDefaultAddress = () => {
    if (!profile) return
    setForm((prev) => buildFormFromUser(profile, prev))
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (error) {
      setError('')
    }
    if (orderError) {
      setOrderError('')
    }
  }

  const showValidationError = (message, fieldName) => {
    setError(message)
    if (fieldName) {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: message }))
    }

    errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    if (fieldName === 'address1') {
      addressInputRef.current?.focus()
    }
    if (fieldName === 'email') {
      emailInputRef.current?.focus()
    }
  }

  const validateShipping = () => {
    if (!form.recipientName.trim()) {
      const message = '받는 분 이름을 입력해 주세요.'
      setFieldErrors({ recipientName: message })
      showValidationError(message, 'recipientName')
      return false
    }

    if (!form.phone.trim()) {
      const message = '연락처를 입력해 주세요.'
      setFieldErrors({ phone: message })
      showValidationError(message, 'phone')
      return false
    }

    if (!form.email.trim()) {
      const message = '이메일은 필수 입력 항목입니다. KG이니시스 결제에 필요합니다.'
      setFieldErrors({ email: message })
      showValidationError(message, 'email')
      return false
    }

    if (!isValidEmail(form.email.trim())) {
      const message = '올바른 이메일 형식을 입력해 주세요.'
      setFieldErrors({ email: message })
      showValidationError(message, 'email')
      return false
    }

    if (!form.address1.trim()) {
      const message = '주소는 필수 입력 항목입니다. 배송 주소를 입력해 주세요.'
      setFieldErrors({ address1: message })
      showValidationError(message, 'address1')
      return false
    }

    setError('')
    setFieldErrors({})
    return true
  }

  const handleNextStep = () => {
    if (!validateShipping()) return
    setCurrentStep(2)
  }

  const handlePrevStep = () => {
    setError('')
    setOrderError('')
    setFieldErrors({})
    setCurrentStep(1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateShipping()) {
      setCurrentStep(1)
      return
    }

    setError('')
    setOrderError('')
    setIsSubmitting(true)

    try {
      const cartItems = cart?.items || []
      const submitItemsTotal = cartItems.reduce(
        (sum, item) => sum + (item.product?.price || 0) * item.quantity,
        0,
      )
      const submitTotalAmount =
        submitItemsTotal + calculateShippingFee(submitItemsTotal)

      const paymentId = createPaymentId()
      const orderName = buildOrderName(cartItems)

      // 1) 포트원 KG이니시스 결제창 호출
      await requestPortOnePayment({
        paymentId,
        orderName,
        totalAmount: submitTotalAmount,
        customer: {
          fullName: form.recipientName.trim(),
          phoneNumber: form.phone.trim(),
          email: form.email.trim(),
        },
      })

      // 2) 결제 성공 후 서버에 주문 저장
      const result = await createOrder({
        shippingAddress: {
          recipientName: form.recipientName.trim(),
          phone: form.phone.trim(),
          postalCode: form.postalCode.trim(),
          address1: form.address1.trim(),
          address2: form.address2.trim(),
          deliveryMemo: form.deliveryMemo.trim(),
        },
        paymentMethod: 'card',
        paymentId,
      })

      navigate(`/orders/${result.order._id}`, {
        replace: true,
        state: { orderSuccess: true },
      })
    } catch (submitError) {
      const failureMessage = getOrderFailureMessage(submitError)
      setOrderError(failureMessage)
      setError('')
      setCurrentStep(2)
      requestAnimationFrame(() => {
        errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!storedUser || !isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  const items = cart?.items || []
  const itemsTotal = items.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0,
  )
  const shippingFee = calculateShippingFee(itemsTotal)
  const totalAmount = itemsTotal + shippingFee
  const hasDefaultAddress = Boolean(profile?.address?.trim())

  if (!isLoading && items.length === 0 && !error) {
    return (
      <main className="checkout-page">
        <div className="checkout-card">
          <h1>결제</h1>
          <p className="checkout-status">장바구니에 담긴 상품이 없습니다.</p>
          <p className="checkout-footer">
            <Link to="/cart">장바구니로 돌아가기</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="checkout-page">
      <div className="checkout-card">
        <header className="checkout-header">
          <Link to="/cart" className="checkout-back" aria-label="장바구니로 돌아가기">
            <BackIcon />
          </Link>
          <h1>결제</h1>
        </header>

        <CheckoutProgress currentStep={currentStep} />

        {isLoading && <p className="checkout-status">불러오는 중...</p>}
        {(error || orderError) && (
          <p ref={errorBannerRef} className="checkout-error" role="alert">
            {orderError || error}
          </p>
        )}

        {!isLoading && items.length > 0 && (
          <div className="checkout-layout">
            <div className="checkout-form">
              {currentStep === 1 && (
                <>
                  <section className="checkout-section">
                    <h2>📦 배송 정보</h2>

                    <div className="checkout-default-address">
                      <div className="checkout-default-address-top">
                        <strong>기본 배송지</strong>
                        {hasDefaultAddress && <span className="checkout-default-badge">기본</span>}
                      </div>
                      <p className="checkout-default-row">
                        <span>받는 분</span>
                        <strong>{profile?.name || storedUser.name || '-'}</strong>
                      </p>
                      <p className="checkout-default-row">
                        <span>연락처</span>
                        <strong>{profile?.phone || storedUser.phone || '-'}</strong>
                      </p>
                      <p className="checkout-default-row">
                        <span>이메일</span>
                        <strong>{profile?.email || storedUser.email || '-'}</strong>
                      </p>
                      <p className="checkout-default-row">
                        <span>주소</span>
                        <strong>{profile?.address?.trim() || storedUser.address?.trim() || '등록된 주소 없음'}</strong>
                      </p>
                      {hasDefaultAddress && (
                        <button type="button" className="checkout-default-apply" onClick={applyDefaultAddress}>
                          기본 배송지 사용
                        </button>
                      )}
                    </div>

                    <p className="checkout-section-note">배송 정보를 확인하거나 수정해 주세요.</p>

                    <label className={`checkout-field${fieldErrors.recipientName ? ' checkout-field--invalid' : ''}`}>
                      <FieldLabel required>받는 분</FieldLabel>
                      <input
                        type="text"
                        name="recipientName"
                        value={form.recipientName}
                        onChange={handleChange}
                        placeholder="이름"
                        aria-invalid={Boolean(fieldErrors.recipientName)}
                      />
                      {fieldErrors.recipientName && (
                        <span className="checkout-field-error">{fieldErrors.recipientName}</span>
                      )}
                    </label>
                    <label className={`checkout-field${fieldErrors.phone ? ' checkout-field--invalid' : ''}`}>
                      <FieldLabel required>연락처</FieldLabel>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="010-0000-0000"
                        aria-invalid={Boolean(fieldErrors.phone)}
                      />
                      {fieldErrors.phone && (
                        <span className="checkout-field-error">{fieldErrors.phone}</span>
                      )}
                    </label>
                    <label className={`checkout-field${fieldErrors.email ? ' checkout-field--invalid' : ''}`}>
                      <FieldLabel required>이메일</FieldLabel>
                      <input
                        ref={emailInputRef}
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="example@email.com"
                        aria-invalid={Boolean(fieldErrors.email)}
                        autoComplete="email"
                      />
                      {fieldErrors.email && (
                        <span className="checkout-field-error">{fieldErrors.email}</span>
                      )}
                    </label>
                    <label className="checkout-field">
                      <span>우편번호</span>
                      <input
                        type="text"
                        name="postalCode"
                        value={form.postalCode}
                        onChange={handleChange}
                        placeholder="12345"
                      />
                    </label>
                    <label className={`checkout-field${fieldErrors.address1 ? ' checkout-field--invalid' : ''}`}>
                      <FieldLabel required>주소</FieldLabel>
                      <input
                        ref={addressInputRef}
                        type="text"
                        name="address1"
                        value={form.address1}
                        onChange={handleChange}
                        placeholder="기본 주소"
                        aria-invalid={Boolean(fieldErrors.address1)}
                      />
                      {fieldErrors.address1 && (
                        <span className="checkout-field-error">{fieldErrors.address1}</span>
                      )}
                    </label>
                    <label className="checkout-field">
                      <span>상세 주소</span>
                      <input
                        type="text"
                        name="address2"
                        value={form.address2}
                        onChange={handleChange}
                        placeholder="동/호수 등"
                      />
                    </label>
                    <label className="checkout-field">
                      <span>배송 메모</span>
                      <textarea
                        name="deliveryMemo"
                        value={form.deliveryMemo}
                        onChange={handleChange}
                        placeholder="부재 시 문 앞에 놓아주세요"
                        rows={3}
                      />
                    </label>
                  </section>

                  <button type="button" className="checkout-submit" onClick={handleNextStep}>
                    {formatPrice(totalAmount)} 결제하기
                  </button>
                </>
              )}

              {currentStep === 2 && (
                <form onSubmit={handleSubmit}>
                  {orderError && (
                    <div className="checkout-order-failure" role="alert">
                      <strong>주문 실패</strong>
                      <p>{orderError}</p>
                    </div>
                  )}

                  <section className="checkout-section">
                    <h2>💳 결제 정보</h2>
                    <p className="checkout-payment-method">KG이니시스 · 신용/체크카드</p>
                    <p className="checkout-note">
                      결제하기를 누르면 포트원 결제창이 열립니다. 테스트 PG 환경에서 진행됩니다.
                    </p>
                  </section>

                  <div className="checkout-step-actions">
                    <button type="button" className="checkout-secondary-button" onClick={handlePrevStep}>
                      이전
                    </button>
                    <button type="submit" className="checkout-submit" disabled={isSubmitting}>
                      {isSubmitting ? '주문 처리 중...' : `${formatPrice(totalAmount)} 결제하기`}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <aside className="checkout-summary">
              <h2>주문 요약</h2>
              <ul className="checkout-item-list">
                {items.map((item) => (
                  <li key={item._id} className="checkout-item">
                    <img src={item.product.image} alt={item.product.name} />
                    <div>
                      <strong>{item.product.name}</strong>
                      <p>
                        {formatPrice(item.product.price)} × {item.quantity}개
                      </p>
                    </div>
                    <span>{formatPrice(item.product.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="checkout-summary-row">
                <span>상품 금액</span>
                <strong>{formatPrice(itemsTotal)}</strong>
              </div>
              <div className="checkout-summary-row">
                <span>배송비</span>
                <strong>{shippingFee === 0 ? '무료' : formatPrice(shippingFee)}</strong>
              </div>
              {shippingFee > 0 && (
                <p className="checkout-shipping-note">
                  {formatPrice(FREE_SHIPPING_THRESHOLD)} 이상 구매 시 무료 배송
                </p>
              )}
              <div className="checkout-summary-row checkout-summary-total">
                <span>총 결제 금액</span>
                <strong>{formatPrice(totalAmount)}</strong>
              </div>
            </aside>
          </div>
        )}

        <p className="checkout-footer">
          <Link to="/cart">장바구니로 돌아가기</Link>
        </p>
      </div>
    </main>
  )
}

export default Checkout
