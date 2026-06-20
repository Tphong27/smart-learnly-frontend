import apiClient from './api-client'
import { cartPriceCacheService } from './cart-price-cache.service'

function unwrap(response) {
  return response?.data ?? response
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

function pickMoney(item, cachedItem) {
  return (
    item?.finalAmount ??
    item?.discountedPrice ??
    item?.discountPrice ??
    item?.discountAmount ??
    item?.amount ??
    item?.totalAmount ??
    item?.price ??
    item?.unitPrice ??
    item?.coursePrice ??
    item?.course?.finalAmount ??
    item?.course?.discountedPrice ??
    item?.course?.discountPrice ??
    item?.course?.discountAmount ??
    item?.course?.amount ??
    item?.course?.price ??
    item?.course?.unitPrice ??
    cachedItem?.finalAmount ??
    cachedItem?.price ??
    cachedItem?.unitPrice ??
    0
  )
}

function normalizeCartItem(item) {
  const courseId = item?.courseId ?? item?.course?.id
  const cachedItem = cartPriceCacheService.getByCourseId(courseId)
  const amount = toNumber(pickMoney(item, cachedItem), 0)

  return {
    ...item,

    id: item?.id ?? item?.cartItemId,

    courseId,
    classId: item?.classId ?? item?.class?.id ?? null,

    courseTitle:
      item?.courseTitle ??
      item?.itemTitle ??
      item?.title ??
      item?.course?.title ??
      item?.course?.name ??
      cachedItem?.courseTitle ??
      'Course',

    className:
      item?.className ??
      item?.classTitle ??
      item?.class?.className ??
      item?.class?.title ??
      null,

    courseCode:
      item?.courseCode ??
      item?.course?.code ??
      item?.course?.slug ??
      cachedItem?.courseCode ??
      null,

    finalAmount: amount,
    unitPrice: toNumber(item?.unitPrice ?? cachedItem?.unitPrice ?? amount, amount),
    price: amount,

    currency:
      item?.currency ??
      item?.course?.currency ??
      cachedItem?.currency ??
      'VND',
  }
}

function normalizeCart(payload) {
  const data = unwrap(payload)

  const rawItems =
    data?.items ??
    data?.cartItems ??
    data?.content ??
    []

  const items = Array.isArray(rawItems)
    ? rawItems.map(normalizeCartItem)
    : []

  const calculatedTotal = items.reduce(
    (sum, item) => sum + toNumber(item.finalAmount, 0),
    0,
  )

  return {
    id: data?.id ?? data?.cartId ?? null,
    items,
    totalAmount: toNumber(
      data?.totalAmount ?? data?.total ?? calculatedTotal,
      calculatedTotal,
    ),
    currency: data?.currency ?? 'VND',
    updatedAt: data?.updatedAt ?? null,
  }
}

export const cartService = {
  async getCart() {
    const response = await apiClient.get('/cart')
    return normalizeCart(response)
  },

  async addItem({ courseId, classId = null }) {
    const response = await apiClient.post('/cart/items', {
      courseId,
      classId,
    })

    return unwrap(response)
  },

  async removeItem(itemId) {
    const response = await apiClient.delete(`/cart/items/${itemId}`)
    return unwrap(response)
  },
}
