# Smart Learnly — Shared UI Component Standards

Tài liệu này quy định API và cách chọn component dùng chung. `DESIGN_LANGUAGE.md`
vẫn là nguồn chuẩn cho định hướng hình ảnh; tài liệu này là nguồn chuẩn cho cách
triển khai component React.

## Import chuẩn

```jsx
import {
  Alert,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  IconButton,
  LoadingState,
  PasswordField,
  RadioGroup,
  SearchInput,
  Select,
  Tabs,
  Textarea,
} from "@/shared/components/ui";
import Pagination from "@/shared/components/Pagination";
import { StatusBadge } from "@/shared/components/status";
```

Feature chỉ giữ component nghiệp vụ và cấu hình dữ liệu. Không tạo một bộ button,
alert, table, pagination hoặc form-control mới trong CSS của feature.

## Action

### Button

| Variant | Dùng cho |
| --- | --- |
| `primary` | Hành động chính; tối đa một primary trong một decision area |
| `secondary` | Hành động phụ có border |
| `ghost` | Back, cancel, close hoặc action ít quan trọng |
| `danger` | Delete, reject, archive hoặc thao tác phá hủy |
| `link` | Action cần hình thức liên kết nhưng vẫn giữ vùng bấm 44px |

`outline` và các variant legacy vẫn được hỗ trợ trong giai đoạn migrate, nhưng
code mới ưu tiên năm variant semantic trên. Loading phải dùng `loading` và
`loadingLabel`; không tự ghép spinner vào nút.

### IconButton

Dùng cho action chỉ có icon. `label` là bắt buộc và trở thành accessible name.

```jsx
<IconButton icon={<Trash2 size={16} />} label="Delete question" variant="danger" />
```

## Feedback

### Alert

Alert tồn tại trong nội dung cho đến khi vấn đề được xử lý. Tone hỗ trợ:
`neutral`, `info`, `success`, `warning`, `danger`.

```jsx
<Alert tone="warning" title="Source changed">
  Review the original snapshot before publishing.
</Alert>
```

### Toast

Toast dùng cho kết quả mutation ngắn hạn. Mặc định tự đóng sau 3 giây. Error
quan trọng hoặc lỗi cần người dùng sửa không được chỉ hiển thị bằng toast; phải
có Alert hoặc ErrorState tại vị trí liên quan.

### StatusBadge

StatusBadge chỉ hiển thị trạng thái hoặc metadata ngắn, không dùng làm button.
Feature map trạng thái nghiệp vụ sang một trong các tone semantic:
`neutral`, `info`, `success`, `warning`, `danger`.

### Page states

- `LoadingState`: đang tải một vùng nội dung.
- `EmptyState`: không có dữ liệu, có mô tả và action hữu ích nếu có.
- `ErrorState`: tải thất bại, ưu tiên action retry hoặc back.

## Forms, search và filters

- `Input`, `Select`, `Textarea` dùng chung label, helper, error và focus ring.
- `PasswordField` dùng cho mọi trường mật khẩu cần hiện/ẩn; không tự tạo eye
  button trong feature. Có thể đổi `showLabel` và `hideLabel` để nhãn mô tả rõ
  trường hiện tại.
- `Input suffix="minutes"` dùng cho đơn vị ngắn như phút hoặc phần trăm; không
  ghép một control đơn vị riêng chỉ để hiển thị text tĩnh.
- `Checkbox` dùng cho lựa chọn boolean độc lập.
- `RadioGroup` dùng cho một nhóm lựa chọn loại trừ nhau và luôn có `legend`.
- `SearchInput` nhận và trả chuỗi qua `onChange(value)`; dùng `clearable` mặc định.
- Search gọi server nên kết hợp `useDebouncedValue(value, 350)`.
- `FilterBar` gom search, field, sort, action và result metadata trong một toolbar.
- Filter phải áp dụng trước pagination ở backend hoặc service; không filter riêng
  dữ liệu của trang hiện tại rồi gọi đó là tổng kết quả.

```jsx
<FilterBar
  search={<SearchInput value={keyword} onChange={setKeyword} />}
  actions={<Button variant="ghost" onClick={clearFilters}>Clear</Button>}
  meta={`${totalItems} results`}
>
  <Select aria-label="Filter by status" value={status} onChange={handleStatus}>
    <option value="">All statuses</option>
  </Select>
</FilterBar>
```

### Course lesson settings

Mọi form authoring lesson dùng
`features/course/components/lesson-editor/LessonSettingsFields.jsx` cho nhóm
`Status`, `Estimated duration` và `Preview lesson`. Essay truyền
`showDuration={false}`; các loại lesson khác giữ mặc định. Không dựng lại nhóm
này bằng radio, switch hoặc input-unit riêng trong từng lesson type.

### Flashcard import và review

Flashcard import dùng `Modal` làm dialog shell, `Tabs` để chọn nguồn,
`FilterBar + SearchInput` cho câu hỏi khóa học, `Table + Pagination` cho kết quả
và `Alert` cho feedback tồn tại trong modal. Temporary candidate phải qua
`ConfirmDialog` trước khi loại bỏ. Chỉ native file input được giữ trong
dropzone; không tạo lại overlay, focus trap, tab keyboard handler hoặc
Previous/Next pagination trong feature.

### Quiz và curriculum authoring

- Question editor dùng `Input`, `Select`, `Textarea`, `Button` và `IconButton`;
  chỉ giữ native radio/checkbox khi chúng nằm trực tiếp trong từng answer row.
- Quiz manager dùng `LoadingState`, `EmptyState`, `Alert` và `ConfirmDialog` cho
  các trạng thái tải, rỗng, validation và xóa question.
- Curriculum editor dùng `StatusBadge` cho lesson status, `Alert` cho cảnh báo
  publish, `EmptyState` cho curriculum trống và `ConfirmDialog` cho xóa module
  hoặc lesson. Menu action chuyên biệt có thể giữ semantic `menu/menuitem`.

### Admin courses và question bank

- Trang danh sách course dùng `FilterBar + SearchInput + Select`, `Table`,
  `Pagination` và các page state dùng chung; không dựng filter hoặc table shell
  riêng.
- Course/question authoring dùng form controls dùng chung để error từ schema có
  cùng label, focus ring và `aria-describedby`.
- Question import dùng `Tabs` cho nguồn Excel/JSON/OCR, `Table` cho preview,
  `Alert` cho kết quả parse và `IconButton` cho action media/row. Native file
  input và correct-answer radio/checkbox được giữ vì gắn trực tiếp với upload
  và answer semantics.
- User/category/settings form dùng `Select`, `Textarea`, `Checkbox`,
  `FormActions` và state component dùng chung; không đặt layout field/action
  bằng inline style.
- System settings dùng `Tabs` cho nhóm cấu hình. Question Bank Detail dùng
  `Tabs`, `Table`, `StatusBadge`, `IconButton` và `ConfirmDialog`; preview media
  dùng `Modal`, không tạo overlay riêng trong feature.

### Test và Assignment

- Màn hình tạo bài dùng `Input`, `Select`, `Textarea`, `RadioGroup`, `Tabs` và
  `Button`; chỉ giữ duration preset như chip chuyên biệt và native file input
  trong upload zone.
- Màn hình monitor dùng `Table` cho live/history, `Tabs` cho chế độ theo dõi,
  `Modal` cho chấm điểm/feedback và `Alert` cho lỗi AI. Action chỉ có icon phải
  dùng `IconButton`; nút mở rộng hàng có thể giữ control chuyên biệt nếu có
  `aria-expanded` và accessible name.
- Danh sách của trainee dùng `Tabs + SearchInput + Select`, `Table + Pagination`,
  `StatusBadge` và các page state dùng chung. Mọi `td` phải có `data-label` để
  layout mobile của `Table` không mất tên cột.
- Access code của Test luôn dùng `Modal` và `Input`; không tự tạo overlay, body scroll
  lock, close button hoặc focus trap trong feature.

## Table và pagination

- `Table` dành cho bảng semantic có JSX tùy chỉnh.
- `DataTable` dành cho danh sách đơn giản cấu hình bằng `columns` và `rows`.
- Cột nhận diện đứng đầu; action đứng cuối.
- `data-label` được tạo từ header để chuyển dòng thành labelled card ở mobile.
- `Pagination` dùng page UI bắt đầu từ `1`; caller chuyển đổi sang page API bắt
  đầu từ `0` tại boundary.
- Không tự viết lại thuật toán page number hoặc Previous/Next trong feature.

```jsx
<Pagination
  page={apiPage + 1}
  totalPages={totalPages}
  totalItems={totalItems}
  size={pageSize}
  onPageChange={(page) => setApiPage(page - 1)}
/>
```

## Overlay và navigation

- `Modal` dùng cho form hoặc nội dung cần tập trung.
- `ConfirmDialog` dùng cho xác nhận quan trọng; destructive action dùng
  `tone="danger"`.
- `Modal position="right"` là drawer hiện tại; không tự tạo overlay/focus trap mới.
- `Tabs` dùng `underline` cho page navigation, `compact` trong modal/panel và
  `navigation` kết hợp `orientation="vertical"` cho điều hướng dọc.
- Tab panel vẫn thuộc feature và phải liên kết `aria-controls` khi có panel ID.
- Không tự viết Arrow/Home/End handler; `Tabs` quản lý roving `tabIndex` và
  keyboard navigation theo `orientation`.

## Accessibility và responsive

- Mọi interactive target tối thiểu `44px`.
- Icon-only action phải dùng `IconButton` hoặc có accessible name tương đương.
- Field cần visible label; trường hợp toolbar search có thể dùng `ariaLabel`.
- Error dùng `role="alert"`; thông tin không khẩn cấp dùng `role="status"`.
- Không truyền đạt trạng thái chỉ bằng màu; luôn có text.
- Kiểm tra ở `375px`, `768px`, `1024px`, `1440px`.
- Motion phải tuân theo `prefers-reduced-motion`.

## Quy tắc migrate

1. Migrate từng feature hoặc từng màn; không rewrite toàn repo trong một commit.
2. Giữ nguyên route, API, permission, loading và error behavior.
3. Thay component trước, chỉ xóa CSS legacy sau khi không còn reference.
4. Chạy targeted ESLint sau mỗi batch và production build trước khi bàn giao.
