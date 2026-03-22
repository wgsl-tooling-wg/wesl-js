import * as fs from "node:fs";
import * as path from "node:path";

export interface SnapshotConfig {
  snapshotDir?: string;
  diffDir?: string;
  actualDir?: string;
  /** Vitest snapshot update mode: "all", "new", or "none" */
  updateSnapshot?: string;
}

/** Manage reference/actual/diff snapshot files. */
export class ImageSnapshotManager {
  private config: Required<SnapshotConfig>;
  private testDir: string;

  constructor(testFilePath: string, config: SnapshotConfig = {}) {
    this.testDir = path.dirname(testFilePath);
    const defaultMode = process.env.CI === "true" ? "none" : "new";
    this.config = {
      snapshotDir: config.snapshotDir ?? "__image_snapshots__",
      diffDir: config.diffDir ?? "__image_diffs__",
      actualDir: config.actualDir ?? "__image_actual__",
      updateSnapshot: config.updateSnapshot ?? defaultMode,
    };
  }

  referencePath(snapshotName: string): string {
    return path.join(
      this.testDir,
      this.config.snapshotDir,
      `${snapshotName}.png`,
    );
  }

  actualPath(snapshotName: string): string {
    return path.join(
      this.testDir,
      this.config.actualDir,
      `${snapshotName}.png`,
    );
  }

  diffPath(snapshotName: string): string {
    return path.join(this.testDir, this.config.diffDir, `${snapshotName}.png`);
  }

  /** Update failing snapshots (only in "all" mode with vitest -u) */
  shouldUpdate(): boolean {
    return (
      this.config.updateSnapshot === "all" ||
      !!process.env.VITEST_UPDATE_SNAPSHOTS
    );
  }

  /** Create missing snapshots ("all" or "new" mode) */
  shouldCreateNew(): boolean {
    return (
      this.config.updateSnapshot === "all" ||
      this.config.updateSnapshot === "new" ||
      !!process.env.VITEST_UPDATE_SNAPSHOTS
    );
  }

  async loadReference(snapshotName: string): Promise<Buffer | null> {
    const refPath = this.referencePath(snapshotName);
    if (!fs.existsSync(refPath)) return null;
    return fs.promises.readFile(refPath);
  }

  async saveReference(buffer: Buffer, snapshotName: string): Promise<void> {
    await this.saveToPath(buffer, this.referencePath(snapshotName));
  }

  async saveActual(buffer: Buffer, snapshotName: string): Promise<void> {
    await this.saveToPath(buffer, this.actualPath(snapshotName));
  }

  async saveDiff(buffer: Buffer, snapshotName: string): Promise<void> {
    await this.saveToPath(buffer, this.diffPath(snapshotName));
  }

  private async saveToPath(buffer: Buffer, filepath: string): Promise<void> {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(filepath, buffer);
  }
}
