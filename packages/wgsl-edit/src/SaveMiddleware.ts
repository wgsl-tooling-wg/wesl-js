import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { saveEndpoint } from "./SaveEndpoint.ts";

/** Paths recently written by autosave; consumed by hotUpdate to suppress reloads. */
export const pendingSaves = new Set<string>();

/** Connect-style middleware that handles POST <saveEndpoint> to write files to disk. */
export function weslSaveMiddleware(
  projectRoot: string,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void {
  return (req, res, next) => {
    if (req.url !== saveEndpoint) return next();
    if (req.method !== "POST") return next();
    readBody(req).then(body => handleSave(body, projectRoot, res), next);
  };
}

interface SaveRequest {
  root: string;
  file: string;
  content: string;
}

async function handleSave(
  raw: string,
  projectRoot: string,
  res: ServerResponse,
): Promise<void> {
  let body: SaveRequest;
  try {
    body = JSON.parse(raw);
  } catch {
    return respond(res, 400, "invalid JSON");
  }

  const { root, file, content } = body;
  if (!file || typeof content !== "string") {
    return respond(res, 400, "missing file or content");
  }

  const resolved = path.resolve(projectRoot, root ?? ".", file);
  if (!resolved.startsWith(projectRoot + path.sep)) {
    return respond(res, 403, "path outside project root");
  }

  try {
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content);
    pendingSaves.add(resolved);
    respond(res, 200, "ok");
  } catch (e: any) {
    console.error("[wgsl-edit] save failed:", e.message);
    respond(res, 500, e.message);
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function respond(res: ServerResponse, status: number, msg: string): void {
  res.writeHead(status, { "Content-Type": "text/plain" });
  res.end(msg);
}
