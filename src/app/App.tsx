import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import type { PdfExportResult, LoadedPdf } from "../types/pdf";
import type { DocumentLayer } from "../types/watermark";
import { useAppSettings } from "./AppProviders";
import { createDownloadFileName } from "../features/pdf/fileFormatting";
import { exportPdf } from "../features/pdf/exportPdf";
import {
  validateExportPasswordProtection,
  type ExportPasswordProtection,
} from "../features/pdf/pdfEncryption";
import { getExportFooterModel, type ExportWorkflowStep } from "./exportFlow";
import {
  clampPreviewPage,
  getVisiblePageCount,
  shouldUseLargePdfMode,
} from "../features/pdf/largePdf";
import { cleanupSessionReferences, wipeBytes } from "../features/security/sessionCleanup";
import { createDefaultDocumentLayers } from "../features/watermark/defaults";
import {
  getDocumentAffectedPagesSummary,
  getLayersSummary,
  validateDocumentLayers,
} from "../features/watermark/validation";
import { useTranslation } from "../features/i18n/useTranslation";
import { AppShell } from "../components/layout/AppShell";
import { EmptyState } from "../components/layout/EmptyState";
import { PdfImporter } from "../components/pdf/PdfImporter";
import { PdfPreview } from "../components/pdf/PdfPreview";
import { SecurityCenter } from "../components/security/SecurityCenter";
import { WatermarkDesigner } from "../components/watermark/WatermarkDesigner";
import { ExportPanel } from "../components/export/ExportPanel";
import { Button } from "../components/ui/Button";

type WorkflowStep = ExportWorkflowStep;

function triggerDownload(result: PdfExportResult) {
  const link = document.createElement("a");
  link.href = result.url;
  link.download = result.fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

export function App() {
  const { classifiedMode } = useAppSettings();
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState<WorkflowStep>("import");
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.1);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [layers, setLayers] = useState<DocumentLayer[]>(() => createDefaultDocumentLayers());
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(() => layers[0]?.id ?? null);
  const [selectedProtection, setSelectedProtection] = useState<"password" | null>(null);
  const [exportResult, setExportResult] = useState<PdfExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [exportPasswordProtection, setExportPasswordProtection] = useState<ExportPasswordProtection>({
    enabled: false,
    password: "",
    confirmPassword: "",
  });
  const [generating, setGenerating] = useState(false);
  const loadedPdfRef = useRef<LoadedPdf | null>(null);
  const exportResultRef = useRef<PdfExportResult | null>(null);
  const layersRef = useRef<DocumentLayer[]>(layers);

  useEffect(() => {
    loadedPdfRef.current = loadedPdf;
  }, [loadedPdf]);

  useEffect(() => {
    exportResultRef.current = exportResult;
  }, [exportResult]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(
    () => () => {
      cleanupSessionReferences({
        loadedPdf: loadedPdfRef.current,
        generatedUrl: exportResultRef.current?.url,
        layers: layersRef.current,
      });
    },
    [],
  );

  useEffect(() => {
    if (!classifiedMode || !loadedPdf) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [classifiedMode, loadedPdf]);

  const pageCount = loadedPdf?.pageCount ?? 1;
  const visiblePageCount = loadedPdf ? getVisiblePageCount(loadedPdf.pageCount) : 1;
  const largePdfMode = loadedPdf ? shouldUseLargePdfMode(loadedPdf.pageCount) : false;
  const outputFileName = useMemo(
    () => createDownloadFileName(loadedPdf?.fileName ?? ""),
    [loadedPdf?.fileName],
  );

  const setPageSafely = useCallback(
    (page: number) => {
      setCurrentPage(clampPreviewPage(page, pageCount));
    },
    [pageCount],
  );

  useEffect(() => {
    if (!loadedPdf) {
      return;
    }

    setCurrentPage((page) => clampPreviewPage(page, loadedPdf.pageCount));
  }, [loadedPdf]);

  function revokeExportResult() {
    if (exportResultRef.current) {
      URL.revokeObjectURL(exportResultRef.current.url);
      exportResultRef.current = null;
    }
    setExportResult(null);
  }

  const handleSelectedLayerChange = useCallback((layerId: string | null) => {
    setSelectedLayerId(layerId);

    if (layerId) {
      setSelectedProtection(null);
    }
  }, []);

  function handleLoaded(document: LoadedPdf) {
    if (loadedPdfRef.current) {
      wipeBytes(loadedPdfRef.current.bytes);
    }
    revokeExportResult();
    setLoadedPdf(document);
    setCurrentPage(1);
    setZoom(1.1);
    setExportError(null);
    const defaultLayers = createDefaultDocumentLayers();
    setLayers(defaultLayers);
    setSelectedLayerId(defaultLayers[0]?.id ?? null);
    setSelectedProtection(null);
    setExportPasswordProtection({ enabled: false, password: "", confirmPassword: "" });
    setActiveStep("edit");
  }

  function removeDocument() {
    if (loadedPdfRef.current) {
      wipeBytes(loadedPdfRef.current.bytes);
    }
    revokeExportResult();
    setLoadedPdf(null);
    setCurrentPage(1);
    setSelectedProtection(null);
    setExportPasswordProtection({ enabled: false, password: "", confirmPassword: "" });
    setActiveStep("import");
  }

  const clearSession = useCallback(
    (resetExport = true) => {
      if (classifiedMode && loadedPdfRef.current) {
        const confirmed = window.confirm(t("security.clearConfirm"));
        if (!confirmed) {
          return;
        }
      }

      cleanupSessionReferences({
        loadedPdf: loadedPdfRef.current,
        generatedUrl: resetExport ? exportResultRef.current?.url : null,
        layers: layersRef.current,
      });
      setLoadedPdf(null);
      setCurrentPage(1);
      setZoom(1.1);
    const defaultLayers = createDefaultDocumentLayers();
    setLayers(defaultLayers);
    setSelectedLayerId(defaultLayers[0]?.id ?? null);
    setSelectedProtection(null);
    setExportPasswordProtection({ enabled: false, password: "", confirmPassword: "" });
      setExportError(null);

      if (resetExport) {
        setExportResult(null);
        exportResultRef.current = null;
      }

      setActiveStep("import");
    },
    [classifiedMode, t],
  );

  async function handleGenerateExport() {
    const validation = validateDocumentLayers(layers, loadedPdf);

    if (!validation.isValid) {
      setExportError(t(validation.messageKey ?? "export.error"));
      return;
    }

    if (!loadedPdf) {
      setExportError(t("export.noDocument"));
      return;
    }

    const passwordValidation = validateExportPasswordProtection(exportPasswordProtection);

    if (!passwordValidation.isValid) {
      setExportError(t(passwordValidation.messageKey ?? "export.error"));
      setSelectedLayerId(null);
      setSelectedProtection("password");
      setActiveStep("edit");
      return;
    }

    setGenerating(true);
    setExportError(null);
    setExportProgress({ current: 0, total: loadedPdf.pageCount });
    setActiveStep("export");

    try {
      revokeExportResult();
      const result = await exportPdf(loadedPdf.bytes, layers, {
        outputFileName,
        cleanupMetadata: true,
        inputPassword: loadedPdf.password,
        passwordProtection: exportPasswordProtection.enabled
          ? { password: exportPasswordProtection.password }
          : undefined,
        onProgress: setExportProgress,
      });
      setExportResult(result);
      exportResultRef.current = result;
      triggerDownload(result);
      setExportPasswordProtection({ enabled: false, password: "", confirmPassword: "" });

      setCurrentPage(1);

      if (classifiedMode) {
        wipeBytes(loadedPdf.bytes);
        for (const layer of layers) {
          if (layer.imageData) {
            wipeBytes(layer.imageData);
          }
        }
        setLoadedPdf(null);
        const defaultLayers = createDefaultDocumentLayers();
        setLayers(defaultLayers);
        setSelectedLayerId(defaultLayers[0]?.id ?? null);
        setSelectedProtection(null);
        setExportPasswordProtection({ enabled: false, password: "", confirmPassword: "" });
      }
    } catch (error) {
      console.error("GhostMark export failed", error);
      setExportError(t("export.error"));
    } finally {
      setGenerating(false);
      setExportProgress(null);
    }
  }

  const rightPanelTitle = useMemo(() => {
    const titles: Record<WorkflowStep, string> = {
      import: t("workflow.import"),
      edit: t("workflow.edit"),
      export: t("workflow.export"),
      security: t("workflow.security"),
    };

    return titles[activeStep];
  }, [activeStep, t]);

  const validation = useMemo(
    () => validateDocumentLayers(layers, loadedPdf),
    [loadedPdf, layers],
  );
  const watermarkReady = validation.isValid;
  const validationMessage = validation.messageKey ? t(validation.messageKey) : undefined;
  const passwordValidation = useMemo(
    () => validateExportPasswordProtection(exportPasswordProtection),
    [exportPasswordProtection],
  );
  const passwordValidationMessage = passwordValidation.messageKey
    ? t(passwordValidation.messageKey)
    : undefined;
  const watermarkSummary = useMemo(() => getLayersSummary(layers), [layers]);
  const affectedPagesSummary = useMemo(
    () => getDocumentAffectedPagesSummary(layers, loadedPdf?.pageCount ?? 1),
    [loadedPdf?.pageCount, layers],
  );

  const rightPanel = useMemo(() => {
    switch (activeStep) {
      case "import":
        return (
          <div className="grid gap-4">
            <PdfImporter
              onLoaded={handleLoaded}
              loadedPdf={loadedPdf}
              onRemove={removeDocument}
              onClear={() => clearSession()}
            />
          </div>
        );
      case "edit":
        return (
          <WatermarkDesigner
            layers={layers}
            selectedLayerId={selectedLayerId}
            totalPages={loadedPdf?.pageCount ?? 1}
            passwordProtection={exportPasswordProtection}
            passwordValidationMessage={passwordValidationMessage}
            selectedProtection={selectedProtection}
            onChange={setLayers}
            onSelectedLayerChange={handleSelectedLayerChange}
            onSelectedProtectionChange={setSelectedProtection}
            onPasswordProtectionChange={setExportPasswordProtection}
          />
        );
      case "security":
        return <SecurityCenter loadedPdf={loadedPdf} />;
      case "export":
        return (
          <ExportPanel
            outputFileName={outputFileName}
            disabled={!watermarkReady}
            error={exportError}
            result={exportResult}
            watermarkSummary={watermarkSummary}
            affectedPagesSummary={affectedPagesSummary}
            validationMessage={validationMessage}
            progress={exportProgress}
            largePdfMode={largePdfMode}
            visiblePageCount={visiblePageCount}
            totalPageCount={loadedPdf?.pageCount ?? 1}
            passwordProtection={exportPasswordProtection}
            passwordValidationMessage={passwordValidationMessage}
            onPasswordProtectionChange={setExportPasswordProtection}
            onStartNew={() => clearSession()}
          />
        );
      default:
        return null;
    }
  }, [
    activeStep,
    clearSession,
    affectedPagesSummary,
    exportError,
    exportResult,
    exportProgress,
    loadedPdf,
    outputFileName,
    layers,
    largePdfMode,
    exportPasswordProtection,
    handleSelectedLayerChange,
    passwordValidationMessage,
    selectedLayerId,
    selectedProtection,
    t,
    visiblePageCount,
    validationMessage,
    watermarkReady,
    watermarkSummary,
  ]);

  const rightPanelFooter = (() => {
    const footerModel = getExportFooterModel({
      hasDocument: Boolean(loadedPdf),
      activeStep,
      watermarkReady: watermarkReady && passwordValidation.isValid,
      generating,
      hasExportResult: Boolean(exportResult),
    });

    if (!footerModel) {
      return null;
    }

    return (
      <Button
        variant="primary"
        className="w-full"
        disabled={footerModel.disabled}
        onClick={() => void handleGenerateExport()}
      >
        {footerModel.showDownloadIcon ? (
          <Download size={16} aria-hidden="true" />
        ) : null}
        {t(footerModel.labelKey)}
      </Button>
    );
  })();

  return (
    <AppShell
      fileName={loadedPdf?.fileName}
      hasDocument={Boolean(loadedPdf)}
      showRightPanel={Boolean(loadedPdf) || activeStep === "security"}
      onSecurity={() => setActiveStep("security")}
      rightPanelTitle={rightPanelTitle}
      rightPanel={rightPanel}
      rightPanelFooter={rightPanelFooter}
    >
      {loadedPdf ? (
        <PdfPreview
          document={loadedPdf}
          layers={layers}
          selectedLayerId={selectedLayerId}
          currentPage={currentPage}
          zoom={zoom}
          previewEnabled={previewEnabled}
          onPageChange={setPageSafely}
          onZoomChange={setZoom}
          onPreviewEnabledChange={setPreviewEnabled}
          onLayersChange={setLayers}
          onSelectedLayerChange={handleSelectedLayerChange}
        />
      ) : (
        <EmptyState onLoaded={handleLoaded} />
      )}
    </AppShell>
  );
}
