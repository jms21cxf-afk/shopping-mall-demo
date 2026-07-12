import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addCartItem, getProduct } from '@/api/client'
import { getStoredUser, isLoggedIn } from '@/utils/auth'
import './ProductDetail.css'

const CATEGORY_LABELS = {
  cleansing: '클렌징',
  toner: '토너',
  essence: '에센스',
  cream: '크림',
  suncare: '선케어',
}

const CATEGORY_FEATURES = {
  cleansing: ['저자극 세정', '촉촉한 마무리', '데일리 클렌징'],
  toner: ['피부 결 정돈', '수분 공급', 'pH 밸런스'],
  essence: ['영양 공급', '피부 결 케어', '흡수력 향상'],
  cream: ['보습 강화', '피부 장벽', '촉촉한 마무리'],
  suncare: ['자외선 차단', '가벼운 사용감', '데일리 선케어'],
}

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`
}

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
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
        setError(fetchError.message || '상품 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [id])

  // 상품 상세 페이지의 "장바구니" 버튼 클릭 시 호출
  const handleAddToCart = async () => {
    if (!isLoggedIn()) {
      navigate('/login')
      return
    }

    setIsAddingToCart(true)

    try {
      await addCartItem(product._id, quantity)
      window.alert('장바구니에 담았습니다.')
    } catch (cartError) {
      window.alert(cartError.message || '장바구니 담기에 실패했습니다.')
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
      window.alert(buyError.message || '주문 페이지로 이동하지 못했습니다.')
    } finally {
      setIsBuying(false)
    }
  }

  const handleDemoAction = (label) => {
    window.alert(`데모 버전입니다. ${label} 기능은 준비 중입니다.`)
  }

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1))
  }

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1)
  }

  if (isLoading) {
    return (
      <div className="product-detail-page">
        <p className="product-detail-status">상품을 불러오는 중...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <p className="product-detail-error">{error || '상품을 찾을 수 없습니다.'}</p>
        <Link to="/" className="product-detail-back">
          쇼핑몰로 돌아가기
        </Link>
      </div>
    )
  }

  const categoryLabel = CATEGORY_LABELS[product.category] || product.category
  const features = CATEGORY_FEATURES[product.category] || CATEGORY_FEATURES.essence
  const storyText =
    product.description ||
    `${product.name}은(는) 피부 본연의 아름다움을 살려주는 데일리 스킨케어 제품입니다. 부드럽고 편안한 사용감으로 매일 사용하기 좋습니다.`
  const totalPrice = product.price * quantity

  return (
    <div className="product-detail-page">
      <header className="product-detail-header">
        <button type="button" className="product-detail-nav-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <Link to="/" className="product-detail-logo">
          Shopping Mall Demo
        </Link>
        <div className="product-detail-header-actions">
          {user ? (
            <span className="product-detail-user">{user.name}님</span>
          ) : (
            <Link to="/login" className="product-detail-nav-link">
              Login
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
            <p className="detail-subtitle">Daily skincare for natural beauty</p>
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
            <h2>Product Story</h2>
            <p>{storyText}</p>
          </section>

          <section className="detail-features">
            <h2>Key Benefits</h2>
            <div className="detail-feature-grid">
              {features.map((feature, index) => (
                <article key={feature} className="detail-feature-card">
                  <span className="detail-feature-number">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{feature}</h3>
                  <p>매일 사용하기 좋은 {categoryLabel} 케어 포인트입니다.</p>
                </article>
              ))}
            </div>
          </section>

          <section className="detail-how-to">
            <h2>How To Use</h2>
            <ol>
              <li>적당량을 덜어 손바닥에 올립니다.</li>
              <li>피부결을 따라 부드럽게 펴 발라줍니다.</li>
              <li>흡수시킨 후 다음 스킨케어 단계로 넘어갑니다.</li>
            </ol>
          </section>

          <section className="detail-info">
            <h2>Product Info</h2>
            <dl className="detail-info-list">
              <div>
                <dt>SKU</dt>
                <dd>{product.sku}</dd>
              </div>
              <div>
                <dt>카테고리</dt>
                <dd>{categoryLabel}</dd>
              </div>
              <div>
                <dt>판매가</dt>
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
                <button type="button" onClick={decreaseQuantity} aria-label="수량 감소">
                  −
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={increaseQuantity} aria-label="수량 증가">
                  +
                </button>
              </div>
              <span className="detail-line-price">{formatPrice(product.price)}</span>
            </div>

            <div className="detail-total-row">
              <span>총 상품금액({quantity}개)</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>

            <div className="detail-action-row">
              <button
                type="button"
                className="detail-buy-button"
                onClick={handleBuyNow}
                disabled={isBuying}
              >
                {isBuying ? '이동 중...' : '구매하기'}
              </button>
              <button
                type="button"
                className="detail-cart-button"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? '담는 중...' : '장바구니'}
              </button>
              <button
                type="button"
                className="detail-wish-button"
                onClick={() => handleDemoAction('찜하기')}
                aria-label="찜하기"
              >
                ♡
              </button>
            </div>

            <button
              type="button"
              className="detail-npay-button"
              onClick={() => handleDemoAction('N pay')}
            >
              N pay 구매
            </button>
            <button
              type="button"
              className="detail-kakao-button"
              onClick={() => handleDemoAction('간편구매')}
            >
              톡 간편구매
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
