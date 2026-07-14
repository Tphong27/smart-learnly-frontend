# AI Rule Frontend - Smart Learnly

## Mục tiêu

1. File này là quy tắc bắt buộc khi AI hoặc developer chỉnh sửa frontend Smart Learnly.
2. Luôn ưu tiên code thật, chạy được, không tạo mock tạm để qua build.
3. Luôn bám theo cấu trúc hiện có, không tạo file `enhanced`, `new`, `fixed`, `backup`.
4. Luôn áp dụng YAGNI, KISS, DRY: chỉ làm đúng yêu cầu, không mở rộng scope nếu chưa cần.

## Tech stack

1. Dự án dùng React 19, Vite, React Router, Axios, React Hook Form, Zod, Zustand, lucide-react.
2. Package manager hiện tại là npm.
3. Script chính:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

4. Sau khi sửa code frontend, luôn chạy ít nhất `npm run build`.
5. Nếu sửa ít file, chạy targeted lint cho file đã sửa. Nếu full lint fail do lỗi ngoài scope, phải báo rõ file/lỗi ngoài scope.

## Cấu trúc thư mục

1. Luôn đặt routing, layout, provider trong `src/app`.
2. Luôn đặt feature code trong `src/features/<domain>`.
3. Luôn đặt API service trong `src/services`.
4. Luôn đặt component, util, constant dùng chung trong `src/shared`.
5. Không tạo thư mục mới nếu feature đã có thư mục phù hợp.
6. Không để page gọi API trực tiếp nếu đã có service layer.

Cấu trúc khuyến nghị cho một feature:

```text
src/features/<domain>/
├── components/
├── pages/
├── schemas/
├── utils/
└── index.js
```

## File naming

1. File JS/JSX/CSS mới dùng kebab-case nếu không có convention khác rõ ràng.
2. Component React export theo PascalCase.
3. Service đặt tên `<domain>.service.js`.
4. Schema đặt tên `<domain>-schemas.js`.
5. Không tạo tên mơ hồ như `utils.js` nếu có thể đặt tên rõ hơn như `course-price.js`.

## Component và page

1. Luôn dùng function component.
2. Page chỉ điều phối data, route state, layout chính; tách UI lặp lại thành component nhỏ.
3. Không viết component quá dài nếu có thể tách theo trách nhiệm rõ ràng.
4. Luôn reuse component shared nếu đã có: `Button`, `Form`, `FormField`, `Modal`, `useToast`.
5. Không thêm library UI mới khi shared components hiện tại xử lý được.
6. Props phải rõ nghĩa, tránh truyền object quá lớn nếu chỉ cần vài field.
7. Không dùng comment trang trí; chỉ comment khi logic khó hiểu hoặc có lý do nghiệp vụ.

Ví dụ component đúng hướng:

```jsx
import { Button, useToast } from '@/shared/components/ui'

export function FreeEnrollButton({ courseId, onEnrolled }) {
  const toast = useToast()

  async function handleEnroll() {
    if (!courseId) {
      toast.error('Course is not available right now.')
      return
    }

    onEnrolled?.(courseId)
  }

  return (
    <Button type="button" onClick={handleEnroll}>
      Enroll for free
    </Button>
  )
}
```

## Service và API

1. Luôn gọi API qua `src/services/api-client.js`.
2. Không import `axios` trực tiếp trong page/component.
3. Mỗi domain có service riêng, ví dụ `category.service.js`, `course.service.js`, `order.service.js`.
4. Service phải export qua `src/services/index.js` đúng một lần, không export trùng.
5. Luôn tôn trọng base URL đã cấu hình trong `api-client.js`.
6. Luôn xử lý response theo format backend `ApiResponse<T>`; service nên trả về `data` đã unwrap.
7. Không để component biết chi tiết endpoint nếu service đã che được.
8. Không hard-code token hoặc header auth trong từng service; dùng interceptor hiện có.

Ví dụ service:

```js
import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

export const categoryService = {
  async list(params = {}) {
    const response = await apiClient.get('/admin/categories', { params })
    return unwrap(response) || []
  },

  async create(payload) {
    const response = await apiClient.post('/admin/categories', payload)
    return unwrap(response)
  },
}
```

## Routing và phân quyền

1. Public route đặt trong `src/app/AppShell.jsx` hoặc route module tương ứng.
2. Route theo role đặt trong các file `src/app/routes/*Routes.jsx`.
3. Route bảo vệ phải đi qua `ProtectedRoute` và `RoleGuard` khi cần role cụ thể.
4. Sidebar trong `src/app/layouts/Sidebar.jsx` phải khớp route thật.
5. Không thêm menu sidebar nếu route chưa tồn tại.
6. Không thêm route tới page chưa có, trừ khi dùng placeholder rõ ràng và đúng scope.
7. Khi đổi path, phải giữ alias hoặc redirect nếu path cũ đã được dùng ở code khác.

Ví dụ route đúng hướng:

```jsx
{
  path: '/learning',
  element: <RoleGuard allowedRoles={[ROLES.TRAINEE]} />,
  children: [
    {
      element: <AppLayout />,
      children: [
        { path: 'courses', element: <MyCoursesPage /> },
      ],
    },
  ],
}
```

## Form và validation

1. Form phức tạp luôn dùng `react-hook-form`.
2. Validation schema luôn dùng Zod nếu đã có pattern trong feature.
3. Schema đặt trong `src/features/<domain>/schemas`.
4. Không validate chỉ ở UI nếu backend cũng yêu cầu; FE validate để UX tốt, BE vẫn là nguồn kiểm chứng cuối.
5. Khi submit form phải có loading/submitting state.
6. Khi API lỗi phải hiển thị message rõ ràng, không nuốt lỗi im lặng.

Ví dụ:

```js
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
})
```

## Loading, error, empty state

1. Page gọi API phải có loading state.
2. Page list phải có empty state.
3. Error state phải cho người dùng biết hành động tiếp theo nếu có thể.
4. Thao tác create/update/delete/enroll/checkout phải dùng toast thành công/thất bại.
5. Polling phải có giới hạn hoặc cleanup timer trong `useEffect`.
6. Không toast liên tục trong polling khi lỗi tạm thời.

## State management

1. Ưu tiên local state cho state chỉ dùng trong một page/component.
2. Chỉ dùng Zustand hoặc context khi state thật sự cần chia sẻ nhiều nơi.
3. Không lưu dữ liệu nhạy cảm ngoài cơ chế hiện có trong auth/session.
4. Không duplicate cùng một nguồn state ở nhiều nơi nếu có thể derive từ dữ liệu hiện có.

## Auth và security frontend

1. Không tự xử lý bearer token thủ công trong từng request.
2. Không lưu secret, API key, private key trong source code.
3. Không render HTML từ backend bằng `dangerouslySetInnerHTML` nếu chưa sanitize và chưa có lý do rõ ràng.
4. Public auth request không được gửi stale token; giữ pattern trong `api-client.js`.
5. Khi user chưa login, redirect về `/login` hoặc route auth phù hợp.

## Tích hợp backend

1. Trước khi sửa service, kiểm tra endpoint backend tương ứng nếu có thể.
2. Không đoán enum nếu backend đã có enum.
3. Không đổi field name tùy ý; phải map/normalize ở service nếu backend và UI dùng tên khác.
4. Nếu backend thiếu field cần thiết, ghi rõ blocker thay vì tạo dữ liệu giả.
5. Với payment/enrollment/order, luôn kiểm tra idempotency và trạng thái terminal từ backend.

## CSS và UI

1. Trước mọi thay đổi UI, đọc toàn bộ `DESIGN_LANGUAGE.md`; đây là nguồn thiết kế chuẩn duy nhất.
2. Reuse CSS/shared style hiện có trước khi tạo CSS mới.
3. Class CSS phải có tên rõ ràng theo domain/component.
4. Không dùng inline style quá nhiều nếu style lặp lại hoặc phức tạp.
5. UI phải có responsive cơ bản cho desktop/tablet/mobile nếu page public hoặc trainee dùng nhiều.
6. Icon dùng `lucide-react`, không thêm icon library mới nếu không cần.
7. Không đưa neo-brutalism, offset shadow, hover translate, gradient trang trí hoặc colored icon box trở lại nếu user không yêu cầu đổi design direction.

## Import và export

1. Barrel export trong `index.js` phải rõ ràng, không export trùng tên.
2. Không dùng default export lẫn named export tùy tiện trong cùng domain nếu code hiện tại dùng named export.
3. Khi thêm page/component mới, cập nhật `index.js` của feature nếu các module khác cần import.
4. Trước khi thêm import mới, kiểm tra có import unused không.

## Testing và verification

1. Sau sửa code luôn chạy:

```bash
npm run build
```

2. Với file đã sửa, chạy targeted lint:

```bash
npx eslint <file-1> <file-2>
```

3. Nếu thay đổi route, kiểm tra các link/navigate liên quan bằng grep.
4. Nếu thay đổi service, kiểm tra tất cả nơi gọi service đó.
5. Nếu thay đổi form, test ít nhất các case: submit thành công, validation fail, API fail.
6. Nếu full `npm run lint` fail do lỗi ngoài scope, không giấu lỗi; báo rõ lỗi nào ngoài scope.

## Quy tắc khi sửa bug sau merge

1. Luôn tìm root cause trước khi sửa.
2. Sửa tại source gây lỗi, không chỉ che lỗi ở UI.
3. Kiểm tra duplicate export/import sau merge conflict.
4. Không xóa code của dev khác nếu chưa xác định scope.
5. Giữ commit nhỏ, tập trung đúng lỗi.

## Không được làm

1. Không tạo mock/fake data để thay thế API thật trong production flow.
2. Không disable lint/build để che lỗi.
3. Không sửa rộng ngoài scope user yêu cầu.
4. Không xóa file kế hoạch, docs, source của dev khác nếu không được yêu cầu.
5. Không commit `.env`, token, credential, secret.
6. Không thêm dependency mới nếu chưa có lý do rõ ràng và chưa hỏi người dùng.
