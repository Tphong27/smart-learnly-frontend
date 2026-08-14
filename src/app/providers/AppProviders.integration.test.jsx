import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/test/mocks/server";
import { AppProviders } from "./AppProviders";
import { useGoogleAuthConfig } from "./googleAuthConfigContext";

vi.mock("@react-oauth/google", () => ({
    GoogleOAuthProvider: ({ clientId, children }) => (
        <div data-testid="google-provider" data-client-id={clientId}>
            {children}
        </div>
    ),
}));

/** Hiển thị cấu hình Google từ context để kiểm tra provider và consumer dùng cùng dữ liệu. */
function GoogleConfigProbe() {
    const { clientId, isLoading } = useGoogleAuthConfig();

    return <span>{isLoading ? "loading" : clientId || "not-configured"}</span>;
}

describe("AppProviders Google OAuth config", () => {
    it("uses the public backend client ID without sending a stale bearer token", async () => {
        localStorage.setItem("accessToken", "stale-access-token");
        server.use(
            http.get(
                "http://localhost:8080/api/v1/auth/google/config",
                ({ request }) => {
                    expect(request.headers.get("authorization")).toBeNull();
                    return HttpResponse.json({
                        data: { clientId: "backend-google-client-id" },
                    });
                },
            ),
        );

        render(
            <AppProviders>
                <GoogleConfigProbe />
            </AppProviders>,
        );

        expect(screen.getByText("loading")).toBeInTheDocument();
        await screen.findByText("backend-google-client-id");
        await waitFor(() => {
            expect(screen.getByTestId("google-provider")).toHaveAttribute(
                "data-client-id",
                "backend-google-client-id",
            );
        });
    });
});
