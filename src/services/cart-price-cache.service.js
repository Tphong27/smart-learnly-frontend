const CART_PRICE_CACHE_KEY = 'smartLearnly.cartPriceCache'

function readCache() {
  try {
    const raw = localStorage.getItem(CART_PRICE_CACHE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCache(cache) {
  localStorage.setItem(CART_PRICE_CACHE_KEY, JSON.stringify(cache))
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const numberValue = Number(value)

  if (Number.isNaN(numberValue)) {
    return fallback
  }

  return numberValue
}

function getCoursePrice(course) {
  return toNumber(
    course?.discountedPrice ??
      course?.discountPrice ??
      course?.discountAmount ??
      course?.amount ??
      course?.finalAmount ??
      course?.finalPrice ??
      course?.salePrice ??
      course?.price,
    0,
  )
}

export const cartPriceCacheService = {
  saveCourse(course) {
    if (!course?.id) return

    const cache = readCache()

    const amount = getCoursePrice(course)

    cache[course.id] = {
      courseId: course.id,
      courseTitle: course.title ?? course.name ?? 'Course',
      courseCode: course.code ?? course.slug ?? null,
      unitPrice: toNumber(course.price, amount),
      finalAmount: amount,
      price: amount,
      currency: course.currency ?? 'VND',
      savedAt: new Date().toISOString(),
    }

    writeCache(cache)
  },

  getByCourseId(courseId) {
    if (!courseId) return null

    const cache = readCache()
    return cache[courseId] ?? null
  },

  removeCourse(courseId) {
    if (!courseId) return

    const cache = readCache()
    delete cache[courseId]
    writeCache(cache)
  },
}
