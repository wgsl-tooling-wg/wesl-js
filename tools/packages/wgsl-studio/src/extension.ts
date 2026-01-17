import * as vscode from "vscode";
import { ToyPreviewPanel } from "./ToyPreviewPanel.ts";
import { WeslTestController } from "./WeslTestController.ts";

/*
 * VS Code extension entry point.
 *
 * activate() is called once when the extension first loads (e.g. user runs a command).
 * Register commands, event listeners, etc. and push them to context.subscriptions
 * so VS Code can clean them up when the extension deactivates.
 *
 * This extension:
 *  - Registers "wgsl.previewToyShader" command to open a shader preview panel
 *  - Watches for file saves to update the preview automatically
 *  - Provides test explorer integration for @test functions in WESL files
 */
export function activate(context: vscode.ExtensionContext): void {
  const testController = new WeslTestController(context);
  context.subscriptions.push(testController);
  const previewCmd = vscode.commands.registerCommand(
    "wgsl.previewToyShader",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }
      ToyPreviewPanel.createOrShow(context.extensionUri, editor.document);
    },
  );

  context.subscriptions.push(previewCmd);

  const saveWatcher = vscode.workspace.onDidSaveTextDocument(doc => {
    if (doc.languageId === "wgsl" || doc.fileName.endsWith(".wesl")) {
      ToyPreviewPanel.updateIfActive(doc);
    }
  });
  context.subscriptions.push(saveWatcher);
}

export function deactivate(): void {}
