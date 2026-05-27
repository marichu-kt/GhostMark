import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PdfExportResult, LoadedPdf } from "../types/pdf";
import type { WatermarkConfig } from "../types/watermark";
import { useAppSettings } from "./AppProviders";
import { createDownloadFileName } from "../features/pdf/fileFormatting";
import { exportPdf } from "../features/pdf/exportPdf";
import { cleanupSessionReferences, wipeBytes } from "../features/security/sessionCleanup";
import { createDefaultWatermarkConfig } from "../features/watermark/defaults";
import { useTranslation } from "../features/i18n/useTranslation";
import { AppShell } from "../components/layout/AppShell";
import { EmptyState } from "../components/layout/EmptyState";
import type { WorkflowStep } from "../components/layout/Sidebar";
import { PdfImporter } from "../components/pdf/PdfImporter";
import { PdfPreview } from "../components/pdf/PdfPreview";
import { PrivacyNotice } from "../components/security/PrivacyNotice";
import { SecurityCenter } from "../components/security/SecurityCenter";
import { WatermarkDesigner } from "../components/watermark/WatermarkDesigner";
import { PageRulesPanel } from "../components/watermark/PageRulesPanel";
import { ExportPanel } from "../components/export/ExportPanel";

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
    setActiveStep("design");
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
    if (!loadedPdf) {
      setExportError(t("export.noDocument"));
      return;
    }

    if (watermarkConfig.type === "image" && !watermarkConfig.imageData) {
      setExportError(t("export.uploadImageFirst"));
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
      design: t("workflow.design"),
      pageRules: t("workflow.pageRules"),
      security: t("workflow.security"),
      export: t("workflow.export"),
    };

    return titles[activeStep];
  }, [activeStep, t]);

  const rightPanel = useMemo(() => {
    switch (activeStep) {
      case "import":
        return (
          <>
            <PdfImporter
              onLoaded={handleLoaded}
              loadedPdf={loadedPdf}
              onRemove={removeDocument}
              onClear={() => clearSession()}
            />
            <PrivacyNotice />
          </>
        );
      case "design":
        return <WatermarkDesigner config={watermarkConfig} onChange={setWatermarkConfig} />;
      case "pageRules":
        return (
          <PageRulesPanel
            value={watermarkConfig.pages}
            totalPages={loadedPdf?.pageCount ?? 1}
            onChange={(pages) => setWatermarkConfig((config) => ({ ...config, pages }))}
          />
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
            disabled={!loadedPdf}
            generating={generating}
            error={exportError}
            result={exportResult}
            onGenerate={() => void handleGenerateExport()}
            onStartNew={() => clearSession()}
            onClearSession={() => clearSession()}
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
    exportError,
    exportResult,
    generating,
    loadedPdf,
    outputFileName,
    removePreviewData,
    watermarkConfig,
  ]);

  return (
    <AppShell
      activeStep={activeStep}
      onStepChange={setActiveStep}
      fileName={loadedPdf?.fileName}
      canExport={Boolean(loadedPdf)}
      onExport={() => setActiveStep("export")}
      rightPanelTitle={rightPanelTitle}
      rightPanel={rightPanel}
    >
      {loadedPdf ? (
        <PdfPreview
          document={loadedPdf}
          currentPage={currentPage}
          zoom={zoom}
          onPageChange={setPageSafely}
          onZoomChange={setZoom}
        />
      ) : (
        <EmptyState onLoaded={handleLoaded} onOpenSecurity={() => setActiveStep("security")} />
      )}
    </AppShell>
  );
}
