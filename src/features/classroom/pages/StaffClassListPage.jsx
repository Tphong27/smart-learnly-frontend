import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import {
    Button,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    LoadingState,
    useToast,
} from "@/shared/components/ui";
import { classroomService } from "../services/classroomService";
import { courseAdminService } from "@/features/course";
import { canManageClasses, ROLES } from "@/shared/constants/roles";
import { ClassListFilters } from "../components/ClassListFilters";
import { getCurrentRole } from "@/shared/utils/auth";
import Pagination from "@/shared/components/Pagination";
import { ClassList } from "../components/ClassList";

/** Điều phối danh sách lớp theo role, filter URL, pagination và thao tác xóa mềm. */
export function StaffClassListPage({ routeBase = "/staff/classrooms" }) {
    const navigate = useNavigate();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const courseIdFilter = searchParams.get("courseId") || "";

    const userRole = getCurrentRole();
    const isTrainer = userRole === ROLES.TRAINER;
    const isClassManager = canManageClasses(userRole);

    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [courseResource, setCourseResource] = useState({
        loading: true,
        items: [],
        error: "",
    });

    const [filters, setFilters] = useState({
        page: 0,
        size: 15,
        keyword: "",
        status: "",
    });

    const [pageInfo, setPageInfo] = useState({
        page: 0,
        totalPages: 1,
        totalElements: 0,
    });

    const [refreshKey, setRefreshKey] = useState(0);
    const [classPendingDelete, setClassPendingDelete] = useState(null);
    const [deletingClass, setDeletingClass] = useState(false);

    useEffect(() => {
        let cancelled = false;

        /** Tải toàn bộ khóa học trong phạm vi role hiện tại để dựng filter. */
        async function loadCourseOptions() {
            try {
                setCourseResource({
                    loading: true,
                    items: [],
                    error: "",
                });

                const firstPage = await courseAdminService.list({
                    page: 0,
                    size: 100,
                });

                const allCourses = [...(firstPage.items || [])];
                const totalPages = Math.max(1, firstPage.totalPages || 1);

                for (let page = 1; page < totalPages; page += 1) {
                    const nextPage = await courseAdminService.list({
                        page,
                        size: 100,
                    });

                    allCourses.push(...(nextPage.items || []));
                }

                if (cancelled) {
                    return;
                }

                const uniqueCourses = Array.from(
                    new Map(
                        allCourses
                            .filter((course) => course?.id)
                            .map((course) => [course.id, course]),
                    ).values(),
                ).sort((left, right) =>
                    String(left.title || left.name || "").localeCompare(
                        String(right.title || right.name || ""),
                    ),
                );

                setCourseResource({
                    loading: false,
                    items: uniqueCourses,
                    error: "",
                });
            } catch (loadError) {
                if (cancelled) {
                    return;
                }

                setCourseResource({
                    loading: false,
                    items: [],
                    error:
                        loadError?.message ||
                        "Could not load courses for the filter.",
                });
            }
        }

        loadCourseOptions();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        /** Tải trang lớp hiện tại theo role và filter đang áp dụng. */
        async function fetchClasses() {
            try {
                setLoading(true);
                setError("");

                const requestFilters = {
                    ...filters,
                    courseId: courseIdFilter,
                };

                const data = isTrainer
                    ? await classroomService.listTrainer(requestFilters)
                    : await classroomService.listAdmin(requestFilters);

                if (!mounted) return;

                setClasses(data.content);
                setPageInfo({
                    page: data.page,
                    totalPages: data.totalPages,
                    totalElements: data.totalElements,
                });
            } catch (err) {
                if (!mounted) return;

                setError(err.message || "Error loading classes");
                setClasses([]);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchClasses();

        return () => {
            mounted = false;
        };
    }, [filters, refreshKey, isTrainer, courseIdFilter]);

    /** Tải lại danh sách lớp mà không thay đổi filter và pagination. */
    function reloadClasses() {
        setRefreshKey((current) => current + 1);
    }

    /** Áp dụng filter search/status mới và quay về trang đầu. */
    const handleFilterChange = useCallback((nextFilters) => {
        setFilters((current) => {
            const next = {
                ...current,
                page: 0,
                keyword: nextFilters.keyword ?? "",
                status: nextFilters.status ?? "",
            };

            const isSameFilter =
                current.page === next.page &&
                current.keyword === next.keyword &&
                current.status === next.status;

            return isSameFilter ? current : next;
        });
    }, []);

    /** Đồng bộ course filter vào URL để giữ trạng thái khi điều hướng. */
    const handleCourseChange = useCallback(
        (nextCourseId) => {
            const nextParams = new URLSearchParams(searchParams);

            if (nextCourseId) {
                nextParams.set("courseId", nextCourseId);
            } else {
                nextParams.delete("courseId");
            }

            setSearchParams(nextParams, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    /** Mở dialog xác nhận cho lớp được chọn. */
    function handleDeleteClass(classId) {
        setClassPendingDelete(classId);
    }

    /** Xóa mềm lớp đã xác nhận và phản hồi kết quả bằng toast. */
    async function confirmDeleteClass() {
        if (!classPendingDelete) return;

        setDeletingClass(true);
        try {
            await classroomService.delete(classPendingDelete);
            toast.success("Class deleted successfully.");
            setClassPendingDelete(null);
            reloadClasses();
        } catch (err) {
            toast.error(err.message || "Could not delete this class.");
        } finally {
            setDeletingClass(false);
        }
    }

    /** Chuyển trang lớp trong filter state hiện tại. */
    function goToPage(page) {
        setFilters((current) => ({
            ...current,
            page,
        }));
    }

    const pageTitle = isTrainer ? "My Assigned Classes" : "Class Management";
    const emptyTitle = isTrainer
        ? "No assigned classes"
        : "No classes available";
    const emptyDescription = isTrainer
        ? "You do not have any assigned classes yet."
        : "Create a new class or adjust the filters.";

    return (
        <section className="staff-class-router">
            <div className="section-header">
                <div>
                    <h1>{pageTitle}</h1>
                </div>

                {isClassManager && (
                    <Button
                        type="button"
                        leftIcon={<Plus size={17} />}
                        onClick={() => navigate(`${routeBase}/create`)}
                    >
                        New class
                    </Button>
                )}
            </div>

            <ClassListFilters
                courseId={courseIdFilter}
                courseOptions={courseResource.items}
                courseOptionsLoading={courseResource.loading}
                courseOptionsError={courseResource.error}
                onCourseChange={handleCourseChange}
                onFilterChange={handleFilterChange}
            />

            {loading && <LoadingState label="Loading class list..." />}

            {!loading && error && (
                <ErrorState
                    title="Could not load classes"
                    description={error}
                    action={
                        <Button variant="secondary" onClick={reloadClasses}>
                            Try again
                        </Button>
                    }
                />
            )}

            {!loading && !error && classes.length === 0 && (
                <EmptyState title={emptyTitle} description={emptyDescription} />
            )}

            {!loading && !error && classes.length > 0 && (
                <>
                    <ClassList
                        classes={classes}
                        isClassManager={isClassManager}
                        isTrainer={isTrainer}
                        onOpen={(classId) =>
                            navigate(`${routeBase}/${classId}/workspace`)
                        }
                        onCurriculum={(classId) =>
                            navigate(
                                `${routeBase}/${classId}/workspace?tab=curriculum`,
                            )
                        }
                        onAnalytics={(classId) =>
                            navigate(
                                `${routeBase}/${classId}/workspace?tab=analytics`,
                            )
                        }
                        onDelete={handleDeleteClass}
                    />

                    <Pagination
                        page={pageInfo.page + 1}
                        totalPages={pageInfo.totalPages}
                        totalItems={pageInfo.totalElements}
                        size={filters.size}
                        pageSizeOptions={[10, 15, 20, 50]}
                        disabled={loading}
                        ariaLabel="Class list pagination"
                        onPageChange={(nextPage) => goToPage(nextPage - 1)}
                        onSizeChange={(nextSize) => {
                            setFilters((current) => ({
                                ...current,
                                page: 0,
                                size: nextSize,
                            }));
                        }}
                    />
                </>
            )}

            <ConfirmDialog
                open={Boolean(classPendingDelete)}
                title="Delete this class?"
                description="The class will be soft deleted and removed from active class lists."
                confirmLabel="Delete class"
                loading={deletingClass}
                loadingLabel="Deleting..."
                onClose={() => setClassPendingDelete(null)}
                onConfirm={confirmDeleteClass}
            />
        </section>
    );
}
