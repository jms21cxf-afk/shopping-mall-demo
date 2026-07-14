export function getOrderFilters(t) {
  return [
    { id: 'all', label: t('orderFilterAll') },
    { id: 'processing', label: t('orderFilterProcessing') },
    { id: 'shipping', label: t('orderFilterShipping') },
    { id: 'completed', label: t('orderFilterCompleted') },
    { id: 'cancelled', label: t('orderFilterCancelled') },
  ]
}

export function getDisplayOrderStatus(status, t) {
  if (['pending', 'paid', 'preparing', 'shipping_started'].includes(status)) {
    return { label: t('orderDisplayProcessing'), tone: 'processing' }
  }
  if (status === 'shipped') {
    return { label: t('orderDisplayShipping'), tone: 'shipping' }
  }
  if (status === 'delivered') {
    return { label: t('orderDisplayCompleted'), tone: 'completed' }
  }
  if (status === 'cancelled') {
    return { label: t('orderDisplayCancelled'), tone: 'cancelled' }
  }
  return { label: status, tone: 'processing' }
}

export function getOrderStatusLabel(status, t) {
  const key = `orderStatus_${status}`
  const label = t(key)
  return label === key ? status : label
}

export function getPaymentMethodLabel(method, t) {
  const key = `paymentMethod_${method}`
  const label = t(key)
  return label === key ? method : label
}

export function getCategoryLabel(category, t) {
  const key = `category${category.charAt(0).toUpperCase()}${category.slice(1)}`
  const mapped = {
    cleansing: 'categoryCleansing',
    toner: 'categoryToner',
    essence: 'categoryEssence',
    cream: 'categoryCream',
    suncare: 'categorySuncare',
  }
  const translationKey = mapped[category] || key
  const label = t(translationKey)
  return label === translationKey ? category : label
}

export function getCategoryFeatures(category, t) {
  const key = `features_${category}`
  const text = t(key)
  return text === key ? t('features_essence').split('|') : text.split('|')
}
