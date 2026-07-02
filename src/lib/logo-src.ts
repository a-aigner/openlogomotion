const RASTER_EXT = ["png", "jpg", "jpeg", "webp"];

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function logoKind(mime: string, name: string): "svg" | "raster" {
  if (mime === "image/svg+xml" || ext(name) === "svg") return "svg";
  return "raster";
}

export function isSupportedLogo(mime: string, name: string): boolean {
  const e = ext(name);
  if (mime === "image/svg+xml" || e === "svg") return true;
  if (mime.startsWith("image/") && mime !== "image/svg+xml") return true;
  return RASTER_EXT.includes(e);
}

export function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
