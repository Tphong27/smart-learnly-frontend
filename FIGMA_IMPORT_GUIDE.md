# Hướng Dẫn: Code → Figma (Import Design System)

> Mục tiêu: Chuyển design tokens từ CSS variables → Figma Variables, sau đó tái tạo UI components để bạn xem và sửa trên Figma.

---

## 🎯 Tổng quan workflow

```
┌─────────────────────────────────────────────────────┐
│ 1. SETUP FIGMA PLUGIN (1 lần)                       │
│    → Cài "Figma Tokens Studio" hoặc "Variables Importer" │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. IMPORT TOKENS (5 phút)                            │
│    → Import figma-variables.json                     │
│    → Có ngay Figma Variables đồng bộ với CSS        │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. TẠO UI COMPONENTS TRONG FIGMA                    │
│    → Button, Input, Card, Modal theo                 │
│      FIGMA_DESIGN_SYSTEM.md                          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. CHẠY APP & IMPORT LAYOUT                         │
│    → npm run dev                                     │
│    → Plugin "html.to.design" → import từng page     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 5. SỬA TRONG FIGMA, ĐỒNG BỘ LẠI VỀ CODE           │
│    → Hỏi Cursor: "Convert Figma này sang React"    │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Bước 1: Cài Plugin Figma

### Plugin A: Figma Tokens Studio (Khuyến nghị)

```
1. Mở Figma Desktop
2. Menu → Plugins → Browse plugins
3. Tìm "Figma Tokens Studio" (by Jan Six)
4. Cài đặt
5. Mở plugin → tab "Sync"
6. Chọn "Add new sync source" → Local file
7. Chọn file figma-variables.json
8. Click "Pull" → Tokens import xong!
```

### Plugin B: Variables Import (Đơn giản hơn)

```
1. Cài plugin "Variables Import" hoặc "Figma Variables Import"
2. Mở plugin
3. Paste JSON vào
4. Click Import
```

### Plugin C: html.to.design (cho layout)

```
1. Cài plugin "html.to.design"
2. (Sẽ dùng ở bước 4)
```

---

## 🔄 Bước 2: Import Tokens

### Cách A: Dùng Tokens Studio

```bash
# 1. Đảm bảo file figma-variables.json nằm trong project
# 2. Mở Figma → Plugins → Tokens Studio
# 3. Tab "Sync" → Local file → chọn file
# 4. Click "Pull"
# 5. Done! Variables đã xuất hiện trong Figma
```

### Cách B: Manual Import

Nếu không dùng được plugin, tạo thủ công:

#### Colors:
```
Figma → Right panel → Local Variables → Create variable
Mode: Color
Name: color/ink
Value: #14213d

(Lặp lại cho tất cả 11 colors + 11 semantic colors)
```

#### Spacing & Radius:
```
Mode: Number (Float)
Name: spacing/4
Value: 16

(Lặp lại cho 12 spacing + 5 radius)
```

#### Typography:
```
Figma → Text style → Create text style
Name: typography/h1
Font: Manrope, 800, 48px
```

---

## 🧩 Bước 3: Tạo UI Components trong Figma

### 3.1 - Component: Button

```
Tạo Component Set:
- Frame: Auto Layout H, padding 16/10, gap 8, radius 10
- Background: variable color/blue
- Text: "Button", style h4, color #ffffff

Variants:
├── Variant: primary
│   ├── size: sm | md | lg
│   └── state: default | hover | active | disabled
├── Variant: secondary
├── Variant: outline (border 1.5px, no fill)
├── Variant: ghost (no fill, no border)
├── Variant: danger (#ef4444)
└── Variant: success (#11a99a)
```

**Tip:** Dùng `Variables` cho colors, `Apply Variable` shortcut.

### 3.2 - Component: Input

```
Tạo Component:
- Frame: Auto Layout V, gap 6, width 320
- Label: "Email", style body-sm 600
- Input field: H, padding 14/10, radius 10, border 1px color/line
- Helper: "We'll never share your email", style caption color/muted

Variants:
- state: default | focus | error | disabled
- variant: text | email | password | search
```

### 3.3 - Component: Card

```
Tạo Component:
- Frame: V, padding 20, gap 12, radius 14, bg white, shadow island-1
- Title: "Card title", style h3
- Body: "Card content", style body-base color/muted
- Footer: H, gap 8, primary button + ghost button

Variants:
- variant: elevated (shadow 1) | outlined (border 1px) | filled (bg surface)
```

### 3.4 - Component: Badge

```
Tạo Component:
- Frame: H, gap 4, padding 8/4, radius 9999
- Background: color/blue-soft
- Text: "BADGE", style caption uppercase 600, color color/blue

Variants:
- variant: default | success | warning | error | info
- dot: true | false
```

### 3.5 - Component: Modal

```
Tải file mẫu:
- Frame: Overlay (rgba(20,33,61,0.5) full screen)
- Dialog: V, padding 24, radius 14, bg white, shadow island-3
  - Header: H between, title + close X
  - Body: text
  - Footer: H end, ghost + primary button

Variants:
- size: sm (400) | md (560) | lg (720) | full (90vw)
```

---

## 🌐 Bước 4: Import Pages từ Code Đang Chạy

### 4.1 - Chạy dev server

```bash
cd c:\Users\anhho\OneDrive\Desktop\Đồ án\smart-learnly-frontend
npm run dev
# Mặc định chạy ở http://localhost:5173
```

### 4.2 - Import từng page

Trong Figma:
```
1. Plugins → html.to.design
2. Tab "URL"
3. Nhập URL:
   - Landing: http://localhost:5173/
   - Login: http://localhost:5173/login
   - Dashboard: http://localhost:5173/learning
   - Course Detail: http://localhost:5173/courses/[id]
4. Settings:
   ☑ Use Auto Layout (BẬT!)
   ☑ Convert to Components
   ☐ Strip CSS (BỎ chọn nếu muốn giữ styles)
5. Click "Import"
6. Figma sẽ tạo một frame mới với layout của trang
```

### 4.3 - Clean up & Refactor

Sau khi import:
```
1. Đổi tên layer: "Frame 123" → "Landing/Hero/Default"
2. Tách sections rõ ràng: Hero, Courses, Features, Steps, CTA, Footer
3. Replace raw elements với components có sẵn:
   - <button> → Button/primary/md
   - <input> → Input/text/default
   - <div.card> → Card/elevated
4. Apply Variables cho colors thay vì hex cứng
```

---

## 🔁 Bước 5: Sync Figma → Code

Khi đã sửa design trong Figma và muốn cập nhật code:

### Cách A: Paste Figma URL vào Cursor

```
User: "Convert frame Figma này sang React + Tailwind:
https://www.figma.com/design/xxx?node-id=123:456

Dùng components từ @/shared/components/ui/*
và CSS variables từ src/index.css"
```

### Cách B: Export Figma sang Code trực tiếp

```
Figma frame → Right panel → Inspect → Code → React
```

### Cách C: Dev Mode + Manual

```
1. Click element trong Dev Mode
2. Copy CSS properties
3. Paste vào file CSS tương ứng
```

---

## 📋 Checklist cho Mỗi Page

```
Trước khi đẩy lên Figma:
□ App đang chạy ở localhost:5173
□ Tất cả routes đã được test
□ Không có console errors
□ Không có placeholder text (Lorem ipsum)

Khi design trong Figma:
□ Auto Layout cho mọi container
□ Variables thay vì hardcoded
□ Component variants đầy đủ
□ Spacing tokens được dùng
□ Layer names có ý nghĩa

Sau khi xong:
□ Token sync từ Figma về code
□ Test trên nhiều breakpoints
□ Update FIGMA_DESIGN_SYSTEM.md nếu có thay đổi
```

---

## 🆘 Troubleshooting

### Plugin không tìm thấy

```
→ Figma Free plan có giới hạn plugin
→ Liên hệ admin team nếu cần plugin Pro
```

### html.to.design import bị lỗi

```
→ Đảm bảo app đang chạy accessible (không phải IPv6)
→ Thử URL: http://127.0.0.1:5173
→ Hoặc dùng ngrok để expose port:
  npx ngrok http 5173
```

### Variables không hiển thị

```
→ Check Figma file là Local Variables (không phải Library)
→ Tokens Studio có thể cần paid plan cho full features
```

### Auto Layout bị mất khi import

```
→ Trong html.to.design settings, BẬT "Use Auto Layout"
→ Sau import, fix thủ công các frame không đúng
```

---

## 📚 Files Liên Quan

- `FIGMA_DESIGN_SYSTEM.md` - Đặc tả chi tiết design tokens
- `figma-variables.json` - JSON để import vào Figma
- `FIGMA_TO_CODE_GUIDE.md` - Hướng dẫn chiều ngược lại (Figma → Code)
- `FIGMA_CODE_CONNECT.json` - Component mappings
- `src/index.css` - Source of Truth cho tokens
- `src/features/*/pages/*.jsx` - Pages để import