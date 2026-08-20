import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Lock,
    Phone,
    ShieldCheck,
    Upload,
    User,
    UserRound,
} from "lucide-react";
import {
    Alert,
    Button,
    ErrorState,
    Form,
    FormField,
    PasswordField,
    Tabs,
    Textarea,
    useToast,
} from "@/shared/components/ui";
import { authService } from "../services/authService";
import { setAuthSession, getCurrentUser } from "@/services/api-client";
import { profileSchema, changePasswordSchema } from "../schemas/auth-schemas";
import { PasswordStrengthChecklist } from "../components/PasswordStrengthChecklist";
import "./ProfilePage.css";

const TABS = {
    INFO: "info",
    PASSWORD: "password",
};

const PROFILE_TABS = [
    {
        value: TABS.INFO,
        label: "Personal information",
        icon: <UserRound size={18} />,
        id: "profile-tab-info",
        panelId: "profile-panel-info",
    },
    {
        value: TABS.PASSWORD,
        label: "Change Password",
        icon: <ShieldCheck size={18} />,
        id: "profile-tab-password",
        panelId: "profile-panel-password",
    },
];

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

/** Rút gọn tên người dùng thành tối đa hai ký tự cho avatar dự phòng. */
function getInitials(fullName) {
    if (!fullName) return "?";
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || "?";
}

/** Kiểm tra và tải ảnh đại diện, đồng thời đồng bộ phiên đăng nhập hiện tại. */
function ProfileAvatarUploader({ profile, onUploaded }) {
    const toast = useToast();
    const inputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const displayedAvatar = previewUrl || profile?.avatarUrl || null;

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    /** Từ chối file không hợp lệ trước khi gửi và giải phóng preview sau upload. */
    async function uploadFile(file) {
        if (!file) return;

        if (!AVATAR_TYPES.includes(file.type)) {
            setUploadError("Please choose a JPEG, PNG, or WebP image.");
            if (inputRef.current) inputRef.current.value = "";
            return;
        }
        if (file.size > MAX_AVATAR_SIZE) {
            setUploadError("Image size cannot exceed 5 MB.");
            if (inputRef.current) inputRef.current.value = "";
            return;
        }

        const localPreview = URL.createObjectURL(file);
        setPreviewUrl(localPreview);
        setUploadError(null);
        setIsUploading(true);

        try {
            const updated = await authService.uploadAvatar(file);
            const user = getCurrentUser();
            setAuthSession({
                accessToken: undefined,
                user: { ...(user ?? {}), ...updated },
            });
            onUploaded(updated);
            toast.success("Profile photo updated successfully.");
        } catch (error) {
            setUploadError(error?.message || "Could not upload profile photo.");
        } finally {
            setPreviewUrl(null);
            setIsUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    return (
        <div className="profile-avatar-upload profile-form__full">
            <span className="input-field__label">Profile photo</span>
            <div className="profile-avatar-upload__content">
                {displayedAvatar ? (
                    <img
                        className="profile-avatar-upload__preview"
                        src={displayedAvatar}
                        alt="Profile photo preview"
                    />
                ) : (
                    <div
                        className="profile-avatar-upload__fallback"
                        aria-hidden="true"
                    >
                        {getInitials(profile?.fullName)}
                    </div>
                )}

                <div className="profile-avatar-upload__controls">
                    <input
                        ref={inputRef}
                        className="profile-avatar-upload__input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                            uploadFile(event.target.files?.[0])
                        }
                        disabled={isUploading}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        loading={isUploading}
                        disabled={isUploading}
                        onClick={() => inputRef.current?.click()}
                    >
                        {!isUploading && (
                            <Upload size={16} aria-hidden="true" />
                        )}
                        {profile?.avatarUrl ? "Change photo" : "Upload photo"}
                    </Button>
                    <p>
                        JPEG, PNG, or WebP. Maximum 5 MB. The photo is saved
                        immediately.
                    </p>
                </div>
            </div>
            {uploadError && (
                <p className="input-field__error" role="alert">
                    {uploadError}
                </p>
            )}
        </div>
    );
}

/** Quản lý form thông tin cá nhân và chỉ cho lưu khi dữ liệu đã thay đổi. */
function ProfileInfoForm({ profile, onSaved }) {
    const toast = useToast();
    const [serverError, setServerError] = useState(null);
    const loadedProfileKeyRef = useRef(null);

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting, isDirty },
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullName: profile?.fullName ?? "",
            phoneNumber: profile?.phoneNumber ?? "",
            bio: profile?.bio ?? "",
        },
        mode: "onBlur",
    });

    useEffect(() => {
        const profileKey = profile?.id || profile?.email || null;
        if (loadedProfileKeyRef.current === profileKey) return;

        loadedProfileKeyRef.current = profileKey;
        reset({
            fullName: profile?.fullName ?? "",
            phoneNumber: profile?.phoneNumber ?? "",
            bio: profile?.bio ?? "",
        });
    }, [profile, reset]);

    const bioValue = useWatch({ control, name: "bio" }) ?? "";

    /** Chuẩn hóa giá trị trống trước khi cập nhật hồ sơ và phiên người dùng. */
    async function onSubmit(values) {
        setServerError(null);
        try {
            const payload = {
                fullName: values.fullName?.trim(),
                phoneNumber: values.phoneNumber?.trim() || null,
                bio: values.bio?.trim() || null,
            };
            const updated = await authService.updateProfile(payload);
            reset({
                fullName: updated?.fullName ?? "",
                phoneNumber: updated?.phoneNumber ?? "",
                bio: updated?.bio ?? "",
            });
            const user = getCurrentUser();
            setAuthSession({
                accessToken: undefined,
                user: { ...(user ?? {}), ...updated },
            });
            onSaved(updated);
            toast.success("Profile updated successfully.");
        } catch (error) {
            setServerError(
                error?.message || "Update failed. Please try again.",
            );
        }
    }

    return (
        <section
            className="profile-panel"
            aria-labelledby="profile-info-heading"
        >
            <header className="profile-panel__header">
                <div>
                    <h2 id="profile-info-heading">Personal information</h2>
                </div>
            </header>

            {serverError && (
                <Alert
                    tone="danger"
                    title="Profile could not be updated"
                    className="profile-panel__alert"
                >
                    {serverError}
                </Alert>
            )}

            <Form className="profile-form" onSubmit={handleSubmit(onSubmit)}>
                <div className="profile-form__grid">
                    <ProfileAvatarUploader
                        profile={profile}
                        onUploaded={onSaved}
                    />

                    <FormField
                        id="profile-full-name"
                        label="Full name"
                        required
                        registration={register("fullName")}
                        error={errors.fullName?.message}
                        leftIcon={<User size={16} aria-hidden="true" />}
                        autoComplete="name"
                    />

                    <FormField
                        id="profile-phone"
                        label="Phone number"
                        type="tel"
                        placeholder="0901234567 or +84901234567"
                        registration={register("phoneNumber")}
                        error={errors.phoneNumber?.message}
                        leftIcon={<Phone size={16} aria-hidden="true" />}
                        autoComplete="tel"
                        inputMode="tel"
                    />

                    <Textarea
                        id="profile-bio"
                        label="Bio"
                        className="profile-form__full"
                        maxLength={1000}
                        rows={6}
                        placeholder="Tell learners and colleagues a little about yourself"
                        error={errors.bio?.message}
                        helperText={`${bioValue.length} / 1000 characters`}
                        {...register("bio")}
                    />
                </div>

                <div className="profile-form__actions">
                    <p aria-live="polite">
                        {isSubmitting
                            ? "Saving profile..."
                            : isDirty
                              ? "Unsaved changes"
                              : "Your profile is up to date"}
                    </p>
                    <div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => reset()}
                            disabled={!isDirty || isSubmitting}
                        >
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            loading={isSubmitting}
                            disabled={!isDirty}
                        >
                            Save changes
                        </Button>
                    </div>
                </div>
            </Form>
        </section>
    );
}

/** Đổi mật khẩu với validation, chỉ báo độ mạnh và khả năng hiện/ẩn từng trường. */
function ChangePasswordForm() {
    const toast = useToast();
    const [serverError, setServerError] = useState(null);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
        mode: "onBlur",
    });

    const newPasswordValue = useWatch({ control, name: "newPassword" }) ?? "";

    /** Gửi thông tin đổi mật khẩu và xóa các giá trị nhạy cảm khi thành công. */
    async function onSubmit(values) {
        setServerError(null);
        try {
            await authService.changePassword(values);
            toast.success("Password changed successfully.");
            reset();
        } catch (error) {
            setServerError(error?.message || "Could not change password.");
        }
    }

    return (
        <section
            className="profile-panel"
            aria-labelledby="profile-password-heading"
        >
            <header className="profile-panel__header">
                <div>
                    <h2 id="profile-password-heading">Change Password</h2>
                </div>
            </header>

            {serverError && (
                <Alert
                    tone="danger"
                    title="Password could not be changed"
                    className="profile-panel__alert"
                >
                    {serverError}
                </Alert>
            )}

            <Form
                className="profile-form profile-form--password"
                onSubmit={handleSubmit(onSubmit)}
            >
                <PasswordField
                    id="profile-current-password"
                    label="Current password"
                    required
                    registration={register("currentPassword")}
                    error={errors.currentPassword?.message}
                    leftIcon={<Lock size={16} aria-hidden="true" />}
                    showLabel="Show current password"
                    hideLabel="Hide current password"
                    autoComplete="current-password"
                />

                <div className="profile-password-group">
                    <PasswordField
                        id="profile-new-password"
                        label="New password"
                        required
                        registration={register("newPassword")}
                        error={errors.newPassword?.message}
                        leftIcon={<Lock size={16} aria-hidden="true" />}
                        showLabel="Show new password"
                        hideLabel="Hide new password"
                        autoComplete="new-password"
                    />
                    <div className="profile-password-requirements">
                        <strong>Password requirements</strong>
                        <PasswordStrengthChecklist value={newPasswordValue} />
                    </div>
                </div>

                <PasswordField
                    id="profile-confirm-password"
                    label="Confirm new password"
                    required
                    registration={register("confirmPassword")}
                    error={errors.confirmPassword?.message}
                    leftIcon={<Lock size={16} aria-hidden="true" />}
                    showLabel="Show password confirmation"
                    hideLabel="Hide password confirmation"
                    autoComplete="new-password"
                />

                <div className="profile-form__actions profile-form__actions--password">
                    <Button type="submit" loading={isSubmitting}>
                        Update password
                    </Button>
                </div>
            </Form>
        </section>
    );
}

/** Hiển thị hồ sơ hiện tại với hai khu vực chỉnh thông tin và đổi mật khẩu. */
export function ProfilePage() {
    const toast = useToast();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(TABS.INFO);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await authService.getProfile();
                if (cancelled) return;
                setProfile(data);
                const user = getCurrentUser();
                setAuthSession({
                    accessToken: undefined,
                    user: { ...(user ?? {}), ...data },
                });
            } catch (e) {
                if (cancelled) return;
                setError(e?.message || "Could not load your profile.");
                toast.error(e?.message || "Could not load your profile.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [toast]);

    const initials = useMemo(
        () => getInitials(profile?.fullName),
        [profile?.fullName],
    );

    if (loading) {
        return (
            <div
                className="profile-page profile-page--loading"
                role="status"
                aria-label="Loading your profile"
            >
                <div className="profile-skeleton profile-skeleton--heading" />
                <div className="profile-layout">
                    <div className="profile-skeleton profile-skeleton--sidebar" />
                    <div className="profile-skeleton profile-skeleton--panel" />
                </div>
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="profile-page">
                <ErrorState
                    className="profile-error-state"
                    title="Could not load profile"
                    description={error}
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.location.reload()}
                        >
                            Try again
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className="profile-page">
            <header className="profile-page__heading">
                <div>
                    <h1>Profile</h1>
                </div>
            </header>

            <div className="profile-layout">
                <aside className="profile-sidebar">
                    <div className="profile-identity">
                        {profile?.avatarUrl ? (
                            <img
                                className="profile-page__avatar"
                                src={profile.avatarUrl}
                                alt={`${profile?.fullName || "User"} profile`}
                            />
                        ) : (
                            <div
                                className="profile-page__avatar-fallback"
                                aria-hidden="true"
                            >
                                {initials}
                            </div>
                        )}
                        <div className="profile-identity__copy">
                            <h2>{profile?.fullName || "User"}</h2>
                            <p>{profile?.email}</p>
                            {profile?.role && (
                                <span className="profile-page__role-badge">
                                    {profile.role}
                                </span>
                            )}
                        </div>
                    </div>

                    <Tabs
                        className="profile-tabs"
                        items={PROFILE_TABS}
                        value={activeTab}
                        onChange={setActiveTab}
                        ariaLabel="Profile settings"
                        orientation="vertical"
                        variant="navigation"
                    />
                </aside>

                <main className="profile-content">
                    <div
                        id={`profile-panel-${activeTab}`}
                        role="tabpanel"
                        aria-labelledby={`profile-tab-${activeTab}`}
                    >
                        {activeTab === TABS.INFO ? (
                            <ProfileInfoForm
                                profile={profile}
                                onSaved={(updated) =>
                                    setProfile((current) => ({
                                        ...current,
                                        ...updated,
                                    }))
                                }
                            />
                        ) : (
                            <ChangePasswordForm />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
