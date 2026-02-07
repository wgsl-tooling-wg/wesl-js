import * as vscode from "vscode";
import type { WeslBundle } from "wesl";
import type { CompileErrorLocation } from "wgsl-play/element";
import { loadProject } from "./ProjectLoader.ts";

type WebviewMessage =
  | { kind: "ready" }
  | { kind: "compileError"; message: string; locations: CompileErrorLocation[] }
  | { kind: "compileSuccess" };

/** VS Code webview panel for live shader preview using wgsl-play. */
export class ToyPreviewPanel {
  static currentPanel: ToyPreviewPanel | undefined;
  static readonly viewType = "weslToyPreview";
  static diagnostics = vscode.languages.createDiagnosticCollection("wesl");

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private currentDoc: vscode.TextDocument;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    doc: vscode.TextDocument,
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.currentDoc = doc;

    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      msg => this.handleMessage(msg),
      null,
      this.disposables,
    );
  }

  private handleMessage(msg: WebviewMessage): void {
    switch (msg.kind) {
      case "ready":
        this.sendSource();
        break;
      case "compileError": {
        const severityMap = {
          error: vscode.DiagnosticSeverity.Error,
          warning: vscode.DiagnosticSeverity.Warning,
          info: vscode.DiagnosticSeverity.Information,
        };
        const diagnostics = msg.locations.map(loc => {
          const line = Math.max(0, loc.line - 1); // VS Code is 0-indexed
          const col = Math.max(0, loc.column);
          const end = col + (loc.length ?? 1);
          const range = new vscode.Range(line, col, line, end);
          return new vscode.Diagnostic(
            range,
            loc.message,
            severityMap[loc.severity],
          );
        });
        ToyPreviewPanel.diagnostics.set(this.currentDoc.uri, diagnostics);
        break;
      }
      case "compileSuccess":
        ToyPreviewPanel.diagnostics.delete(this.currentDoc.uri);
        break;
    }
  }

  /** Show preview panel for a document, creating it if needed. */
  static createOrShow(
    extensionUri: vscode.Uri,
    doc: vscode.TextDocument,
  ): void {
    const column = vscode.ViewColumn.Beside;

    if (ToyPreviewPanel.currentPanel) {
      ToyPreviewPanel.currentPanel.currentDoc = doc;
      ToyPreviewPanel.currentPanel.panel.reveal(column);
      ToyPreviewPanel.currentPanel.sendSource();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ToyPreviewPanel.viewType,
      "Shader Preview",
      column,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist")],
      },
    );

    ToyPreviewPanel.currentPanel = new ToyPreviewPanel(
      panel,
      extensionUri,
      doc,
    );
  }

  /** Refresh the preview if it's showing the given document. */
  static updateIfActive(doc: vscode.TextDocument): void {
    const panel = ToyPreviewPanel.currentPanel;
    if (panel && panel.currentDoc.uri.toString() === doc.uri.toString()) {
      panel.currentDoc = doc;
      panel.sendSource();
    }
  }

  /** Send shader source to webview, loading project deps if available. */
  private async sendSource(): Promise<void> {
    const filePath = this.currentDoc.uri.fsPath;
    const project = await loadProject(filePath, { virtualLibs: ["test"] });

    if (project) {
      // May have unsaved changes
      project.weslSrc[project.rootModuleName] = this.currentDoc.getText();
      this.sendProjectMessage(
        project.weslSrc,
        project.rootModuleName,
        project.packageName,
        project.libs,
      );
    } else {
      // Fallback to single file
      const weslSrc = { main: this.currentDoc.getText() };
      this.sendProjectMessage(weslSrc, "main", "main", []);
    }
  }

  private sendProjectMessage(
    weslSrc: Record<string, string>,
    rootModuleName: string,
    packageName: string,
    libs: WeslBundle[],
  ): void {
    this.panel.webview.postMessage({
      type: "setProject",
      weslSrc,
      rootModuleName,
      packageName,
      libs,
    });
  }

  private getHtml(): string {
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "main.mjs"),
    );

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #1e1e1e; }
    wgsl-play { width: 512px; height: 512px; display: block; }
  </style>
</head>
<body>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    ToyPreviewPanel.currentPanel = undefined;
    ToyPreviewPanel.diagnostics.delete(this.currentDoc.uri);
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
