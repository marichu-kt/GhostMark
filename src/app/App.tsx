import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PdfExportResult, LoadedPdf } from "../types/pdf";
import type { WatermarkConfig } from "../types/watermark";
import { useAppSettings } from "./AppProviders";
import { createDownloadFileName } from "../features/pdf/fileFormatting";
import { exportPdf } from "../features/pdf/exportPdf";
import { cleanupSessionReferences, wipeBytes } from "../features/security/sessionCleanup";
import { createDefaultWatermarkConfig } from "../features/watermark/defaults";
import {
  getAffectedPagesSummary,
  getWatermarkSummary,
  validateWatermarkConfig,
} from "../features/watermark/validation";
import { useTranslation } from "../features/i18n/useTranslation";
import { AppShell } from "../components/layout/AppShell";
import { EmptyState } from "../components/layout/EmptyState";
import type { WorkflowStep } from "../components/layout/Sidebar";
import { PdfImporter } from "../components/pdf/PdfImporter";
import { PdfPreview } from "../components/pdf/PdfPreview";
import { SecurityCenter } from "../components/security/SecurityCenter";
import { WatermarkDesigner } from "../components/watermark/WatermarkDesigner";
import { ExportPanel } from "../components/export/ExportPanel";
import { Notice } from "../components/ui/Notice";

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
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(() =>
    createDefaultWatermarkConfig(),
  );
  const [outputFileName, setOutputFileName] = useState("ghostmark-watermarked.pdf");
  const [cleanupMetadata, setCleanupMetadata] = useState(true);
  const [removePreviewData, setRemovePreviewData] = useState(true);
  const [clearAfterDownload, setClearAfterDownload] = useState(false);
  const [exportResult, setExportResult] = useState<PdfExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const loadedPdfRef = useRef<LoadedPdf | null>(null);
  const exportResultRef = useRef<PdfExportResult | null>(null);
  const watermarkConfigRef = useRef<WatermarkConfig>(watermarkConfig);

  useEffect(() => {
    loadedPdfRef.current = loadedPdf;
  }, [loadedPdf]);

  useEffect(() => {
    exportResultRef.current = exportResult;
  }, [exportResult]);

  useEffect(() => {
    watermarkConfigRef.current = watermarkConfig;
  }, [watermarkConfig]);

  useEffect(
    () => () => {
      cleanupSessionReferences({
        loadedPdf: loadedPdfRef.current,
        generatedUrl: exportResultRef.current?.url,
        watermarkConfig: watermarkConfigRef.current,
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

  const setPageSafely = useCallback(
    (page: number) => {
      setCurrentPage(Math.min(Math.max(page, 1), pageCount));
    },
    [pageCount],
  );

  function revokeExportResult() {
    if (exportResultRef.current) {
      URL.revokeObjectURL(exportResultRef.current.url);
      exportResultRef.current = null;
    }
    setExportResult(null);
  }

  function handleLoaded(document: LoadedPdf) {
    if (loadedPdfRef.current) {
      wipeBytes(loadedPdfRef.current.bytes);
    }
    revokeExportResult();
    setLoadedPdf(document);
    setCurrentPage(1);
    setZoom(1.1);
    setOutputFileName(createDownloadFileName(document.fileName));
    setExportError(null);
    setActiveStep("watermark");
  }

  function removeDocument() {
    if (loadedPdfRef.current) {
      wipeBytes(loadedPdfRef.current.bytes);
    }
    revokeExportResult();
    setLoadedPdf(null);
    setCurrentPage(1);
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
        watermarkConfig: watermarkConfigRef.current,
      });
      setLoadedPdf(null);
      setCurrentPage(1);
      setZoom(1.1);
      setWatermarkConfig(createDefaultWatermarkConfig());
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
    const validation = validateWatermarkConfig(watermarkConfig, loadedPdf);

    if (!validation.isValid) {
      setExportError(t(validation.messageKey ?? "export.error"));
      return;
    }

    if (!loadedPdf) {
      setExportError(t("export.noDocument"));
      return;
    }

    if (!outputFileName.trim()) {
      setExportError(t("validation.outputFilename"));
      return;
    }

    setGenerating(true);
    setExportError(null);

    try {
      revokeExportResult();
      const result = await exportPdf(loadedPdf.bytes, watermarkConfig, {
        outputFileName,
        cleanupMetadata,
      });
      setExportResult(result);
      exportResultRef.current = result;
      triggerDownload(result);

      if (removePreviewData) {
        setCurrentPage(1);
      }

      if (clearAfterDownload || classifiedMode) {
        wipeBytes(loadedPdf.bytes);
        if (watermarkConfig.imageData) {
          wipeBytes(watermarkConfig.imageData);
        }
        setLoadedPdf(null);
        setWatermarkConfig(createDefaultWatermarkConfig());
      }
    } catch {
      setExportError(t("export.error"));
    } finally {
      setGenerating(false);
    }
  }

  const rightPanelTitle = useMemo(() => {
    const titles: Record<WorkflowStep, string> = {
      import: t("workflow.import"),
      watermark: t("workflow.watermark"),
      preview: t("workflow.preview"),
      export: t("workflow.export"),
      security: t("workflow.security"),
    };

    return titles[activeStep];
  }, [activeStep, t]);

  const validation = useMemo(
    () => validateWatermarkConfig(watermarkConfig, loadedPdf),
    [loadedPdf, watermarkConfig],
  );
  const watermarkReady = validation.isValid;
  const validationMessage = validation.messageKey ? t(validation.messageKey) : undefined;
  const watermarkSummary = useMemo(() => getWatermarkSummary(watermarkConfig), [watermarkConfig]);
  const affectedPagesSummary = useMemo(
    () => getAffectedPagesSummary(watermarkConfig, loadedPdf?.pageCount ?? 1),
    [loadedPdf?.pageCount, watermarkConfig],
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
      case "watermark":
        return (
          <WatermarkDesigner
            config={watermarkConfig}
            totalPages={loadedPdf?.pageCount ?? 1}
            onChange={setWatermarkConfig}
          />
        );
      case "preview":
        return (
          <Notice title={t("preview.livePreview")}>
            {previewEnabled ? t("preview.panelOn") : t("preview.panelOff")}
          </Notice>
        );
      case "security":
        return <SecurityCenter loadedPdf={loadedPdf} />;
      case "export":
        return (
          <ExportPanel
            outputFileName={outputFileName}
            onOutputFileNameChange={setOutputFileName}
            cleanupMetadata={cleanupMetadata}
            onCleanupMetadataChange={setCleanupMetadata}
            clearAfterDownload={clearAfterDownload || classifiedMode}
            onClearAfterDownloadChange={setClearAfterDownload}
            removePreviewData={removePreviewData}
            onRemovePreviewDataChange={setRemovePreviewData}
            disabled={!watermarkReady}
            generating={generating}
            error={exportError}
            result={exportResult}
            watermarkSummary={watermarkSummary}
            affectedPagesSummary={affectedPagesSummary}
            validationMessage={validationMessage}
            filenameError={!outputFileName.trim() ? t("validation.outputFilename") : undefined}
            onGenerate={() => void handleGenerateExport()}
            onStartNew={() => clearSession()}
          />
        );
      default:
        return null;
    }
  }, [
    activeStep,
    cleanupMetadata,
    clearAfterDownload,
    clearSession,
    classifiedMode,
    affectedPagesSummary,
    exportError,
    exportResult,
    generating,
    loadedPdf,
    outputFileName,
    previewEnabled,
    removePreviewData,
    t,
    validationMessage,
    watermarkConfig,
    watermarkSummary,
  ]);

  return (
    <AppShell
      activeStep={activeStep}
      onStepChange={setActiveStep}
      fileName={loadedPdf?.fileName}
      canExport={watermarkReady}
      hasDocument={Boolean(loadedPdf)}
      watermarkReady={watermarkReady}
      showSidebar={Boolean(loadedPdf)}
      showRightPanel={Boolean(loadedPdf) || activeStep === "security"}
      onExport={() => setActiveStep("export")}
      rightPanelTitle={rightPanelTitle}
      rightPanel={rightPanel}
    >
      {loadedPdf ? (
        <PdfPreview
          document={loadedPdf}
          watermarkConfig={watermarkConfig}
          currentPage={currentPage}
          zoom={zoom}
          previewEnabled={previewEnabled}
          onPageChange={setPageSafely}
          onZoomChange={setZoom}
          onPreviewEnabledChange={setPreviewEnabled}
        />
      ) : (
        <EmptyState onLoaded={handleLoaded} onOpenSecurity={() => setActiveStep("security")} />
      )}
    </AppShell>
  );
}
