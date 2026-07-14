import { createBrowserRouter, Navigate } from 'react-router-dom'
import Main from '@/pages/Main'
import Login from '@/pages/Login'
import KakaoCallback from '@/pages/KakaoCallback'
import GoogleCallback from '@/pages/GoogleCallback'
import Signup from '@/pages/Signup'
import Admin from '@/pages/admin/Admin'
import Users from '@/pages/admin/Users'
import ProductCreate from '@/pages/admin/ProductCreate'
import ProductEdit from '@/pages/admin/ProductEdit'
import Products from '@/pages/admin/Products'
import ProductDetail from '@/pages/ProductDetail'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import Orders from '@/pages/Orders'
import OrderDetail from '@/pages/OrderDetail'
import AdminOrders from '@/pages/admin/AdminOrders'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Main />,
  },
  {
    path: '/products/:id',
    element: <ProductDetail />,
  },
  {
    path: '/cart',
    element: <Cart />,
  },
  {
    path: '/checkout',
    element: <Checkout />,
  },
  {
    path: '/orders',
    element: <Orders />,
  },
  {
    path: '/orders/:id',
    element: <OrderDetail />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/auth/kakao/callback',
    element: <KakaoCallback />,
  },
  {
    path: '/auth/google/callback',
    element: <GoogleCallback />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/admin',
    element: <Admin />,
  },
  {
    path: '/users',
    element: <Users />,
  },
  {
    path: '/admin/products/new',
    element: <ProductCreate />,
  },
  {
    path: '/admin/products/:id/edit',
    element: <ProductEdit />,
  },
  {
    path: '/admin/products',
    element: <Products />,
  },
  {
    path: '/admin/orders',
    element: <AdminOrders />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
