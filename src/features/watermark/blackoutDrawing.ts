import type { BlackoutRect } from "../../types/watermark";
import { normalizeBlackoutRect } from "./blackout";

interface Point {
  x: number;
  y: number;
}

export function createBlackoutRectFromDrag(input: {
  id: string;
  page: number;
  start: Point;
  end: Point;
  zoom: number;
  pageHeight: number;
}): BlackoutRect {
  const left = Math.min(input.start.x, input.end.x);
  const top = Math.min(input.start.y, input.end.y);
  const width = Math.abs(input.end.x - input.start.x);
  const height = Math.abs(input.end.y - input.start.y);
  const zoom = Math.max(0.01, input.zoom);

  return normalizeBlackoutRect({
    id: input.id,
    page: input.page,
    x: left / zoom,
    y: (input.pageHeight - top - height) / zoom,
    width: width / zoom,
    height: height / zoom,
  });
}
