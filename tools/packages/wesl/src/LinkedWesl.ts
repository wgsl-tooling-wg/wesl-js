import { SrcMap } from "mini-parse";
import type { WeslDevice } from "./WeslDevice";
import { offsetToLineNumber } from "./Util";

export interface WeslGPUCompilationInfo extends GPUCompilationInfo {
  messages: WeslGPUCompilationMessage[];
}

export interface WeslGPUCompilationMessage extends GPUCompilationMessage {
  module: {
    url: string;
    text?: string;
  };
}

/** A GPUValidationError with an inner error (for a stack trace). Can also point at a WESL source file. */
export class ExtendedGPUValidationError extends GPUValidationError {
  public cause?: Error;
  public compilationInfo?: WeslGPUCompilationInfo;
  constructor(message: string, options?: { cause?: Error }) {
    super(message);
    this.cause = options?.cause;
  }
}

/**
 * Multiple WESL files that have been linked together to produce WGSL code.
 *
 * Call {@link LinkedWesl.createShaderModule} on a {@link WeslDevice} to make the error reporting aware of the WESL code.
 */
export class LinkedWesl {
  constructor(public sourceMap: SrcMap) {}

  /**
   * Creates a {@link GPUShaderModule}.
   *
   * The compilation info {@link GPUShaderModule.getCompilationInfo} can be remapped with {@link mapGPUCompilationInfo}
   * @param device GPUDevice. Preferably a {@link WeslDevice} for better error reporting.
   * @param descriptor - Description of the {@link GPUShaderModule} to create.
   */
  createShaderModule(
    device: GPUDevice | WeslDevice,
    descriptor: Omit<GPUShaderModuleDescriptor, "code">,
  ): GPUShaderModule {
    // Skip the custom behaviour if we do not have a WESL device.
    if (!("injectError" in device)) {
      return device.createShaderModule({
        ...descriptor,
        code: this.dest,
      });
    }

    device.pushErrorScope("validation"); // Surpress the normal error
    const module = device.createShaderModule({
      ...descriptor,
      code: this.dest,
    });
    device.popErrorScope();
    // And report the error!
    let { promise, resolve } = Promise.withResolvers<GPUError | null>();
    device.injectError("validation", promise); // Inject our custom error
    module.getCompilationInfo().then(compilationInfo => {
      const mappedCompilationInfo = this.mapGPUCompilationInfo(compilationInfo);
      let errorMessage = compilationInfoToErrorMessage(
        mappedCompilationInfo,
        module,
      );
      if (errorMessage === null) {
        resolve(null);
      } else {
        const error = new ExtendedGPUValidationError(errorMessage, {
          cause: new Error("createShaderModule failed"),
        });
        error.compilationInfo = mappedCompilationInfo;
        resolve(error);
      }
    });
    return module;
  }

  /** Use {@link LinkedWesl.createShaderModule} for a more convenient error reporting experience. */
  get dest() {
    return this.sourceMap.dest.text;
  }

  public mapGPUCompilationInfo(
    compilationInfo: GPUCompilationInfo,
  ): WeslGPUCompilationInfo {
    return {
      __brand: compilationInfo.__brand,
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

    let [lineNum, linePos] = offsetToLineNumber(
      srcPosition.position,
      srcPosition.src.text,
    );

    return {
      __brand: message.__brand,
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
 */
function compilationInfoToErrorMessage(
  compilationInfo: WeslGPUCompilationInfo,
  shaderModule: GPUShaderModule,
): string | null {
  if (compilationInfo.messages.length === 0) return null;

  let result = `Compilation log for [Invalid ShaderModule (${shaderModule.label || "unlabled"})]:\n`;
  let errorCount = compilationInfo.messages.filter(
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

    const lineStartOffset = message.offset - Math.max(0, message.linePos - 1);
    const source = message.module.text;
    if (source) {
      let lineEndOffset = source.indexOf("\n", lineStartOffset);
      if (lineEndOffset === -1) {
        lineEndOffset = source.length;
      }
      const line = source.slice(lineStartOffset, lineEndOffset);
      result += `${line}\n${" ".repeat(linePos - 1)}${"^".repeat(Math.max(1, message.length))}\n`;
    }
  }
  return result;
}
