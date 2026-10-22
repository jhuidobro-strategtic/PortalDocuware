export const canManageUsers = (): boolean => {
  try {
    const session = JSON.parse(sessionStorage.getItem("authUser") || "null");
    const user = session?.data ?? session;
    const profileName = user?.profile?.profileName ?? user?.profileName;
    if (typeof profileName !== "string") return false;
    const profile = profileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().replace(/[\s_-]/g, "");
    return ["ADMINISTRADOR", "SUPERADMIN", "SUPERADMINISTRADOR"].includes(profile);
  } catch {
    return false;
  }
};
