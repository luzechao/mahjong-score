import { loadAndCompile, loadLiteRt, Tensor } from "@litertjs/core";

const SIZE = 640;
const ANCHORS = 8400;
const CLASSES = [
  "1m", "1p", "1s", "1z", "2m", "2p", "2s", "2z",
  "3m", "3p", "3s", "3z", "4m", "4p", "4s", "4z",
  "5m", "5p", "5s", "5z", "6m", "6p", "6s", "6z",
  "7m", "7p", "7s", "7z", "8m", "8p", "8s",
  "9m", "9p", "9s", "", "0m", "0p", "0s",
];

export interface Detection {
  tile: string;
  confidence: number | null;
  box: [number, number, number, number] | null;
}

let modelPromise: ReturnType<typeof loadAndCompile> | undefined;

function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadLiteRt(`${import.meta.env.BASE_URL}litert/`);
      const model = await loadAndCompile(
        `${import.meta.env.BASE_URL}mahjong_yolo.tflite`,
        { accelerator: "wasm" },
      );
      const input = model.getInputDetails()[0];
      const output = model.getOutputDetails()[0];
      if (
        !input || !output ||
        input.dtype !== "float32" || output.dtype !== "float32" ||
        input.shape.join(",") !== "1,640,640,3" ||
        output.shape.join(",") !== "1,42,8400"
      ) {
        model.delete();
        throw new Error("Unsupported recognition model input or output.");
      }
      return model;
    })().catch((error: unknown) => {
      modelPromise = undefined;
      throw error;
    });
  }
  return modelPromise;
}

function overlap(a: Detection, b: Detection): number {
  if (!a.box || !b.box) return 0;
  const [ax, ay, aw, ah] = a.box;
  const [bx, by, bw, bh] = b.box;
  const width = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
  const height = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  const intersection = width * height;
  const union = aw * ah + bw * bh - intersection;
  return union > 0 ? intersection / union : 0;
}

export function decodeDetections(
  output: Float32Array,
  width: number,
  height: number,
): Detection[] {
  if (output.length !== (4 + CLASSES.length) * ANCHORS) {
    throw new Error("Unexpected recognition output size.");
  }
  const scale = Math.min(SIZE / width, SIZE / height);
  const drawnWidth = Math.floor(width * scale);
  const drawnHeight = Math.floor(height * scale);
  const left = (SIZE - drawnWidth) / 2;
  const top = (SIZE - drawnHeight) / 2;
  const candidates: Detection[] = [];
  for (let i = 0; i < ANCHORS; i++) {
    let confidence = 0;
    let classIndex = -1;
    for (let c = 0; c < CLASSES.length; c++) {
      const score = output[(4 + c) * ANCHORS + i];
      if (score > confidence) {
        confidence = score;
        classIndex = c;
      }
    }
    if (confidence <= 0.2 || classIndex < 0) continue;
    const w = output[2 * ANCHORS + i] * SIZE / drawnWidth;
    const h = output[3 * ANCHORS + i] * SIZE / drawnHeight;
    const x = (output[i] * SIZE - left) / drawnWidth - w / 2;
    const y = (output[ANCHORS + i] * SIZE - top) / drawnHeight - h / 2;
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) continue;
    candidates.push({ tile: CLASSES[classIndex], confidence, box: [x, y, w, h] });
  }
  candidates.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const selected: Detection[] = [];
  for (const candidate of candidates) {
    if (!selected.some((other) => overlap(candidate, other) > 0.45)) {
      selected.push(candidate);
    }
  }
  return selected.sort((a, b) => {
    if (!a.box || !b.box) return 0;
    return a.box[1] - b.box[1] || a.box[0] - b.box[0];
  });
}

export async function recognizeTiles(image: HTMLImageElement): Promise<Detection[]> {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) throw new Error("Image has no dimensions.");
  const model = await getModel();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image processing is unavailable.");
  const scale = Math.min(SIZE / width, SIZE / height);
  const drawnWidth = Math.floor(width * scale);
  const drawnHeight = Math.floor(height * scale);
  context.fillStyle = "black";
  context.fillRect(0, 0, SIZE, SIZE);
  context.drawImage(image, (SIZE - drawnWidth) / 2, (SIZE - drawnHeight) / 2, drawnWidth, drawnHeight);
  const pixels = context.getImageData(0, 0, SIZE, SIZE).data;
  const input = new Float32Array(SIZE * SIZE * 3);
  for (let i = 0; i < SIZE * SIZE; i++) {
    input[i * 3] = pixels[i * 4] / 255;
    input[i * 3 + 1] = pixels[i * 4 + 1] / 255;
    input[i * 3 + 2] = pixels[i * 4 + 2] / 255;
  }
  const tensor = new Tensor(input, [1, SIZE, SIZE, 3]);
  let outputs: Tensor[] = [];
  try {
    outputs = await model.run(tensor);
    if (!outputs[0]) throw new Error("Recognition returned no output.");
    const data = await outputs[0].data();
    if (!(data instanceof Float32Array)) throw new Error("Unexpected recognition output type.");
    return decodeDetections(data, width, height);
  } finally {
    tensor.delete();
    outputs.forEach((output) => output.delete());
  }
}
