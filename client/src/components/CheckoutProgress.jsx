import './CheckoutProgress.css'

const STEPS = [
  { step: 1, label: '배송정보' },
  { step: 2, label: '결제정보' },
  { step: 3, label: '주문완료' },
]

function CheckoutProgress({ currentStep }) {
  return (
    <nav className="checkout-progress" aria-label="주문 진행 단계">
      <ol className="checkout-progress-list">
        {STEPS.map(({ step, label }, index) => {
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
              {index < STEPS.length - 1 && (
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
