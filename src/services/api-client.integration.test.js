import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import apiClient, {
  getAccessToken,
  setAuthSession,
} from "./api-client";
import { authService } from "@/features/auth/services/authService";
import { server } from "@/test/mocks/server";

describe("API client integration", () => {
  it("FE-IT-AUTH-001 - login omits a stale bearer token and persists the returned session", async () => {
    localStorage.setItem("accessToken", "stale-token");
    let receivedAuthorization = "not-observed";

    server.use(
      http.post(/.*\/api\/v1\/auth\/login$/, async ({ request }) => {
        receivedAuthorization = request.headers.get("authorization");
        return HttpResponse.json({
          success: true,
          data: {
            accessToken: "fresh-token",
            user: { id: "user-1", email: "trainee@test.local", role: "trainee" },
          },
        });
      }),
    );

    const session = await authService.login({
      email: "trainee@test.local",
      password: "Integration@123",
    });

    expect(receivedAuthorization).toBeNull();
    expect(session.accessToken).toBe("fresh-token");
    expect(getAccessToken()).toBe("fresh-token");
    expect(JSON.parse(localStorage.getItem("user"))).toMatchObject({ role: "TRAINEE" });
  });

  it("FE-IT-AUTH-002 - protected requests attach the stored bearer token", async () => {
    setAuthSession({ accessToken: "valid-token", user: { role: "TRAINEE" } });
    let receivedAuthorization = null;

    server.use(
      http.get(/.*\/api\/v1\/notifications$/, ({ request }) => {
        receivedAuthorization = request.headers.get("authorization");
        return HttpResponse.json({ success: true, data: [] });
      }),
    );

    await expect(apiClient.get("/notifications")).resolves.toMatchObject({ data: [] });
    expect(receivedAuthorization).toBe("Bearer valid-token");
  });

  it("FE-IT-AUTH-003 - concurrent unauthorized requests share one refresh request", async () => {
    setAuthSession({ accessToken: "expired-token", user: { id: "user-1", role: "TRAINEE" } });
    let refreshCount = 0;

    server.use(
      http.get(/.*\/api\/v1\/integration-protected\/.+$/, ({ request }) => {
        if (request.headers.get("authorization") === "Bearer renewed-token") {
          return HttpResponse.json({ success: true, data: { refreshed: true } });
        }
        return HttpResponse.json({ success: false, message: "Expired" }, { status: 401 });
      }),
      http.post(/.*\/api\/v1\/auth\/refresh$/, async () => {
        refreshCount += 1;
        await delay(25);
        return HttpResponse.json({
          success: true,
          data: {
            accessToken: "renewed-token",
            user: { id: "user-1", role: "TRAINEE" },
          },
        });
      }),
    );

    await expect(Promise.all([
      apiClient.get("/integration-protected/one"),
      apiClient.get("/integration-protected/two"),
    ])).resolves.toHaveLength(2);

    expect(refreshCount).toBe(1);
    expect(getAccessToken()).toBe("renewed-token");
  });
});
