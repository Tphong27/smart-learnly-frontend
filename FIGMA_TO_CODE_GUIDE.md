# Hướng Dẫn Figma to Code với Cursor

## Giới Thiệu

Sử dụng Figma MCP trong Cursor để chuyển đổi thiết kế Figma sang code React/Tailwind một cách chính xác nhất.

## Cách Sử Dụng

### Bước 1: Mở Figma và copy URL

1. Mở file Figma của bạn
2. Chọn **một frame/component** cụ thể (KHÔNG chọn cả page)
3. Copy URL (vd: `https://figma.com/design/xxx?node-id=123:456`)

### Bước 2: Dán URL vào Cursor

```
Generate code from this Figma design: https://figma.com/design/xxx?node-id=123:456
```

Hoặc nói:
```
Chuyển thiết kế Figma này thành code React
```

### Bước 3: AI sẽ tự động:

1. Gọi `get_design_context` để đọc design
2. Đọc Auto Layout, Colors, Typography, Spacing
3. Generate code sử dụng UI components của bạn
4. So sánh với Figma và refine nếu cần

## Mẹo Để Đạt Độ Chính Xác Cao

### Trong Figma:

```
✅ DÙNG:
├── Auto Layout (bắt buộc)
├── Figma Variables cho colors
├── Component Properties cho variants
├── Đặt tên layer có ý nghĩa
└── Frame nhỏ, riêng biệt

❌ TRÁNH:
├── Frames không có Auto Layout
├── Hardcoded colors (dùng Variables)
├── Grouped layers thay vì Components
└── Chọn cả page một lúc
```

### Ví dụ Variable Naming:

```
BAD:  #1E40AF, #FFFFFF, #000000
GOOD: primary-600, white, black
```

## Các Tool MCP Available

| Tool | Mô tả | Khi nào dùng |
|------|--------|---------------|
| `get_design_context` | Lấy full context (layout, colors, typography) | Khi cần generate code |
| `get_metadata` | Chỉ lấy cấu trúc (IDs, names, positions) | Khi muốn khám phá file |
| `get_screenshot` | Chụp màn hình design | Khi cần verify |
| `get_variable_defs` | Lấy Figma Variables | Khi muốn xem tokens |

## Component Library

Code được generate sẽ sử dụng:

```typescript
// Button variants
import { Button } from '@/shared/components/ui/Button';
<Button variant="primary">Click me</Button>
<Button variant="outline" size="lg">Outline</Button>

// Input variants  
import { Input } from '@/shared/components/ui/Input';
<Input placeholder="Enter email" />
<Input error="Invalid email" />

// Badge variants
import { Badge } from '@/shared/components/ui/Badge';
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
```

## So Sánh Output

### Không có Code Connect (Basic):
```jsx
<button style={{ backgroundColor: '#1E40AF', padding: '12px 24px' }}>
  Click me
</button>
```

### Có Code Connect (Accurate):
```jsx
<Button variant="primary">Click me</Button>
```

---

## Troubleshooting

**Q: Token limit bị exceed?**
A: Chỉ chọn một frame nhỏ, không chọn cả page.

**Q: Colors không đúng?**
A: Đảm bảo dùng Figma Variables thay vì hardcoded colors.

**Q: Layout không đúng?**
A: Kiểm tra Auto Layout settings trong Figma.

**Q: Figma MCP không hoạt động?**
A: Cần Figma Dev/Full seat (6 tool calls/tháng cho Starter).
