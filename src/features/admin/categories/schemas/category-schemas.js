import { z } from 'zod'

const slugRule = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const categorySchema = z.object({
  name: z
    .string({ message: 'Category name is required' })
    .trim()
    .min(1, 'Category name is required')
    .max(150, 'Category name must be at most 150 characters'),
  slug: z
    .string()
    .trim()
    .max(180, 'Slug must be at most 180 characters')
    .regex(slugRule, 'Slug may only contain lowercase letters, digits, and dashes')
    .or(z.literal(''))
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .or(z.literal(''))
    .optional(),
  parentId: z.string().uuid().or(z.literal('')).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z
    .preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return 0
        if (typeof val === 'number' && Number.isNaN(val)) return 0
        return val
      },
      z
        .number({ message: 'Display order must be a number' })
        .int('Display order must be an integer')
        .min(0, 'Display order cannot be negative'),
    )
    .optional(),
})
