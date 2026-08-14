import { createContext, useContext } from "react";

export const GoogleAuthConfigContext = createContext({
    clientId: null,
    isLoading: true,
});

/** Cung cấp Client ID Google hiệu lực và trạng thái tải cho các màn hình xác thực. */
export function useGoogleAuthConfig() {
    return useContext(GoogleAuthConfigContext);
}
