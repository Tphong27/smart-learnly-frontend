export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const numberValue = Number(value)

  if (Number.isNaN(numberValue)) {
    return fallback
  }

  return numberValue
}

function pickFirstNumber(values, fallback = 0) {
  for (const value of values) {
    const numberValue = toNumber(value, null)

    if (numberValue !== null) {
      return numberValue
    }
  }

  return fallback
}

export function formatVnd(value) {
  const amount = toNumber(value, 0)

  if (amount <= 0) {
    return 'Free'
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getOriginalPrice(course) {
  return pickFirstNumber(
    [
      course?.originalPrice,
      course?.basePrice,
      course?.regularPrice,
      course?.listPrice,
      course?.priceBeforeDiscount,
      course?.pricing?.originalPrice,
      course?.pricing?.basePrice,
      course?.priceInfo?.originalPrice,
      course?.course?.originalPrice,
      course?.course?.basePrice,
      course?.course?.price,
      course?.price,
    ],
    0,
  )
}

function getExplicitDiscountPrice(course) {
  return pickFirstNumber(
    [
      course?.discountedPrice,
      course?.discountPrice,
      course?.salePrice,
      course?.finalPrice,
      course?.finalAmount,
      course?.amount,
      course?.payableAmount,
      course?.pricing?.discountedPrice,
      course?.pricing?.discountPrice,
      course?.pricing?.salePrice,
      course?.pricing?.finalPrice,
      course?.pricing?.finalAmount,
      course?.pricing?.amount,
      course?.priceInfo?.discountedPrice,
      course?.priceInfo?.discountPrice,
      course?.priceInfo?.salePrice,
      course?.priceInfo?.finalPrice,
      course?.priceInfo?.finalAmount,
      course?.priceInfo?.amount,
      course?.discount?.discountedPrice,
      course?.discount?.discountPrice,
      course?.discount?.salePrice,
      course?.discount?.finalPrice,
      course?.discount?.finalAmount,
      course?.discount?.amount,
      course?.course?.discountedPrice,
      course?.course?.discountPrice,
      course?.course?.salePrice,
      course?.course?.finalPrice,
      course?.course?.finalAmount,
      course?.course?.amount,
    ],
    0,
  )
}

function getDiscountRate(course) {
  const rawRate = pickFirstNumber(
    [
      course?.discountPercent,
      course?.discountPercentage,
      course?.discountRate,
      course?.pricing?.discountPercent,
      course?.pricing?.discountPercentage,
      course?.pricing?.discountRate,
      course?.priceInfo?.discountPercent,
      course?.priceInfo?.discountPercentage,
      course?.priceInfo?.discountRate,
      course?.discount?.percent,
      course?.discount?.percentage,
      course?.discount?.rate,
      course?.discount?.value,
      course?.course?.discountPercent,
      course?.course?.discountPercentage,
      course?.course?.discountRate,
    ],
    0,
  )

  if (rawRate <= 0) {
    return 0
  }

  return rawRate > 0 && rawRate <= 1 ? rawRate * 100 : rawRate
}

export function getDiscountPrice(course) {
  const originalPrice = getOriginalPrice(course)
  const explicitDiscountPrice = getExplicitDiscountPrice(course)

  if (
    originalPrice > 0 &&
    explicitDiscountPrice > 0 &&
    explicitDiscountPrice < originalPrice
  ) {
    return explicitDiscountPrice
  }

  const discountRate = getDiscountRate(course)

  if (originalPrice > 0 && discountRate > 0 && discountRate < 100) {
    return Math.round(originalPrice * (1 - discountRate / 100))
  }

  return 0
}

export function hasValidDiscount(course) {
  const originalPrice = getOriginalPrice(course)
  const discountPrice = getDiscountPrice(course)

  return originalPrice > 0 && discountPrice > 0 && discountPrice < originalPrice
}

export function getDisplayPrice(course) {
  if (hasValidDiscount(course)) {
    return getDiscountPrice(course)
  }

  return getOriginalPrice(course)
}

export function getDiscountPercent(course) {
  const explicitRate = getDiscountRate(course)

  if (explicitRate > 0) {
    return Math.round(explicitRate)
  }

  if (!hasValidDiscount(course)) {
    return 0
  }

  const originalPrice = getOriginalPrice(course)
  const discountPrice = getDiscountPrice(course)

  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
}
