const SCRIPT_URL = 'https://upload-widget.cloudinary.com/global/all.js'

let scriptPromise = null

export function loadCloudinaryWidget() {
  if (window.cloudinary) {
    return Promise.resolve(window.cloudinary)
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.onload = () => {
        if (window.cloudinary) {
          resolve(window.cloudinary)
        } else {
          reject(new Error('Cloudinary widget failed to load'))
        }
      }
      script.onerror = () => reject(new Error('Cloudinary widget script failed to load'))
      document.body.appendChild(script)
    })
  }

  return scriptPromise
}

export function getCloudinaryConfig() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    return null
  }

  return { cloudName, uploadPreset }
}
