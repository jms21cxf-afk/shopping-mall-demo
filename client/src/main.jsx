import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { router } from '@/router.jsx'
import { applyGeoMockFromUrl } from '@/utils/geoMock'
import './index.css'

applyGeoMockFromUrl()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <RouterProvider router={router} />
    </LanguageProvider>
  </StrictMode>,
)
