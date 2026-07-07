export const OPEN_ACCOUNT_SWITCHER_EVENT = "ucm:open-account-switcher";

export function requestOpenAccountSwitcher(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_ACCOUNT_SWITCHER_EVENT));
}
