import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import GlobalLanguageControls from '@/components/GlobalLanguageControls'
import { addCartItem, getProduct } from '@/api/client'
import { useLanguage } from '@/i18n/LanguageContext'
import { getCategoryFeatures, getCategoryLabel } from '@/i18n/orderI18n'
import { getStoredUser, isLoggedIn } from '@/utils/auth'
import './ProductDetail.css'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, formatPrice } = useLanguage()
  const user = getStoredUser()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isBuying, setIsBuying] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    setError('')
    setQuantity(1)

    getProduct(id)
      .then((data) => {
        setProduct(data)
      })
      .catch((fetchError) => {
        setError(fetchError.message || t('productLoadError'))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [id, t])

  // 상품 상세 페이지의 "장바구니" 버튼 클릭 시 호출
  const handleAddToCart = async () => {
    if (!isLoggedIn()) {
      navigate('/login')
      return
    }

    setIsAddingToCart(true)

    try {
      await addCartItem(product._id, quantity)
      window.alert(t('productAddedToCart'))
    } catch (cartError) {
      window.alert(cartError.message || t('productAddFailed'))
    } finally {
      setIsAddingToCart(false)
    }
  }

  // 상품 상세 "구매하기" — 장바구니에 담은 뒤 주문(결제) 페이지로 이동
  const handleBuyNow = async () => {
    if (!isLoggedIn()) {
      navigate('/login')
      return
    }

    setIsBuying(true)

    try {
      await addCartItem(product._id, quantity)
      navigate('/checkout')
    } catch (buyError) {
      window.alert(buyError.message || t('productBuyFailed'))
    } finally {
      setIsBuying(false)
    }
  }

  const handleDemoAction = (label) => {
    window.alert(t('productDemoAlert', { label }))
  }

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1))
  }

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1)
  }

  const howToSteps = useMemo(
    () => [t('howToStep1'), t('howToStep2'), t('howToStep3')],
    [t],
  )

  if (isLoading) {
    return (
      <div className="product-detail-page">
        <p className="product-detail-status">{t('productLoading')}</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <p className="product-detail-error">{error || t('productNotFound')}</p>
        <Link to="/" className="product-detail-back">
          {t('productBackHome')}
        </Link>
      </div>
    )
  }

  const categoryLabel = getCategoryLabel(product.category, t)
  const features = getCategoryFeatures(product.category, t)
  const storyText =
    product.description || t('productDefaultStory', { name: product.name })
  const totalPrice = product.price * quantity

  return (
    <div className="product-detail-page">
      <header className="product-detail-header">
        <button type="button" className="product-detail-nav-button" onClick={() => navigate(-1)}>
          {t('productBack')}
        </button>
        <Link to="/" className="product-detail-logo">
          Shopping Mall Demo
        </Link>
        <div className="product-detail-header-actions">
          <GlobalLanguageControls />
          {user ? (
            <span className="product-detail-user">{t('welcome', { name: user.name })}</span>
          ) : (
            <Link to="/login" className="product-detail-nav-link">
              {t('login')}
            </Link>
          )}
        </div>
      </header>

      <div className="product-detail-layout">
        <main className="product-detail-content">
          <section className="detail-hero">
            <img src={product.image} alt={product.name} className="detail-hero-image" />
          </section>

          <section className="detail-intro">
            <p className="detail-category">{categoryLabel}</p>
            <h1 className="detail-title">{product.name}</h1>
            <p className="detail-subtitle">{t('productSubtitle')}</p>
            <div className="detail-pills">
              {features.map((feature) => (
                <span key={feature} className="detail-pill">
                  {feature}
                </span>
              ))}
            </div>
          </section>

          <section className="detail-story">
            <div className="detail-story-image-wrap">
              <img src={product.image} alt="" className="detail-story-image" />
            </div>
            <h2>{t('productStory')}</h2>
            <p>{storyText}</p>
          </section>

          <section className="detail-features">
            <h2>{t('productKeyBenefits')}</h2>
            <div className="detail-feature-grid">
              {features.map((feature, index) => (
                <article key={feature} className="detail-feature-card">
                  <span className="detail-feature-number">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{feature}</h3>
                  <p>{t('productFeatureDesc', { category: categoryLabel })}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="detail-how-to">
            <h2>{t('productHowToUse')}</h2>
            <ol>
              {howToSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="detail-info">
            <h2>{t('productInfo')}</h2>
            <dl className="detail-info-list">
              <div>
                <dt>SKU</dt>
                <dd>{product.sku}</dd>
              </div>
              <div>
                <dt>{t('productCategory')}</dt>
                <dd>{categoryLabel}</dd>
              </div>
              <div>
                <dt>{t('productPrice')}</dt>
                <dd>{formatPrice(product.price)}</dd>
              </div>
            </dl>
          </section>
        </main>

        <aside className="detail-purchase-panel">
          <div className="detail-purchase-inner">
            <h2 className="detail-purchase-title">{product.name}</h2>
            <p className="detail-purchase-price">{formatPrice(product.price)}</p>

            <div className="detail-quantity-row">
              <span className="detail-quantity-label">{product.name}</span>
              <div className="detail-quantity-control">
                <button type="button" onClick={decreaseQuantity} aria-label={t('cartQuantityDecrease')}>
                  −
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={increaseQuantity} aria-label={t('cartQuantityIncrease')}>
                  +
                </button>
              </div>
              <span className="detail-line-price">{formatPrice(product.price)}</span>
            </div>

            <div className="detail-total-row">
              <span>{t('productTotalItems', { quantity })}</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>

            <div className="detail-action-row">
              <button
                type="button"
                className="detail-buy-button"
                onClick={handleBuyNow}
                disabled={isBuying}
              >
                {isBuying ? t('productBuying') : t('productBuyNow')}
              </button>
              <button
                type="button"
                className="detail-cart-button"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? t('productAdding') : t('productAddToCart')}
              </button>
              <button
                type="button"
                className="detail-wish-button"
                onClick={() => handleDemoAction(t('productWishlist'))}
                aria-label={t('productWishlist')}
              >
                ♡
              </button>
            </div>

            <button
              type="button"
              className="detail-npay-button"
              onClick={() => handleDemoAction(t('productNpay'))}
            >
              {t('productNpay')}
            </button>
            <button
              type="button"
              className="detail-kakao-button"
              onClick={() => handleDemoAction(t('productKakaoBuy'))}
            >
              {t('productKakaoBuy')}
            </button>

            <div className="detail-accordion">
              {['Payment', 'Delivery', 'Refund & Exchange'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="detail-accordion-item"
                  onClick={() => handleDemoAction(item)}
                >
                  <span>{item}</span>
                  <span>+</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ProductDetail
