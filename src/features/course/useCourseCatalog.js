import { useMemo, useState } from 'react'
import { demoCourses } from '@/data/demo'

const DEFAULT_FILTERS = {
  keyword: '',
  category: 'All categories',
  level: 'All levels',
  status: 'published',
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function getUniqueOptions(courses, field, defaultLabel) {
  const options = courses
    .map((course) => course[field])
    .filter(Boolean)

  return [defaultLabel, ...new Set(options)]
}

function formatCurrency(value, currency = 'VND') {
  if (!value) return 'Free'

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
  }).format(value)
}

function mapCourseToCatalogItem(course, index) {
  const accentList = ['blue', 'violet', 'teal']

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    category: course.category,
    level: course.level,
    status: course.status,
    price: course.price,
    currency: course.currency,
    priceLabel: formatCurrency(course.price, course.currency),
    duration: course.duration,
    lessons: course.lessonCount || course.lessons || 0,
    modules: course.moduleCount || course.modules || 0,
    enrolledCount: course.enrolledCount || 0,
    rating: course.rating,
    description: course.shortDescription,
    outcomes: course.outcomes || [],
    owner: course.owner,
    updatedAt: course.updatedAt,
    accent: accentList[index % accentList.length],
  }
}

function matchKeyword(course, keyword) {
  const normalizedKeyword = normalize(keyword)

  if (!normalizedKeyword) return true

  const searchableText = [
    course.title,
    course.description,
    course.category,
    course.level,
    course.owner,
    course.duration,
    course.priceLabel,
    ...course.outcomes,
  ]
    .join(' ')
    .toLowerCase()

  return searchableText.includes(normalizedKeyword)
}

function matchFilters(course, filters) {
  const matchCategory =
    filters.category === 'All categories' ||
    course.category === filters.category

  const matchLevel =
    filters.level === 'All levels' ||
    course.level === filters.level

  const matchStatus =
    filters.status === 'All statuses' ||
    course.status === filters.status

  return (
    matchKeyword(course, filters.keyword) &&
    matchCategory &&
    matchLevel &&
    matchStatus
  )
}

export function useCourseCatalog() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedCourse, setSelectedCourse] = useState(null)

  const catalogCourses = useMemo(() => {
    return demoCourses.map(mapCourseToCatalogItem)
  }, [])

  const categories = useMemo(() => {
    return getUniqueOptions(catalogCourses, 'category', 'All categories')
  }, [catalogCourses])

  const levels = useMemo(() => {
    return getUniqueOptions(catalogCourses, 'level', 'All levels')
  }, [catalogCourses])

  const statuses = useMemo(() => {
    return ['published', 'draft'].some((status) =>
      catalogCourses.some((course) => course.status === status),
    )
      ? ['published', 'All statuses', 'draft']
      : ['All statuses']
  }, [catalogCourses])

  const filteredCourses = useMemo(() => {
    return catalogCourses.filter((course) => matchFilters(course, filters))
  }, [catalogCourses, filters])

  const updateFilter = (name, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }))
  }

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  return {
    courses: filteredCourses,
    totalCourses: catalogCourses.length,
    filters,
    categories,
    levels,
    statuses,
    selectedCourse,
    updateFilter,
    resetFilters,
    selectCourse: setSelectedCourse,
    closeCourseDetail: () => setSelectedCourse(null),
  }
}