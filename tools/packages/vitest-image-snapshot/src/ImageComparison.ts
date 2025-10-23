import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/** Pixel data extracted from an image buffer or ImageData object. */
interface PixelData {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}

/** Options controlling image comparison thresholds and behavior. */
export interface ComparisonOptions {
  /** Color difference threshold (0-1). Default: 0.1 */
  threshold?: number;
  /** Max ratio of pixels allowed to differ (0-1). Default: 0 */
  allowedPixelRatio?: number;
  /** Max absolute number of pixels allowed to differ. Default: 0 */
  allowedPixels?: number;
  /** If true, disables detecting and ignoring anti-aliased pixels. Default: true */
  includeAA?: boolean;
}

export interface ComparisonResult {
  pass: boolean;
  diffBuffer?: Buffer;
  message: string;
  mismatchedPixels: number;
  mismatchedPixelRatio: number;
}

export async function compareImages(
  reference: ImageData | Buffer,
  actual: ImageData | Buffer,
  options: ComparisonOptions = {},
): Promise<ComparisonResult> {
  const {
    threshold = 0.1,
    allowedPixelRatio = 0,
    allowedPixels = 0,
    includeAA = true,
  } = options;
  const refPixels = toPixelData(reference);
  const actualPixels = toPixelData(actual);

  const mismatch = dimensionMismatch(refPixels, actualPixels);
  if (mismatch) return mismatch;

  const { width, height } = refPixels;
  const diffPng = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    refPixels.data,
    actualPixels.data,
    diffPng.data,
    width,
    height,
    { threshold, includeAA },
  );

  return formatResult(
    mismatchedPixels,
    width * height,
    allowedPixels,
    allowedPixelRatio,
    diffPng,
  );
}

function dimensionMismatch(
  refPixels: PixelData,
  actualPixels: PixelData,
): ComparisonResult | null {
  if (
    refPixels.width !== actualPixels.width ||
    refPixels.height !== actualPixels.height
  ) {
    return {
      pass: false,
      message: `Image dimensions don't match: ${refPixels.width}×${refPixels.height} vs ${actualPixels.width}×${actualPixels.height}`,
      mismatchedPixels: refPixels.width * refPixels.height,
      mismatchedPixelRatio: 1.0,
    };
  }
  return null;
}

function formatResult(
  mismatchedPixels: number,
  totalPixels: number,
  allowedPixels: number,
  allowedPixelRatio: number,
  diffPng: PNG,
): ComparisonResult {
  const mismatchedPixelRatio = mismatchedPixels / totalPixels;
  const pass =
    mismatchedPixels <= allowedPixels ||
    mismatchedPixelRatio <= allowedPixelRatio;
  const diffBuffer = pass ? undefined : PNG.sync.write(diffPng);
  const percentage = (mismatchedPixelRatio * 100).toFixed(2);
  const message = pass
    ? `Images match (${mismatchedPixels} pixels differ, ${percentage}%)`
    : `Images don't match: ${mismatchedPixels} pixels differ (${percentage}%), threshold: ${allowedPixelRatio * 100}%`;
  return { pass, diffBuffer, message, mismatchedPixels, mismatchedPixelRatio };
}

function toPixelData(input: ImageData | Buffer): PixelData {
  if (Buffer.isBuffer(input)) {
    const png = PNG.sync.read(input);
    return { data: png.data, width: png.width, height: png.height };
  }
  return { data: input.data, width: input.width, height: input.height };
}
