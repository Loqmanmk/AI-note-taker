import * as WebBrowser from "expo-web-browser";
import { DELETE_ACCOUNT_PATH, PRIVACY_PATH } from "@shared/legal";
import { getApiBaseUrl } from "./api";
import { showMessage } from "./confirm";
import { t } from "@/i18n";

/** Opens a page of the FocusNotes website, which is served by the same server as the app's API. */
async function openSitePage(path: string) {
  const base = getApiBaseUrl();
  if (!base) {
    showMessage(t().common.notAvailable, t().common.siteNotSet);
    return;
  }
  await WebBrowser.openBrowserAsync(`${base}${path}`).catch(() => {});
}

export const openPrivacyPolicy = () => openSitePage(PRIVACY_PATH);
export const openAccountDeletionPage = () => openSitePage(DELETE_ACCOUNT_PATH);
