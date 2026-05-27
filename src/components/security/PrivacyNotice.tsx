import { useTranslation } from "../../features/i18n/useTranslation";
import { Notice } from "../ui/Notice";

export function PrivacyNotice() {
  const { t } = useTranslation();

  return <Notice title={t("security.privacyNoticeTitle")}>{t("app.honestPrivacy")}</Notice>;
}
