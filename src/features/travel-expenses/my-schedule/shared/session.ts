import { SessionUser } from "./types";

export const getCurrentSessionUser = (): SessionUser => {
  try {
    const authUser = sessionStorage.getItem("authUser");

    if (!authUser) {
      return { id: null, profileId: null };
    }

    const parsedUser = JSON.parse(authUser);
    const sessionData = parsedUser?.data || {};
    const parsedId = Number(sessionData?.userID ?? sessionData?.id ?? "");
    const parsedProfileId = Number(
      sessionData?.profileID ??
        sessionData?.profile_id ??
        sessionData?.profile?.profileID ??
        sessionData?.profile?.profile_id ??
        ""
    );

    return {
      id: Number.isFinite(parsedId) ? parsedId : null,
      profileId: Number.isFinite(parsedProfileId) ? parsedProfileId : null,
    };
  } catch {
    return { id: null, profileId: null };
  }
};

export const getAuthHeaders = (): Record<string, string> => {
  try {
    const authUser = sessionStorage.getItem("authUser");
    const parsedUser = authUser ? JSON.parse(authUser) : null;
    const token = parsedUser?.token || parsedUser?.data?.token;

    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  } catch {
    return { "Content-Type": "application/json" };
  }
};
