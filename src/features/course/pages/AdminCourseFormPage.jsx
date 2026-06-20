import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ThumbnailUploader from "../components/ThumbnailUploader";
import { courseService } from "../../../services/course.service";
import Button from "../../../shared/components/ui/Button/Button";
import { useToast } from "../../../shared/components/ui/Toast/useToast";
import "./AdminCourseForm.css";

export default function AdminCourseFormPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(courseId);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    categoryId: "",
    price: 0,
    thumbnailUrl: "",
  });

  // Load danh mục để render vào thẻ <select>
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await courseService.getCategories();
        setCategories(cats || []);
      } catch (error) {
        showToast("Lỗi khi tải danh mục", "error");
      }
    };
    fetchCategories();

    // Nếu đang là chế độ Edit, gọi API lấy dữ liệu cũ về form
    if (isEditMode) {
      const fetchCourseDetail = async () => {
        try {
          const course = await courseService.getAdmin(courseId);
          if (course) {
            setFormData({
              title: course.title || "",
              shortDescription: course.shortDescription || "",
              description: course.description || "",
              categoryId: course.categoryId || "",
              price: course.price || 0,
              thumbnailUrl: course.thumbnailUrl || "",
            });
          }
        } catch (error) {
          showToast("Lỗi khi tải thông tin khóa học", "error");
        }
      };
      fetchCourseDetail();
    }
  }, [courseId, isEditMode, showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleThumbnailSuccess = (url) => {
    setFormData((prev) => ({ ...prev, thumbnailUrl: url }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.categoryId) {
      showToast("Vui lòng nhập Tên khóa học và chọn Danh mục", "error");
      return;
    }

    try {
      setLoading(true);
      let targetCourseId = courseId;

      if (isEditMode) {
        await courseService.update(courseId, formData);
        showToast("Cập nhật khóa học thành công!", "success");
        navigate(`/admin/courses/${courseId}/content`);
        return;
      } else {
        const response = await courseService.create(formData);
        targetCourseId = response?.id || response?.data?.id;
        showToast("Tạo thông tin khóa học thành công!", "success");
      }

      if (targetCourseId) {
        navigate(`/admin/courses/${targetCourseId}/content`);
      } else {
        navigate("/admin/courses");
      }
    } catch (error) {
      console.error("Lỗi API thực tế:", error);
      showToast("Có lỗi xảy ra khi lưu khóa học", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-content-inner">
      {/* 📌 FIXED: Sử dụng class chung .app-page-container của hệ thống layout để không bị đè chữ */}
      <div
        className="app-page-container"
        style={{ maxWidth: "800px", margin: "0 auto" }}
      >
        <h2
          style={{
            marginBottom: "24px",
            fontSize: "20px",
            fontWeight: "600",
            color: "#1e293b",
          }}
        >
          {isEditMode ? "Edit Course Information" : "Create New Course"}
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          {/* Phần Upload Hình Ảnh */}
          <div
            className="form-group"
            style={{ display: "flex", flexDirection: "column", gap: "6px" }}
          >
            <label
              style={{ fontWeight: "600", fontSize: "14px", color: "#475569" }}
            >
              Course Thumbnail
            </label>
            <ThumbnailUploader onUploadSuccess={handleThumbnailSuccess} />
            {formData.thumbnailUrl && (
              <p style={{ fontSize: "12px", color: "green", marginTop: "5px" }}>
                Saved image link: {formData.thumbnailUrl}
              </p>
            )}
          </div>

          {/* Title */}
          <div
            className="form-group"
            style={{ display: "flex", flexDirection: "column", gap: "6px" }}
          >
            <label
              style={{ fontWeight: "600", fontSize: "14px", color: "#475569" }}
            >
              Course Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                outline: "none",
                fontSize: "14px",
              }}
              required
            />
          </div>

          {/* Category */}
          <div
            className="form-group"
            style={{ display: "flex", flexDirection: "column", gap: "6px" }}
          >
            <label
              style={{ fontWeight: "600", fontSize: "14px", color: "#475569" }}
            >
              Category *
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                outline: "none",
                fontSize: "14px",
                backgroundColor: "#fff",
              }}
              required
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Short Description */}
          <div
            className="form-group"
            style={{ display: "flex", flexDirection: "column", gap: "6px" }}
          >
            <label
              style={{ fontWeight: "600", fontSize: "14px", color: "#475569" }}
            >
              Short Description
            </label>
            <textarea
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                outline: "none",
                fontSize: "14px",
                minHeight: "100px",
                resize: "vertical",
              }}
            />
          </div>

          {/* Price */}
          <div
            className="form-group"
            style={{ display: "flex", flexDirection: "column", gap: "6px" }}
          >
            <label
              style={{ fontWeight: "600", fontSize: "14px", color: "#475569" }}
            >
              Price (VND)
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                outline: "none",
                fontSize: "14px",
              }}
            />
          </div>

          {/* 📌 FIXED KHÔNG GIAN NÚT BẤM: Thêm đường kẻ line ngăn cách và đẩy nút sang phải nhìn chuyên nghiệp */}
          <div
            style={{
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/courses")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : isEditMode
                  ? "Save & Continue to Syllabus"
                  : "Create & Manage Syllabus"}
            </Button>
          </div>
        </form>
      </div>
      {/* 📌 Đệm chân trang: Đảm bảo khi cuộn xuống cùng không bị che mất nút bấm */}
      <div style={{ height: "40px" }}></div>
    </div>
  );
}
