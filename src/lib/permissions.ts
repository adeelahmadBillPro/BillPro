import type { UserRole } from "@/types";

export type Action =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "manage_team"
  | "edit_settings"
  | "delete_business";

const PERMISSIONS: Record<Action, UserRole[]> = {
  view: ["owner", "admin", "accountant", "viewer"],
  create: ["owner", "admin", "accountant"],
  edit: ["owner", "admin", "accountant"],
  delete: ["owner", "admin"],
  manage_team: ["owner", "admin"],
  edit_settings: ["owner", "admin"],
  delete_business: ["owner"],
};

export function hasPermission(role: UserRole | null | undefined, action: Action): boolean {
  if (!role) return false;
  return PERMISSIONS[action].includes(role);
}

export function getRoleLabel(role: UserRole, lang: "en" | "ur"): string {
  const labels: Record<UserRole, { en: string; ur: string }> = {
    owner: { en: "Owner", ur: "مالک" },
    admin: { en: "Admin", ur: "ایڈمن" },
    accountant: { en: "Accountant", ur: "اکاؤنٹنٹ" },
    viewer: { en: "Viewer", ur: "ناظر" },
  };
  return labels[role][lang];
}
