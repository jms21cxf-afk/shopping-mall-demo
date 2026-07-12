import { useEffect, useRef, useState } from 'react'
import { getCloudinaryConfig, loadCloudinaryWidget } from '@/utils/cloudinary'

export function useCloudinaryUpload({ onSuccess }) {
  const widgetRef = useRef(null)
  const onSuccessRef = useRef(onSuccess)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState('')

  onSuccessRef.current = onSuccess

  useEffect(() => {
    const config = getCloudinaryConfig()

    if (!config) {
      setLoadError(
        'Cloudinary 설정이 없습니다. client/.env에 VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET을 추가해 주세요.',
      )
      return undefined
    }

    let widget = null

    loadCloudinaryWidget()
      .then((cloudinary) => {
        widget = cloudinary.createUploadWidget(
          {
            cloudName: config.cloudName,
            uploadPreset: config.uploadPreset,
            sources: ['local', 'url'],
            multiple: false,
            maxFiles: 1,
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          },
          (error, result) => {
            if (error) {
              setLoadError(error.message || '이미지 업로드에 실패했습니다.')
              return
            }

            if (result?.event === 'success') {
              setLoadError('')
              onSuccessRef.current?.(result.info.secure_url)
            }
          },
        )
        widgetRef.current = widget
        setIsReady(true)
      })
      .catch((err) => {
        setLoadError(err.message || 'Cloudinary 위젯을 불러오지 못했습니다.')
      })

    return () => {
      widget?.destroy()
    }
  }, [])

  const openUploadWidget = () => {
    widgetRef.current?.open()
  }

  return { openUploadWidget, isReady, loadError }
}
