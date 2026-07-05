import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Form, FormField, Button, useToast } from "@/shared/components/ui";
import { authService } from "@/services";
import { normalizeRole, ROLES } from "@/shared/constants/roles";
import { loginSchema } from "../schemas/auth-schemas";
import { AuthPage, AuthCard } from "../components/AuthCard";
import { SocialDivider } from "../components/SocialDivider";
import {
  isPathAllowedForRole,
} from "@/app/routes/dashboard-path";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isGoogleConfigured = Boolean(
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "__SET_ME__",
);

function getRedirectPath(location, user) {
  const requested = location.state?.from?.pathname;

  if (requested && isPathAllowedForRole(requested, user?.role)) {
    return requested;
  }

  const role = normalizeRole(user?.role);

  if (role === ROLES.ADMIN) return "/admin/dashboard";
  if (role === ROLES.TMO) return "/admin/courses";
  if (role === ROLES.SME) return "/admin/question-banks";
  if (role === ROLES.TRAINER) return "/staff/courses";
  if (role === ROLES.TRAINEE) return "/learning/progress";

  return "/learning/courses";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [serverError, setServerError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  function handleSuccess(loggedInUser) {
    toast.success("Signed in successfully");
    navigate(getRedirectPath(location, loggedInUser), { replace: true });
  }

  async function onSubmit(values) {
    setServerError(null);
    setUnverifiedEmail(null);
    try {
      const data = await authService.login(values);
      handleSuccess(data?.user);
    } catch (error) {
      const code = error?.code;
      const message = error?.message || "Invalid email or password.";

      if (code === "EMAIL_NOT_VERIFIED" || /verif/i.test(message)) {
        setUnverifiedEmail(values.email);
        return;
      }

      setServerError(message);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setServerError("Could not retrieve a Google ID token.");
      return;
    }
    setServerError(null);
    setGoogleLoading(true);
    try {
      const data = await authService.loginGoogle(idToken);
      handleSuccess(data?.user);
    } catch (error) {
      setServerError(error?.message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthPage>
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to continue your learning journey."
        alert={serverError ? { type: "error", message: serverError } : null}
        footer={
          <>
            Don&apos;t have an account? <Link to="/register">Sign up</Link>
          </>
        }
      >
        {unverifiedEmail && (
          <div className="auth-card__alert auth-card__alert--info">
            Your email is not verified yet.{" "}
            <Link
              to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
              style={{
                color: "inherit",
                textDecoration: "underline",
                fontWeight: 700,
              }}
            >
              Verify now
            </Link>
          </div>
        )}

        <Form onSubmit={handleSubmit(onSubmit)}>
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

          <FormField
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            required
            registration={register("password")}
            error={errors.password?.message}
            leftIcon={<Lock size={16} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="auth-toggle-eye"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            autoComplete="current-password"
          />

          <div className="auth-link-row">
            <Link to="/forgot-password" className="auth-link">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isSubmitting || googleLoading}
          >
            Sign in
          </Button>
        </Form>

        {isGoogleConfigured ? (
          <>
            <SocialDivider>or</SocialDivider>
            <div className="auth-google-mount">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setServerError("Google sign-in was cancelled or failed.")
                }
                useOneTap={false}
                theme="outline"
                shape="rectangular"
                size="large"
                width="360"
                text="signin_with"
              />
            </div>
          </>
        ) : (
          <p className="auth-google-fallback">
            Google sign-in is being configured. Set VITE_GOOGLE_CLIENT_ID in
            .env to enable it.
          </p>
        )}
      </AuthCard>
    </AuthPage>
  );
}
