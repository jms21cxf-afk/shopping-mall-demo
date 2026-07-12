import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { checkSku, getProduct, updateProduct } from '@/api/client'
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload'
import { getStoredUser } from '@/utils/auth'
import './ProductCreate.css'

const CATEGORIES = [
  { value: 'cleansing', label: '클렌징' },
  { value: 'toner', label: '토너' },
  { value: 'essence', label: '에센스' },
  { value: 'cream', label: '크림' },
  { value: 'suncare', label: '선케어' },
]

function FieldLabel({ children, required = false }) {
  return (
    <span className="product-create-label">
      {children}
      {required && <span className="required-mark">*</span>}
    </span>
  )
}

const VALIDATION_ERRORS = [
  '필수 항목을 모두 입력해 주세요.',
  'SKU 중복 확인을 해주세요.',
  '가격은 0 이상의 숫자로 입력해 주세요.',
]

function ProductEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getStoredUser()
  const isAdmin = user?.userType === 'admin'
  const [originalSku, setOriginalSku] = useState('')
  const [form, setForm] = useState({
    sku: '',
    name: '',
    price: '',
    category: '',
    image: '',
    description: '',
  })
  const [skuStatus, setSkuStatus] = useState({
    checked: false,
    available: false,
    message: '',
  })
  const [isCheckingSku, setIsCheckingSku] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isProductLoaded, setIsProductLoaded] = useState(false)

  const { openUploadWidget, isReady, loadError } = useCloudinaryUpload({
    onSuccess: (imageUrl) => {
      setForm((prev) => ({ ...prev, image: imageUrl }))
    },
  })

  useEffect(() => {
    if (!VALIDATION_ERRORS.includes(error)) return

    const sku = form.sku.trim()
    const name = form.name.trim()
    const price = Number(form.price)

    if (!sku || !name || !form.price || !form.category || !form.image) return
    if (!skuStatus.checked || !skuStatus.available) return
    if (Number.isNaN(price) || price < 0) return

    setError('')
  }, [form, skuStatus, error])

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false)
      return undefined
    }

    let cancelled = false

    setIsLoading(true)
    setIsProductLoaded(false)

    getProduct(id)
      .then((product) => {
        if (cancelled) return

        setOriginalSku(product.sku)
        setForm({
          sku: product.sku,
          name: product.name,
          price: String(product.price),
          category: product.category,
          image: product.image,
          description: product.description || '',
        })
        setSkuStatus({
          checked: true,
          available: true,
          message: '현재 SKU입니다.',
        })
        setError('')
        setIsProductLoaded(true)
      })
      .catch((fetchError) => {
        if (cancelled) return

        setError(fetchError.message || '상품 정보를 불러오지 못했습니다.')
        setIsProductLoaded(false)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, isAdmin])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.userType !== 'admin') {
    return <Navigate to="/" replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    const nextValue = name === 'sku' ? value.toUpperCase() : value
    setForm((prev) => ({ ...prev, [name]: nextValue }))

    if (name === 'sku') {
      if (nextValue === originalSku) {
        setSkuStatus({
          checked: true,
          available: true,
          message: '현재 SKU입니다.',
        })
      } else {
        setSkuStatus({
          checked: false,
          available: false,
          message: '',
        })
      }
    }
  }

  const handleCheckSku = async () => {
    const sku = form.sku.trim()

    if (!sku) {
      setSkuStatus({
        checked: false,
        available: false,
        message: 'SKU를 입력해 주세요.',
      })
      return
    }

    if (sku === originalSku) {
      setSkuStatus({
        checked: true,
        available: true,
        message: '현재 SKU입니다.',
      })
      return
    }

    setIsCheckingSku(true)
    setSkuStatus({ checked: false, available: false, message: '' })

    try {
      const result = await checkSku(sku)

      if (result.available) {
        setSkuStatus({
          checked: true,
          available: true,
          message: '사용 가능한 SKU입니다.',
        })
      } else {
        setSkuStatus({
          checked: true,
          available: false,
          message: '이미 사용 중인 SKU입니다.',
        })
      }
    } catch (checkError) {
      setSkuStatus({
        checked: false,
        available: false,
        message: checkError.message || '중복 확인에 실패했습니다.',
      })
    } finally {
      setIsCheckingSku(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const sku = form.sku.trim()
    const name = form.name.trim()
    const price = Number(form.price)

    if (!sku || !name || !form.price || !form.category || !form.image) {
      setError('필수 항목을 모두 입력해 주세요.')
      return
    }

    if (!skuStatus.checked || !skuStatus.available) {
      setError('SKU 중복 확인을 해주세요.')
      return
    }

    if (Number.isNaN(price) || price < 0) {
      setError('가격은 0 이상의 숫자로 입력해 주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      await updateProduct(id, {
        sku,
        name,
        price,
        category: form.category,
        image: form.image,
        description: form.description.trim() || undefined,
      })

      setSuccessMessage('상품이 수정되었습니다.')
      setTimeout(() => {
        navigate('/admin/products')
      }, 800)
    } catch (submitError) {
      setError(submitError.message || '상품 수정에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="product-create-page">
        <div className="product-create-card">
          <p className="product-create-header">불러오는 중...</p>
        </div>
      </main>
    )
  }

  if (error && !isProductLoaded) {
    return (
      <main className="product-create-page">
        <div className="product-create-card">
          <p className="form-error">{error}</p>
          <p className="product-create-footer">
            <Link to="/admin/products">상품 관리로 돌아가기</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="product-create-page">
      <div className="product-create-card">
        <header className="product-create-header">
          <p className="product-create-brand">Shopping Mall Demo</p>
          <h1>상품 수정</h1>
          <p>상품 정보를 수정해 주세요.</p>
        </header>

        {isProductLoaded && (
          <form className="product-create-form" onSubmit={handleSubmit}>
            <p className="required-notice">
              <span className="required-mark">*</span> 표시는 필수 입력 항목입니다.
            </p>

            <div className="product-create-field">
              <FieldLabel required>SKU</FieldLabel>
              <div className="sku-row">
                <input
                  type="text"
                  name="sku"
                  placeholder="예: BOJ-001"
                  value={form.sku}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="check-button"
                  onClick={handleCheckSku}
                  disabled={isCheckingSku}
                >
                  {isCheckingSku ? '확인 중...' : '중복확인'}
                </button>
              </div>
              {skuStatus.message && (
                <small
                  className={
                    skuStatus.available ? 'field-message success' : 'field-message error'
                  }
                >
                  {skuStatus.message}
                </small>
              )}
            </div>

            <label className="product-create-field">
              <FieldLabel required>상품명</FieldLabel>
              <input
                type="text"
                name="name"
                placeholder="상품명을 입력하세요"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>

            <label className="product-create-field">
              <FieldLabel required>가격</FieldLabel>
              <input
                type="number"
                name="price"
                placeholder="0"
                min="0"
                step="1"
                value={form.price}
                onChange={handleChange}
                required
              />
            </label>

            <label className="product-create-field">
              <FieldLabel required>카테고리</FieldLabel>
              <select name="category" value={form.category} onChange={handleChange} required>
                <option value="">카테고리를 선택하세요</option>
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="product-create-field">
              <FieldLabel required>상품 이미지</FieldLabel>
              <div className="image-upload">
                {form.image ? (
                  <div className="image-preview">
                    <img src={form.image} alt="상품 미리보기" />
                  </div>
                ) : (
                  <div className="image-upload-placeholder">
                    <p>업로드된 이미지가 없습니다.</p>
                  </div>
                )}
                <div className="image-upload-actions">
                  <button
                    type="button"
                    className="upload-button"
                    onClick={openUploadWidget}
                    disabled={!isReady}
                  >
                    {form.image ? '이미지 변경' : '이미지 업로드'}
                  </button>
                  {form.image && (
                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={() => setForm((prev) => ({ ...prev, image: '' }))}
                    >
                      이미지 제거
                    </button>
                  )}
                </div>
                {loadError && <small className="field-message error">{loadError}</small>}
              </div>
            </div>

            <label className="product-create-field">
              <FieldLabel>상품 설명</FieldLabel>
              <textarea
                name="description"
                placeholder="상품 설명을 입력하세요 (선택)"
                rows={4}
                value={form.description}
                onChange={handleChange}
              />
            </label>

            {error && <p className="form-error">{error}</p>}
            {successMessage && <p className="form-success">{successMessage}</p>}

            <div className="form-actions">
              <button type="submit" className="submit-button" disabled={isSubmitting}>
                {isSubmitting ? '수정 중...' : '상품 수정'}
              </button>
              <Link to="/admin/products" className="cancel-link">
                취소
              </Link>
            </div>
          </form>
        )}

        <p className="product-create-footer">
          <Link to="/admin/products">상품 관리로 돌아가기</Link>
        </p>
      </div>
    </main>
  )
}

export default ProductEdit
