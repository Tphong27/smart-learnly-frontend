import { z } from 'zod'

const slugRule = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const courseSchema = z.object({
  categoryId: z.string({ message: 'Category is required' }).uuid('Category is invalid'),
  title: z
    .string({ message: 'Course title is required' })
    .trim()
    .min(1, 'Course title is required')
    .max(255, 'Course title must be at most 255 characters'),
  slug: z
    .string()
    .trim()
    .max(280, 'Slug must be at most 280 characters')
    .regex(slugRule, 'Slug may only contain lowercase letters, digits, and dashes')
    .or(z.literal(''))
    .optional(),
  shortDescription: z.string().max(500, 'Short description must be at most 500 characters').or(z.literal('')).optional(),
  description: z.string().or(z.literal('')).optional(),
  outcomes: z.string().or(z.literal('')).optional(),
  requirements: z.string().or(z.literal('')).optional(),
  language: z.string().max(50, 'Language must be at most 50 characters').or(z.literal('')).optional(),
  level: z.string().max(30, 'Level must be at most 30 characters').or(z.literal('')).optional(),
  thumbnailUrl: z
    .string()
    .max(500, 'Thumbnail URL must be at most 500 characters')
    .url('Thumbnail URL is invalid')
    .or(z.literal(''))
    .optional(),
  price: z.coerce.number().min(0, 'Price must be >= 0').optional(),
  discountedPrice: z.coerce.number().min(0, 'Discounted price must be >= 0').optional(),
  isFree: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'inactive']).optional(),
})
