import { z } from 'zod'

const email = z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ')
const strongPassword = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(100, 'Mật khẩu không được vượt quá 100 ký tự')
  .regex(/[a-z]/, 'Mật khẩu cần có chữ thường')
  .regex(/[A-Z]/, 'Mật khẩu cần có chữ hoa')
  .regex(/\d/, 'Mật khẩu cần có chữ số')
  .regex(/[^A-Za-z\d]/, 'Mật khẩu cần có ký tự đặc biệt')

const matchingPasswords = (schema, passwordField, confirmField) =>
  schema.refine((values) => values[passwordField] === values[confirmField], {
    path: [confirmField],
    message: 'Mật khẩu xác nhận không khớp',
  })

export const loginSchema = z.object({ email, password: z.string().min(1, 'Vui lòng nhập mật khẩu') })

export const registerSchema = matchingPasswords(
  z.object({
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(150),
    email,
    password: strongPassword,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  }),
  'password',
  'confirmPassword',
)

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = matchingPasswords(
  z.object({
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  }),
  'newPassword',
  'confirmPassword',
)

export const changePasswordSchema = matchingPasswords(
  z.object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  }),
  'newPassword',
  'confirmPassword',
)

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ tên không được để trống').max(150),
  avatarUrl: z.string().max(2048),
  phoneNumber: z.union([
    z.literal(''),
    z.string().regex(/^\+?[0-9]{9,15}$/, 'Số điện thoại không hợp lệ'),
  ]),
  bio: z.string().max(1000, 'Giới thiệu không được vượt quá 1000 ký tự'),
})
