import { useAppSettings } from "../../app/AppProviders";
import { useTranslation } from "../../features/i18n/useTranslation";
import { FieldGroup } from "../ui/FieldGroup";
import { Toggle } from "../ui/Toggle";

export function ClassifiedModePanel() {
  const { classifiedMode, setClassifiedMode } = useAppSettings();
  const { t } = useTranslation();

  return (
    <FieldGroup title={t("security.classifiedTitle")}>
      <Toggle
        label={t("security.classifiedToggle")}
        checked={classifiedMode}
        onChange={setClassifiedMode}
        description={t("security.classifiedDescription")}
      />
    </FieldGroup>
  );
}
