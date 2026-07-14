import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getBestSellerProducts, getCart, getProducts } from '@/api/client'
import { translate } from '@/i18n/translations'
import { useLanguage } from '@/i18n/LanguageContext'
import GlobalLanguageControls from '@/components/GlobalLanguageControls'
import { clearAuth, getStoredUser, isLoggedIn } from '@/utils/auth'
import { getCartItemCount } from '@/utils/cart'
import './Main.css'

function CartIcon() {
  // 상단 네비게이션에 표시할 장바구니 SVG 아이콘
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-cart-icon">
      <path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6 6h15l-1.5 9H8L6 3H2" />
    </svg>
  )
}

const NAV_LEFT = [
  { key: 'navShop', value: 'Shop' },
  { key: 'navBrand', value: 'Brand' },
  { key: 'navCollection', value: 'Collection' },
  { key: 'navEvent', value: 'Event' },
]
const NAV_SUB = [
  { key: 'navBrandStory', value: 'Brand story' },
  { key: 'navOurStockist', value: 'Our stockist' },
]

const SHOP_CATEGORIES = [
  { value: 'all', labelKey: 'categoryAll' },
  { value: 'cleansing', labelKey: 'categoryCleansing' },
  { value: 'toner', labelKey: 'categoryToner' },
  { value: 'essence', labelKey: 'categoryEssence' },
  { value: 'cream', labelKey: 'categoryCream' },
  { value: 'suncare', labelKey: 'categorySuncare' },
]

function Main() {
  const navigate = useNavigate()
  const { language, t, formatPrice } = useLanguage()
  const [user, setUser] = useState(() => getStoredUser())
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [products, setProducts] = useState([])
  const [bestSellers, setBestSellers] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingBestSellers, setIsLoadingBestSellers] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [bestSellersError, setBestSellersError] = useState('')
  const [cartCount, setCartCount] = useState(0) // 장바구니 배지에 표시할 총 수량
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const isAdmin = user?.userType === 'admin'

  // 로그인한 사용자의 장바구니를 불러와 아이콘 배지 숫자를 갱신합니다.
  useEffect(() => {
    if (!isLoggedIn()) {
      setCartCount(0)
      return
    }

    getCart()
      .then((cart) => {
        setCartCount(getCartItemCount(cart))
      })
      .catch(() => {
        setCartCount(0)
      })
  }, [user])

  // 사용자 메뉴 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!isUserMenuOpen) return

    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isUserMenuOpen])

  // 메인 BEST SELLERS: 주문 수량 기준 상위 상품 (주문 없으면 최신 상품)
  useEffect(() => {
    setIsLoadingBestSellers(true)
    setBestSellersError('')

    getBestSellerProducts(3)
      .then((data) => {
        setBestSellers(data)
      })
      .catch((error) => {
        setBestSellersError(error.message || translate(language, 'loadBestSellersError'))
        setBestSellers([])
      })
      .finally(() => {
        setIsLoadingBestSellers(false)
      })
  }, [])

  // Shop 메뉴가 열릴 때 선택한 카테고리에 맞는 상품 목록을 API에서 가져옵니다.
  useEffect(() => {
    if (!isShopOpen) return

    setIsLoadingProducts(true)
    setProductsError('')

    const category = selectedCategory === 'all' ? undefined : selectedCategory

    getProducts(category)
      .then((data) => {
        setProducts(data)
      })
      .catch((error) => {
        setProductsError(error.message || translate(language, 'loadProductsError'))
        setProducts([])
      })
      .finally(() => {
        setIsLoadingProducts(false)
      })
  }, [isShopOpen, selectedCategory, language])

  const handleLogout = () => {
    clearAuth()
    setUser(null)
    setCartCount(0)
    setIsUserMenuOpen(false)
  }

  const handleCartClick = () => {
    // 비로그인 사용자는 장바구니 대신 로그인 페이지로 이동
    if (!isLoggedIn()) {
      navigate('/login')
      return
    }

    navigate('/cart')
  }

  const handleShopClick = (event) => {
    event.preventDefault()
    setIsShopOpen(true)
    setSelectedCategory('all')
  }

  const handleNavClick = (item, event) => {
    if (item.value === 'Shop') {
      handleShopClick(event)
      return
    }

    event.preventDefault()
    setIsShopOpen(false)
  }

  return (
    <div className="main-page">
      <header className="site-header">
        <nav className="nav-top" aria-label="Primary">
          <ul className="nav-left">
            {NAV_LEFT.map((item) => (
              <li key={item.value}>
                <a
                  href="#"
                  className={item.value === 'Shop' && isShopOpen ? 'is-active' : undefined}
                  onClick={(event) => handleNavClick(item, event)}
                >
                  {t(item.key)}
                </a>
              </li>
            ))}
          </ul>

          <Link to="/" className="nav-logo" onClick={() => setIsShopOpen(false)}>
            Shopping Mall Demo
          </Link>

          <div className="nav-right">
            {/* 장바구니 아이콘: 클릭 시 /cart, cartCount > 0 일 때만 배지 표시 */}
            <button
              type="button"
              className="nav-cart-button"
              onClick={handleCartClick}
              aria-label={t('cartCount', { count: cartCount })}
            >
              <CartIcon />
              {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
            </button>
            <GlobalLanguageControls />
            {user ? (
              <div className="nav-user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  className="nav-user-menu-trigger"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                >
                  {t('welcome', { name: user.name })}
                  <span className="nav-user-menu-chevron" aria-hidden="true">
                    ▾
                  </span>
                </button>
                {isUserMenuOpen && (
                  <div className="nav-user-menu-dropdown" role="menu">
                    <Link
                      to="/orders"
                      className="nav-user-menu-item"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      {t('orders')}
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="nav-user-menu-item"
                        role="menuitem"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {t('admin')}
                      </Link>
                    )}
                    <button
                      type="button"
                      className="nav-user-menu-item nav-user-menu-item--logout"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="nav-link">
                {t('login')}
              </Link>
            )}
            {!user && (
              <Link to="/signup" className="nav-link">
                {t('signup')}
              </Link>
            )}
          </div>
        </nav>

        {isShopOpen ? (
          <nav className="shop-categories" aria-label="Shop categories">
            {SHOP_CATEGORIES.map((category) => (
              <button
                key={category.value}
                type="button"
                className={
                  selectedCategory === category.value
                    ? 'shop-category-button is-active'
                    : 'shop-category-button'
                }
                onClick={() => setSelectedCategory(category.value)}
              >
                {t(category.labelKey)}
              </button>
            ))}
          </nav>
        ) : (
          <nav className="nav-sub" aria-label="Secondary">
            {NAV_SUB.map((item) => (
              <a key={item.value} href="#">
                {t(item.key)}
              </a>
            ))}
          </nav>
        )}
      </header>

      {isShopOpen ? (
        <section className="shop-section">
          {isLoadingProducts && <p className="shop-status">{t('loadingProducts')}</p>}
          {productsError && <p className="shop-error">{productsError}</p>}

          {!isLoadingProducts && !productsError && products.length === 0 && (
            <p className="shop-status">{t('noProducts')}</p>
          )}

          {!isLoadingProducts && !productsError && products.length > 0 && (
            <div className="shop-grid">
              {products.map((product) => (
                <Link key={product._id} to={`/products/${product._id}`} className="shop-card">
                  <div className="shop-card-image-wrap">
                    <span className="shop-wishlist" aria-hidden="true">
                      ♡
                    </span>
                    <img src={product.image} alt={product.name} className="shop-card-image" />
                  </div>
                  <div className="shop-card-info">
                    <h3>{product.name}</h3>
                    <p>{formatPrice(product.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="hero">
            <div className="hero-copy">
              <p className="hero-eyebrow">{t('heroEyebrow')}</p>
              <h1 className="hero-title">
                <span className="hero-title-line">{t('heroTitleLine1')}</span>
                <span className="hero-title-line">{t('heroTitleLine2')}</span>
              </h1>
              <p className="hero-description">{t('heroDescription')}</p>
              <button type="button" className="hero-cta" onClick={handleShopClick}>
                {t('heroCta')}
              </button>
            </div>
            <div className="hero-visual">
              <img
                src="/hero-banner.png"
                alt={t('heroImageAlt')}
                className="hero-image"
              />
            </div>
          </section>

          <section className="promo-strip">
            <p>{t('promoText')}</p>
          </section>

          <section className="product-section">
            <h2>{t('bestSellers')}</h2>
            {isLoadingBestSellers && <p className="product-section-status">{t('loading')}</p>}
            {bestSellersError && <p className="product-section-error">{bestSellersError}</p>}
            {!isLoadingBestSellers && !bestSellersError && bestSellers.length === 0 && (
              <p className="product-section-status">{t('noProducts')}</p>
            )}
            {!isLoadingBestSellers && !bestSellersError && bestSellers.length > 0 && (
              <div className="product-grid">
                {bestSellers.map((product) => (
                  <Link key={product._id} to={`/products/${product._id}`} className="product-card">
                    <div className="product-image">
                      <img src={product.image} alt={product.name} />
                    </div>
                    <h3>{product.name}</h3>
                    <p>{formatPrice(product.price)}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p className="site-footer-brand">Shopping Mall Demo</p>
          <p className="site-footer-text">{t('footerContact')}</p>
          <p className="site-footer-copy">
            {t('footerCopy', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Main
