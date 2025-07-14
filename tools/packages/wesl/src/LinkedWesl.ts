import type { SrcMap } from "mini-parse";
import { assertThatDebug } from "./Assertions.ts";
import { errorHighlight, offsetToLineNumber } from "./Util.ts";
import type { WeslDevice } from "./WeslDevice.ts";

/** Results of shader compilation. Has {@link WeslGPUCompilationMessage}
 * which are aware of the WESL module that an error was thrown from. */
export interface WeslGPUCompilationInfo extends GPUCompilationInfo {
  messages: WeslGPUCompilationMessage[];
}

export interface WeslGPUCompilationMessage extends GPUCompilationMessage {
  module: {
    // LATER this should be a qualified module path.
    // And something else should map it to a URL that is relative to the correct place.
    url: string;
    // LATER: I don't think that the text should be a part of the compilation message.
    // Instead the module url should be usable as a key.
    text?: string;
  };
}

/**
 * A {@link GPUValidationError} with an inner error (for a stack trace).
 * Can also point at a WESL source file.
 */
export interface ExtendedGPUValidationError extends GPUValidationError {
  cause?: Error;
  compilationInfo?: WeslGPUCompilationInfo;
}

/**
 * Multiple WESL files that have been linked together to produce WGSL code.
 *
 * Call {@link LinkedWesl.createShaderModule} on a {@link WeslDevice}
 * to make the error reporting aware of the WESL code.
 */
export class LinkedWesl {
  sourceMap: SrcMap;

  constructor(sourceMap: SrcMap) {
    this.sourceMap = sourceMap;
  }

  /**
   * Creates a {@link GPUShaderModule}.
   * When errors occur, they will point at the original WESL source code.
   *
   * The compilation info {@link GPUShaderModule.getCompilationInfo}
   * can be remapped with {@link mapGPUCompilationInfo}
   * @param device GPUDevice. Preferably a {@link WeslDevice} for better error reporting.
   * @param descriptor - Description of the {@link GPUShaderModule} to create.
   */
  createShaderModule(
    device: GPUDevice | WeslDevice,
    descriptor?: Omit<GPUShaderModuleDescriptor, "code">,
  ): GPUShaderModule {
    // Skip the custom behaviour if we do not have a WESL device.
    if (!("injectError" in device)) {
      return device.createShaderModule({
        ...descriptor,
        code: this.dest,
      });
    }

    device.pushErrorScope("validation"); // Suppress the normal error
    const module = device.createShaderModule({
      ...descriptor,
      code: this.dest,
    });
    device.popErrorScope();
    // And report the error!
    const { promise, resolve } = Promise.withResolvers<GPUError | null>();
    device.injectError("validation", promise); // Inject our custom error
    module.getCompilationInfo().then(compilationInfo => {
      if (compilationInfo.messages.length === 0) {
        resolve(null);
        return;
      }

      const mappedCompilationInfo = this.mapGPUCompilationInfo(compilationInfo);
      const errorMessage = compilationInfoToErrorMessage(
        mappedCompilationInfo,
        module,
      );
      // Error message cannot be null, since we're passing at least one message to it.
      assertThatDebug(errorMessage !== null);
      const error: ExtendedGPUValidationError = new GPUValidationError(
        errorMessage,
      );
      error.cause = new Error("createShaderModule failed");
      error.compilationInfo = mappedCompilationInfo;
      resolve(error);
    });
    return module;
  }

  /**
   * Use {@link LinkedWesl.createShaderModule} for a
   * better error reporting experience.
   */
  get dest() {
    return this.sourceMap.dest.text;
  }

  /** Turns raw compilation info into compilation info
   * that points at the WESL sources. */
  public mapGPUCompilationInfo(
    compilationInfo: GPUCompilationInfo,
  ): WeslGPUCompilationInfo {
    return {
      __brand: "GPUCompilationInfo",
      messages: compilationInfo.messages.map(v =>
        this.mapGPUCompilationMessage(v),
      ),
    };
  }

  private mapGPUCompilationMessage(
    message: GPUCompilationMessage,
  ): WeslGPUCompilationMessage {
    const srcMap = this.sourceMap;
    const srcPosition = srcMap.destToSrc(message.offset);
    // LATER what if this gets mapped to a completely different place?
    const srcEndPosition =
      message.length > 0 ?
        srcMap.destToSrc(message.offset + message.length)
      : srcPosition;
    const length = srcEndPosition.position - srcPosition.position;

    const [lineNum, linePos] = offsetToLineNumber(
      srcPosition.position,
      srcPosition.src.text,
    );

    return {
      __brand: "GPUCompilationMessage",
      type: message.type,
      message: message.message,
      offset: srcPosition.position,
      length,
      lineNum,
      linePos,
      module: {
        url: srcPosition.src.path ?? "",
        text: srcPosition.src.text,
      },
    };
  }
}

/**
 * Tries to imitate the way the browser logs the compilation info.
 * Does not do the remapping.
 * @returns A string with errors, or `null` if there were no compilation messages.
 */
function compilationInfoToErrorMessage(
  compilationInfo: WeslGPUCompilationInfo,
  shaderModule: GPUShaderModule,
): string | null {
  if (compilationInfo.messages.length === 0) return null;

  let result = `Compilation log for [Invalid ShaderModule (${
    shaderModule.label || "unlabled"
  })]:\n`;
  const errorCount = compilationInfo.messages.filter(
    v => v.type === "error",
  ).length;
  if (errorCount > 0) {
    result += `${errorCount} error(s) generated while compiling the shader:\n`;
  }
  for (const message of compilationInfo.messages) {
    const { lineNum, linePos } = message;

    result += `${message.module.url}:${lineNum}:${linePos}`;
    result += ` ${message.type}: ${message.message}\n`;
    // LATER unmangle code snippets in the message

    const source = message.module.text;
    if (source) {
      result += errorHighlight(source, [
        message.offset,
        message.offset + message.length,
      ]).join("\n");
    }
  }
  return result;
}
