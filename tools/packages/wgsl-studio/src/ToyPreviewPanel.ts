import * as vscode from "vscode";
import type { WeslBundle } from "wesl";
import { loadProject } from "./ProjectLoader.ts";

export class ToyPreviewPanel {
  static currentPanel: ToyPreviewPanel | undefined;
  static readonly viewType = "weslToyPreview";

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

  private handleMessage(msg: { type: string; message?: string }): void {
    switch (msg.type) {
      case "ready":
        this.sendSource();
        break;
      case "compileError":
        if (msg.message) {
          vscode.window.showErrorMessage(`Shader error: ${msg.message}`);
        }
        break;
    }
  }

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

  static updateIfActive(doc: vscode.TextDocument): void {
    const panel = ToyPreviewPanel.currentPanel;
    if (panel && panel.currentDoc.uri.toString() === doc.uri.toString()) {
      panel.currentDoc = doc;
      panel.sendSource();
    }
  }

  private async sendSource(): Promise<void> {
    const filePath = this.currentDoc.uri.fsPath;
    const project = await loadProject(filePath);

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
    wgsl-play { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    ToyPreviewPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
