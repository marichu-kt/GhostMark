import { useEffect, useMemo, useRef, useState } from "react";
import type { DocumentLayer } from "../../types/watermark";
import { FLATTENED_EXPORT_SCALE } from "../../features/pdf/flattenedExportPlan";
import { resolvePageRules } from "../../features/pdf/pageRules";
import {
  drawImageWatermarkToCanvas,
  drawSealWatermarkToCanvas,
} from "../../features/watermark/canvasWatermarkRenderer";
import { getPatternTextSize, getTextLayerSize } from "../../features/watermark/layerGeometry";
import { resolvePreviewWatermarkPosition } from "../../features/watermark/previewGeometry";
import { drawSafeLayerContoursToCanvas } from "../../features/watermark/safelayerCanvasRenderer";
import { SAFELAYER_PREVIEW_PAGE_LIMIT } from "../../features/watermark/safelayerRenderer";
import { createSafeLayerSvgMarkup } from "../../features/watermark/safelayerSvgRenderer";

interface WatermarkPreviewOverlayProps {
  layers: DocumentLayer[];
  enabled: boolean;
  zoom: number;
  currentPage: number;
  totalPages: number;
  pageWidth: number;
  pageHeight: number;
  selectedLayerId?: string | null;
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return `data:${mimeType};base64,${btoa(binary)}`;
}

function layerAppliesToPage(layer: DocumentLayer, pageIndex: number, totalPages: number): boolean {
  try {
    return resolvePageRules(layer.pages, totalPages).includes(pageIndex);
  } catch {
    return false;
  }
}

function SafeLayerCanvasPreview({
  layer,
  currentPage,
  pageWidth,
  pageHeight,
  zoom,
  selected,
}: {
  layer: DocumentLayer;
  currentPage: number;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  selected: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backingScale = FLATTENED_EXPORT_SCALE / Math.max(0.01, zoom);
  const width = Math.max(1, Math.round(pageWidth * backingScale));
  const height = Math.max(1, Math.round(pageHeight * backingScale));
  const { model, svg } = useMemo(
    () =>
      createSafeLayerSvgMarkup({
        layer,
        pageNumber: currentPage,
        width,
        height,
        quality: "preview",
      }),
    [currentPage, height, layer, width],
  );

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, width, height);
    drawSafeLayerContoursToCanvas({ context, model, layer, quality: "preview" });
  }, [height, layer, model, width]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          width: pageWidth,
          height: pageHeight,
          outline: selected ? "1px solid rgba(198,40,40,0.45)" : undefined,
        }}
      />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{ width: pageWidth, height: pageHeight }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </>
  );
}

function CanvasWatermarkLayerPreview({
  layer,
  image,
  pageWidth,
  pageHeight,
  zoom,
}: {
  layer: DocumentLayer;
  image?: HTMLImageElement;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || zoom <= 0) {
      return;
    }

    const logicalPageWidth = pageWidth / zoom;
    const logicalPageHeight = pageHeight / zoom;
    const deviceScale = Math.max(1, window.devicePixelRatio || 1);
    const canvasWidth = Math.max(1, Math.round(pageWidth * deviceScale));
    const canvasHeight = Math.max(1, Math.round(pageHeight * deviceScale));
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");

    if (!context || logicalPageWidth <= 0 || logicalPageHeight <= 0) {
      return;
    }

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    const scaleX = canvasWidth / logicalPageWidth;
    const scaleY = canvasHeight / logicalPageHeight;

    if (layer.type === "seal") {
      drawSealWatermarkToCanvas({
        context,
        layer,
        pageWidth: logicalPageWidth,
        pageHeight: logicalPageHeight,
        canvasWidth,
        canvasHeight,
        scaleX,
        scaleY,
      });
    }

    if (layer.type === "image" && image) {
      drawImageWatermarkToCanvas({
        context,
        layer,
        image,
        pageWidth: logicalPageWidth,
        pageHeight: logicalPageHeight,
        canvasWidth,
        canvasHeight,
        scaleX,
        scaleY,
      });
    }
  }, [image, layer, pageHeight, pageWidth, zoom]);

  if (layer.type === "image" && !image) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      aria-hidden="true"
      style={{ width: pageWidth, height: pageHeight }}
    />
  );
}

export function WatermarkPreviewOverlay({
  layers,
  enabled,
  zoom,
  currentPage,
  totalPages,
  pageWidth,
  pageHeight,
  selectedLayerId,
}: WatermarkPreviewOverlayProps) {
  const [imageElements, setImageElements] = useState<Map<string, HTMLImageElement>>(() => new Map());
  const imageUrls = useMemo(() => {
    const urls = new Map<string, string>();

    for (const layer of layers) {
      if (layer.type === "image" && layer.imageData && layer.imageMimeType) {
        urls.set(layer.id, bytesToDataUrl(layer.imageData, layer.imageMimeType));
      }
    }

    return urls;
  }, [layers]);

  useEffect(() => {
    let cancelled = false;

    for (const [layerId, imageUrl] of imageUrls) {
      const image = new Image();
      image.onload = () => {
        if (cancelled) {
          return;
        }

        setImageElements((current) => {
          const next = new Map(current);
          next.set(layerId, image);
          return next;
        });
      };
      image.src = imageUrl;
    }

    setImageElements((current) => {
      const next = new Map<string, HTMLImageElement>();

      for (const [layerId, imageUrl] of imageUrls) {
        const image = current.get(layerId);

        if (image?.src === imageUrl) {
          next.set(layerId, image);
        }
      }

      return next.size === current.size ? current : next;
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrls]);

  if (!enabled || pageWidth <= 0 || pageHeight <= 0) {
    return null;
  }

  const pageIndex = currentPage - 1;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {layers.map((layer) => {
        if (!layer.enabled || !layerAppliesToPage(layer, pageIndex, totalPages)) {
          return null;
        }

        const opacity = Math.min(1, Math.max(0, layer.opacity));
        const fontSize = Math.max(10, layer.fontSize * zoom);
        const textColor = layer.color || "#2f343a";
        const baseText = layer.text.trim();
        const selected = layer.id === selectedLayerId;

        if (layer.type === "text" && baseText) {
          const size = getTextLayerSize({ ...layer, fontSize });
          const position = resolvePreviewWatermarkPosition({
            layer,
            pageWidth,
            pageHeight,
            elementWidth: size.width,
            elementHeight: size.height,
            zoom,
            rotation: layer.rotation,
          });

          return (
            <div
              key={layer.id}
              className="absolute whitespace-nowrap font-bold uppercase tracking-normal"
              style={{
                ...position,
                width: size.width,
                lineHeight: `${size.height}px`,
                color: textColor,
                fontSize,
                opacity,
                transformOrigin: "center",
                outline: selected ? "1px solid rgba(198,40,40,0.45)" : undefined,
              }}
            >
              {baseText}
            </div>
          );
        }

        if (layer.type === "pattern" && baseText) {
          const spacingX = Math.max(70, layer.patternSpacingX * zoom);
          const spacingY = Math.max(60, layer.patternSpacingY * zoom);
          const size = getPatternTextSize({ ...layer, fontSize });
          const columns = Math.ceil(pageWidth / spacingX) + 4;
          const rows = Math.ceil(pageHeight / spacingY) + 4;
          const marks = Array.from({ length: rows * columns }, (_, index) => {
            const row = Math.floor(index / columns);
            const column = index % columns;
            const stagger = layer.patternStaggered && row % 2 === 1 ? spacingX / 2 : 0;

            return {
              key: `${row}-${column}`,
              x: column * spacingX - spacingX + stagger,
              y: row * spacingY - spacingY,
            };
          });

          return marks.map((mark) => (
            <div
              key={`${layer.id}-${mark.key}`}
              className="absolute whitespace-nowrap font-bold uppercase"
              style={{
                left: mark.x,
                top: mark.y,
                width: size.width,
                lineHeight: `${size.height}px`,
                color: textColor,
                fontSize,
                opacity,
                transform: `rotate(${layer.rotation}deg)`,
                transformOrigin: "center",
              }}
            >
              {baseText}
            </div>
          ));
        }

        if (layer.type === "safelayer") {
          if (currentPage > SAFELAYER_PREVIEW_PAGE_LIMIT) {
            return null;
          }

          return (
            <SafeLayerCanvasPreview
              key={layer.id}
              layer={layer}
              currentPage={currentPage}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              zoom={zoom}
              selected={selected}
            />
          );
        }

        if (layer.type === "blackout") {
          return layer.blackoutRects
            .filter((rect) => rect.page === currentPage)
            .map((rect) => (
              <div
                key={`${layer.id}-${rect.id}`}
                className="absolute bg-black"
                style={{
                  left: rect.x * zoom,
                  top: pageHeight - (rect.y + rect.height) * zoom,
                  width: Math.max(1, rect.width * zoom),
                  height: Math.max(1, rect.height * zoom),
                  outline: selected ? "1px solid rgba(255,255,255,0.65)" : undefined,
                }}
              />
            ));
        }

        if (layer.type === "seal") {
          return (
            <CanvasWatermarkLayerPreview
              key={layer.id}
              layer={layer}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              zoom={zoom}
            />
          );
        }

        if (layer.type === "image") {
          const image = imageElements.get(layer.id);

          return (
            <CanvasWatermarkLayerPreview
              key={layer.id}
              layer={layer}
              image={image}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              zoom={zoom}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
