import { useLanguage } from '@/i18n/LanguageContext'
import './CheckoutProgress.css'

function CheckoutProgress({ currentStep }) {
  const { t } = useLanguage()
  const steps = [
    { step: 1, label: t('checkoutProgressShipping') },
    { step: 2, label: t('checkoutProgressPayment') },
    { step: 3, label: t('checkoutProgressComplete') },
  ]

  return (
    <nav className="checkout-progress" aria-label={t('checkoutTitle')}>
      <ol className="checkout-progress-list">
        {steps.map(({ step, label }, index) => {
          const isActive = step === currentStep
          const isComplete = step < currentStep

          return (
            <li
              key={step}
              className={
                isActive
                  ? 'checkout-progress-item is-active'
                  : isComplete
                    ? 'checkout-progress-item is-complete'
                    : 'checkout-progress-item'
              }
            >
              <span className="checkout-progress-marker" aria-hidden="true">
                {step}
              </span>
              <span className="checkout-progress-label">{label}</span>
              {index < steps.length - 1 && (
                <span className="checkout-progress-line" aria-hidden="true" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default CheckoutProgress
