import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getUsers } from '@/api/client'
import { getStoredUser } from '@/utils/auth'
import './Users.css'

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

function Users() {
  const user = getStoredUser()
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const isAdmin = user?.userType === 'admin'

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false)
      return
    }

    getUsers()
      .then((data) => {
        setUsers(data)
        setError('')
      })
      .catch((fetchError) => {
        setError(fetchError.message || '회원 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isAdmin])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="users-page">
      <div className="users-card">
        <header className="users-header">
          <h1>회원 목록</h1>
          <p>서버에 저장된 회원 정보입니다.</p>
        </header>

        {isLoading && <p className="users-status">불러오는 중...</p>}
        {error && <p className="users-error">{error}</p>}

        {!isLoading && !error && users.length === 0 && (
          <p className="users-status">등록된 회원이 없습니다.</p>
        )}

        {!isLoading && !error && users.length > 0 && (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>이메일</th>
                  <th>이름</th>
                  <th>유저타입</th>
                  <th>전화번호</th>
                  <th>생성날짜</th>
                  <th>수정날짜</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.email || '-'}</td>
                    <td>{user.name || '-'}</td>
                    <td>{user.userType || '-'}</td>
                    <td>{user.phone || '-'}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>{formatDate(user.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="users-footer">
          <Link to="/admin">어드민 대시보드로 돌아가기</Link>
        </p>
      </div>
    </main>
  )
}

export default Users
