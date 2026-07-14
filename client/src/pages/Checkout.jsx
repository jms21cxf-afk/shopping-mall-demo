import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import CheckoutProgress from '@/components/CheckoutProgress'
import PageLanguageBar from '@/components/PageLanguageBar'
import { createOrder, getCart, getUser } from '@/api/client'
import { useLanguage } from '@/i18n/LanguageContext'
import { getStoredUser, isLoggedIn } from '@/utils/auth'
import { calculateShippingFee, FREE_SHIPPING_THRESHOLD } from '@/utils/order'
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

function getOrderFailureMessage(error, t) {
  const message = error?.message?.trim() || ''

  if (!message) {
    return t('checkoutOrderFailedGeneric')
  }

  if (/취소|cancel/i.test(message)) {
    return t('checkoutOrderCancelled')
  }

  if (message.startsWith('주문에 실패했습니다.') || message.startsWith('주문이 취소되었습니다.')) {
    return message
  }

  return t('checkoutOrderFailed', { message })
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
  const { t, formatPrice } = useLanguage()
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
          setError(fetchError.message || t('checkoutLoadError'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadCheckoutData()

    return () => {
      cancelled = true
    }
  }, [t])

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
      const message = t('checkoutValidationRecipient')
      setFieldErrors({ recipientName: message })
      showValidationError(message, 'recipientName')
      return false
    }

    if (!form.phone.trim()) {
      const message = t('checkoutValidationPhone')
      setFieldErrors({ phone: message })
      showValidationError(message, 'phone')
      return false
    }

    if (!form.email.trim()) {
      const message = t('checkoutValidationEmailRequired')
      setFieldErrors({ email: message })
      showValidationError(message, 'email')
      return false
    }

    if (!isValidEmail(form.email.trim())) {
      const message = t('checkoutValidationEmailInvalid')
      setFieldErrors({ email: message })
      showValidationError(message, 'email')
      return false
    }

    if (!form.address1.trim()) {
      const message = t('checkoutValidationAddress')
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
      const failureMessage = getOrderFailureMessage(submitError, t)
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
      <>
        <PageLanguageBar />
        <main className="checkout-page">
          <div className="checkout-card">
            <h1>{t('checkoutTitle')}</h1>
            <p className="checkout-status">{t('checkoutEmpty')}</p>
            <p className="checkout-footer">
              <Link to="/cart">{t('checkoutBackCart')}</Link>
            </p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <PageLanguageBar />
      <main className="checkout-page">
        <div className="checkout-card">
          <header className="checkout-header">
            <Link to="/cart" className="checkout-back" aria-label={t('checkoutBackCart')}>
              <BackIcon />
            </Link>
            <h1>{t('checkoutTitle')}</h1>
          </header>

          <CheckoutProgress currentStep={currentStep} />

          {isLoading && <p className="checkout-status">{t('checkoutLoading')}</p>}
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
                      <h2>📦 {t('checkoutShippingInfo')}</h2>

                      <div className="checkout-default-address">
                        <div className="checkout-default-address-top">
                          <strong>{t('checkoutDefaultAddress')}</strong>
                          {hasDefaultAddress && (
                            <span className="checkout-default-badge">{t('checkoutDefaultBadge')}</span>
                          )}
                        </div>
                        <p className="checkout-default-row">
                          <span>{t('checkoutRecipient')}</span>
                          <strong>{profile?.name || storedUser.name || '-'}</strong>
                        </p>
                        <p className="checkout-default-row">
                          <span>{t('checkoutPhone')}</span>
                          <strong>{profile?.phone || storedUser.phone || '-'}</strong>
                        </p>
                        <p className="checkout-default-row">
                          <span>{t('checkoutEmail')}</span>
                          <strong>{profile?.email || storedUser.email || '-'}</strong>
                        </p>
                        <p className="checkout-default-row">
                          <span>{t('checkoutAddress')}</span>
                          <strong>
                            {profile?.address?.trim() || storedUser.address?.trim() || t('checkoutNoAddress')}
                          </strong>
                        </p>
                        {hasDefaultAddress && (
                          <button type="button" className="checkout-default-apply" onClick={applyDefaultAddress}>
                            {t('checkoutUseDefaultAddress')}
                          </button>
                        )}
                      </div>

                      <p className="checkout-section-note">{t('checkoutShippingNote')}</p>

                      <label className={`checkout-field${fieldErrors.recipientName ? ' checkout-field--invalid' : ''}`}>
                        <FieldLabel required>{t('checkoutRecipient')}</FieldLabel>
                        <input
                          type="text"
                          name="recipientName"
                          value={form.recipientName}
                          onChange={handleChange}
                          placeholder={t('checkoutRecipient')}
                          aria-invalid={Boolean(fieldErrors.recipientName)}
                        />
                        {fieldErrors.recipientName && (
                          <span className="checkout-field-error">{fieldErrors.recipientName}</span>
                        )}
                      </label>
                      <label className={`checkout-field${fieldErrors.phone ? ' checkout-field--invalid' : ''}`}>
                        <FieldLabel required>{t('checkoutPhone')}</FieldLabel>
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
                        <FieldLabel required>{t('checkoutEmail')}</FieldLabel>
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
                        <span>{t('checkoutPostalCode')}</span>
                        <input
                          type="text"
                          name="postalCode"
                          value={form.postalCode}
                          onChange={handleChange}
                          placeholder="12345"
                        />
                      </label>
                      <label className={`checkout-field${fieldErrors.address1 ? ' checkout-field--invalid' : ''}`}>
                        <FieldLabel required>{t('checkoutAddress')}</FieldLabel>
                        <input
                          ref={addressInputRef}
                          type="text"
                          name="address1"
                          value={form.address1}
                          onChange={handleChange}
                          placeholder={t('checkoutAddress')}
                          aria-invalid={Boolean(fieldErrors.address1)}
                        />
                        {fieldErrors.address1 && (
                          <span className="checkout-field-error">{fieldErrors.address1}</span>
                        )}
                      </label>
                      <label className="checkout-field">
                        <span>{t('checkoutAddressDetail')}</span>
                        <input
                          type="text"
                          name="address2"
                          value={form.address2}
                          onChange={handleChange}
                          placeholder={t('checkoutAddressDetail')}
                        />
                      </label>
                      <label className="checkout-field">
                        <span>{t('checkoutDeliveryMemo')}</span>
                        <textarea
                          name="deliveryMemo"
                          value={form.deliveryMemo}
                          onChange={handleChange}
                          placeholder={t('checkoutDeliveryMemo')}
                          rows={3}
                        />
                      </label>
                    </section>

                    <button type="button" className="checkout-submit" onClick={handleNextStep}>
                      {t('checkoutNextPay', { amount: formatPrice(totalAmount) })}
                    </button>
                  </>
                )}

                {currentStep === 2 && (
                  <form onSubmit={handleSubmit}>
                    {orderError && (
                      <div className="checkout-order-failure" role="alert">
                        <strong>{t('checkoutOrderFailureTitle')}</strong>
                        <p>{orderError}</p>
                      </div>
                    )}

                    <section className="checkout-section">
                      <h2>💳 {t('checkoutPaymentInfo')}</h2>
                      <p className="checkout-payment-method">{t('checkoutPaymentMethod')}</p>
                      <p className="checkout-note">{t('checkoutPaymentNote')}</p>
                    </section>

                    <div className="checkout-step-actions">
                      <button type="button" className="checkout-secondary-button" onClick={handlePrevStep}>
                        {t('checkoutPrevious')}
                      </button>
                      <button type="submit" className="checkout-submit" disabled={isSubmitting}>
                        {isSubmitting
                          ? t('checkoutProcessing')
                          : t('checkoutNextPay', { amount: formatPrice(totalAmount) })}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <aside className="checkout-summary">
                <h2>{t('checkoutOrderSummary')}</h2>
                <ul className="checkout-item-list">
                  {items.map((item) => (
                    <li key={item._id} className="checkout-item">
                      <img src={item.product.image} alt={item.product.name} />
                      <div>
                        <strong>{item.product.name}</strong>
                        <p>
                          {formatPrice(item.product.price)} × {item.quantity}
                          {t('unitPiece')}
                        </p>
                      </div>
                      <span>{formatPrice(item.product.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>

                <div className="checkout-summary-row">
                  <span>{t('checkoutItemsAmount')}</span>
                  <strong>{formatPrice(itemsTotal)}</strong>
                </div>
                <div className="checkout-summary-row">
                  <span>{t('checkoutShippingFee')}</span>
                  <strong>{shippingFee === 0 ? t('checkoutFree') : formatPrice(shippingFee)}</strong>
                </div>
                {shippingFee > 0 && (
                  <p className="checkout-shipping-note">
                    {t('checkoutFreeShipping', { threshold: formatPrice(FREE_SHIPPING_THRESHOLD) })}
                  </p>
                )}
                <div className="checkout-summary-row checkout-summary-total">
                  <span>{t('checkoutTotal')}</span>
                  <strong>{formatPrice(totalAmount)}</strong>
                </div>
              </aside>
            </div>
          )}

          <p className="checkout-footer">
            <Link to="/cart">{t('checkoutBackCart')}</Link>
          </p>
        </div>
      </main>
    </>
  )
}

export default Checkout
