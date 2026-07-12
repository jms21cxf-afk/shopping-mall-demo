import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { deleteProduct, getProducts } from '@/api/client'
import { getStoredUser } from '@/utils/auth'
import './Products.css'

const PAGE_SIZE = 2

const CATEGORY_LABELS = {
  cleansing: '클렌징',
  toner: '토너',
  essence: '에센스',
  cream: '크림',
  suncare: '선케어',
}

function formatDate(dateString) {
  if (!dateString) return '-'

  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`
}

function Products() {
  const user = getStoredUser()
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const isAdmin = user?.userType === 'admin'

  const loadProducts = useCallback(async (page) => {
    setIsLoading(true)

    try {
      const data = await getProducts(undefined, { page, limit: PAGE_SIZE })
      setProducts(data.products)
      setPagination(data.pagination)
      setCurrentPage(data.pagination.page)
      setError('')
    } catch (fetchError) {
      setError(fetchError.message || '상품 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false)
      return
    }

    loadProducts(currentPage)
  }, [isAdmin, currentPage, loadProducts])

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`"${product.name}" 상품을 삭제하시겠습니까?`)

    if (!confirmed) return

    setDeletingId(product._id)
    setError('')

    try {
      await deleteProduct(product._id)

      const isLastItemOnPage = products.length === 1 && currentPage > 1
      const nextPage = isLastItemOnPage ? currentPage - 1 : currentPage

      if (isLastItemOnPage) {
        setCurrentPage(nextPage)
      } else {
        await loadProducts(currentPage)
      }
    } catch (deleteError) {
      setError(deleteError.message || '상품 삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages || page === currentPage) return
    setCurrentPage(page)
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="products-page">
      <div className="products-card">
        <header className="products-header">
          <h1>상품 관리</h1>
          <p>등록된 상품을 조회하고 수정, 삭제할 수 있습니다. (페이지당 {PAGE_SIZE}개)</p>
          <Link to="/admin/products/new" className="products-add-link">
            + 새 상품 등록
          </Link>
        </header>

        {isLoading && <p className="products-status">불러오는 중...</p>}
        {error && <p className="products-error">{error}</p>}

        {!isLoading && !error && pagination.total === 0 && (
          <p className="products-status">등록된 상품이 없습니다.</p>
        )}

        {!isLoading && !error && products.length > 0 && (
          <>
            <div className="products-table-wrap">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>이미지</th>
                    <th>SKU</th>
                    <th>상품명</th>
                    <th>가격</th>
                    <th>카테고리</th>
                    <th>등록일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <img
                          src={product.image}
                          alt={product.name}
                          className="products-thumb"
                        />
                      </td>
                      <td>{product.sku}</td>
                      <td className="products-name">{product.name}</td>
                      <td>{formatPrice(product.price)}</td>
                      <td>{CATEGORY_LABELS[product.category] || product.category}</td>
                      <td>{formatDate(product.createdAt)}</td>
                      <td>
                        <div className="products-actions">
                          <Link
                            to={`/admin/products/${product._id}/edit`}
                            className="products-edit-button"
                          >
                            수정
                          </Link>
                          <button
                            type="button"
                            className="products-delete-button"
                            onClick={() => handleDelete(product)}
                            disabled={deletingId === product._id}
                          >
                            {deletingId === product._id ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <nav className="products-pagination" aria-label="상품 목록 페이지">
                <button
                  type="button"
                  className="products-page-button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  이전
                </button>
                <div className="products-page-numbers">
                  {Array.from({ length: pagination.totalPages }, (_, index) => {
                    const page = index + 1
                    return (
                      <button
                        key={page}
                        type="button"
                        className={
                          page === currentPage
                            ? 'products-page-number is-active'
                            : 'products-page-number'
                        }
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  className="products-page-button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                >
                  다음
                </button>
              </nav>
            )}
          </>
        )}

        <p className="products-footer">
          <Link to="/admin">어드민 대시보드로 돌아가기</Link>
        </p>
      </div>
    </main>
  )
}

export default Products
