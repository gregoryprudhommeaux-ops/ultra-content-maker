import {
  CREATE_FRESH_HREF,
  CREATE_HUB_PATH,
  DASHBOARD_HUB_PATH,
} from "@/lib/navigation/dashboard-nav";
import { normalizeDashboardPathname } from "@/lib/navigation/dashboard-nav";

export const LIBRARY_DRAFTS_HREF = "/dashboard?status=pending";
export const UPDATE_VOICE_HREF = "/setup/author";

export type SidebarQuickLinkKey =
  | "createNewPost"
  | "dashboard"
  | "libraryDrafts"
  | "updateVoice";

export type SidebarQuickLink = {
  key: SidebarQuickLinkKey;
  href: string;
  isActive: (pathname: string | null, searchStatus?: string | null) => boolean;
};

export const SIDEBAR_QUICK_LINKS: readonly SidebarQuickLink[] = [
  {
    key: "createNewPost",
    href: CREATE_FRESH_HREF,
    isActive: (pathname) => {
      const path = normalizeDashboardPathname(pathname);
      return path === CREATE_HUB_PATH || path?.startsWith(`${CREATE_HUB_PATH}/`) === true;
    },
  },
  {
    key: "dashboard",
    href: DASHBOARD_HUB_PATH,
    isActive: (pathname, searchStatus) => {
      const path = normalizeDashboardPathname(pathname);
      if (path !== DASHBOARD_HUB_PATH && path !== "/articles") return false;
      return searchStatus !== "pending";
    },
  },
  {
    key: "libraryDrafts",
    href: LIBRARY_DRAFTS_HREF,
    isActive: (pathname, searchStatus) => {
      const path = normalizeDashboardPathname(pathname);
      if (path !== "/dashboard" && path !== "/articles") return false;
      return searchStatus === "pending";
    },
  },
  {
    key: "updateVoice",
    href: UPDATE_VOICE_HREF,
    isActive: (pathname) => {
      const path = normalizeDashboardPathname(pathname);
      if (!path) return false;
      return (
        path === "/setup/author" ||
        path.startsWith("/setup/author/") ||
        path === "/setup/audience" ||
        path.startsWith("/setup/audience/") ||
        path === "/persona" ||
        path.startsWith("/persona/")
      );
    },
  },
] as const;

export function isLastPostPath(pathname: string | null, articleId: string): boolean {
  const path = normalizeDashboardPathname(pathname);
  return path === `/articles/${articleId}`;
}
