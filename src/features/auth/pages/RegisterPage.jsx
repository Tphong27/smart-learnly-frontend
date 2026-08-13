import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, User, Lock } from "lucide-react";
import {
    Button,
    Form,
    FormField,
    PasswordField,
    useToast,
} from "@/shared/components/ui";
import { authService } from "../services/authService";
import { registerSchema } from "../schemas/auth-schemas";
import { PasswordStrengthChecklist } from "../components/PasswordStrengthChecklist";
import { OtpInput } from "../components/OtpInput";
import { ResendOtpButton } from "../components/ResendOtpButton";
import { AuthWizard } from "../components/AuthWizard";
import { useAuthWizard } from "../hooks/useAuthWizard";

const OTP_LENGTH = 6;

/** Thu thập thông tin tạo tài khoản và chuyển sang bước xác minh email. */
function StepRegister({ wizard }) {
    const toast = useToast();
    const [serverError, setServerError] = useState(null);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            fullName: wizard.data.fullName ?? "",
            email: wizard.data.email ?? "",
            password: wizard.data.password ?? "",
            confirmPassword: "",
        },
        mode: "onBlur",
    });

    const passwordValue = useWatch({ control, name: "password" }) ?? "";

    /** Đăng ký tài khoản và lưu dữ liệu cần thiết cho bước OTP tiếp theo. */
    async function onSubmit(values) {
        setServerError(null);
        try {
            await authService.register({
                fullName: values.fullName,
                email: values.email,
                password: values.password,
                confirmPassword: values.confirmPassword,
            });
            wizard.updateData({
                fullName: values.fullName,
                email: values.email,
                password: values.password,
            });
            toast.success(
                "We've sent a 6-digit code to your email. Enter it to verify your account.",
            );
            wizard.goNext();
        } catch (error) {
            setServerError(
                error?.message || "Registration failed. Please try again.",
            );
        }
    }

    return (
        <AuthWizard
            title="Create your account"
            subtitle="Join Smart Learnly to start your personalized learning journey."
            alert={serverError ? { type: "error", message: serverError } : null}
            footer={
                <>
                    Already have an account? <Link to="/login">Sign in</Link>
                </>
            }
        >
            <Form onSubmit={handleSubmit(onSubmit)}>
                <FormField
                    label="Full name"
                    placeholder="Jane Doe"
                    required
                    registration={register("fullName")}
                    error={errors.fullName?.message}
                    leftIcon={<User size={16} />}
                    autoComplete="name"
                />

                <FormField
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    registration={register("email")}
                    error={errors.email?.message}
                    leftIcon={<Mail size={16} />}
                    autoComplete="email"
                />

                <div>
                    <PasswordField
                        label="Password"
                        placeholder="At least 8 characters"
                        required
                        registration={register("password")}
                        error={errors.password?.message}
                        leftIcon={<Lock size={16} />}
                        autoComplete="new-password"
                    />
                    <div style={{ marginTop: 12 }}>
                        <PasswordStrengthChecklist value={passwordValue} />
                    </div>
                </div>

                <PasswordField
                    label="Confirm password"
                    placeholder="Re-enter your password"
                    required
                    registration={register("confirmPassword")}
                    error={errors.confirmPassword?.message}
                    leftIcon={<Lock size={16} />}
                    showLabel="Show password confirmation"
                    hideLabel="Hide password confirmation"
                    autoComplete="new-password"
                />

                <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    loading={isSubmitting}
                >
                    Continue
                </Button>
            </Form>
        </AuthWizard>
    );
}

/** Xác minh OTP sau đăng ký và hỗ trợ gửi lại mã có cooldown. */
function StepVerify({ wizard }) {
    const toast = useToast();
    const navigate = useNavigate();
    const [serverError, setServerError] = useState(null);
    const [resendLoading, setResendLoading] = useState(false);
    const [otpValue, setOtpValue] = useState("");

    const email = wizard.data.email ?? "";

    if (!email) {
        return (
            <AuthWizard
                title="Email required"
                subtitle="We couldn't find an email to verify. Please start again."
                alert={{
                    type: "error",
                    message: "Missing email. Restart the wizard.",
                }}
                footer={
                    <>
                        <Link
                            to="/register"
                            onClick={() => wizard.clearStorage()}
                            className="auth-link"
                        >
                            Restart sign up
                        </Link>
                    </>
                }
            >
                <Button fullWidth size="lg" onClick={wizard.goBack}>
                    Back to step 1
                </Button>
            </AuthWizard>
        );
    }

    /** Xác minh mã OTP rồi xóa dữ liệu wizard nhạy cảm khi thành công. */
    async function handleVerify(code) {
        setServerError(null);
        try {
            await authService.verifyEmail({ email, otpCode: code });
            wizard.clearStorage();
            toast.success("Email verified. Please sign in to continue.");
            navigate("/login", { replace: true });
        } catch (error) {
            setServerError(
                error?.message ||
                    "Verification code is invalid or has expired.",
            );
        }
    }

    /** Gửi lại OTP và chỉ kích hoạt cooldown khi yêu cầu hoàn tất. */
    async function handleResend() {
        setResendLoading(true);
        try {
            await authService.resendVerification(email);
            toast.success("A new code has been sent to your email.");
            return true;
        } catch (error) {
            setServerError(
                error?.message || "Could not resend the code. Try again later.",
            );
            return false;
        } finally {
            setResendLoading(false);
        }
    }

    return (
        <AuthWizard
            title="Verify your email"
            subtitle={`We sent a 6-digit code to ${email}. Enter it below to verify your account.`}
            alert={serverError ? { type: "error", message: serverError } : null}
            footer={
                <>
                    <Link to="/login" className="auth-link">
                        Back to sign in
                    </Link>
                </>
            }
        >
            <div className="auth-wizard__otp-block">
                <OtpInput
                    value={otpValue}
                    onChange={setOtpValue}
                    onComplete={handleVerify}
                    length={OTP_LENGTH}
                    name="otpCode"
                />
            </div>

            <Button
                type="button"
                fullWidth
                size="lg"
                onClick={() => handleVerify(otpValue)}
                disabled={otpValue.length !== OTP_LENGTH}
            >
                Verify
            </Button>

            <div className="auth-wizard__resend-row">
                <span>Didn't receive a code?</span>
                <ResendOtpButton
                    onResend={handleResend}
                    loading={resendLoading}
                />
            </div>
        </AuthWizard>
    );
}

/** Điều phối wizard đăng ký hai bước và giữ trạng thái qua URL/sessionStorage. */
export function RegisterPage() {
    const wizard = useAuthWizard({ totalSteps: 2 });

    if (wizard.currentStep === 1) {
        return <StepRegister wizard={wizard} />;
    }

    return <StepVerify wizard={wizard} />;
}
