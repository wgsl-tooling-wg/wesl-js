import { TreeImportElem } from "./AbstractElems.ts";
import { importResolutionMap, ResolveMap } from "./ImportResolutionMap.ts";
import { linkWgslModule } from "./Linker.ts";
import {
  ModuleExport,
  ModuleRegistry,
  relativeToAbsolute,
  TextModuleExport,
} from "./ModuleRegistry.ts";
import { parseModule, TextExport, TextModule } from "./ParseModule.ts";
import { dirname, normalize, noSuffix } from "./PathUtil.ts";

/** parse wgsl files and provided indexed access to modules and exports */
export class ParsedRegistry {
  private textModules: TextModule[] = [];

  constructor(
    public registry: ModuleRegistry,
    public conditions: Record<string, any> = {},
  ) {
    this.textModules = [];
    this.registry.wgslSrc.forEach((src, fileName) => {
      this.parseOneModule(src, conditions, fileName);
    });
  }

  link(moduleSpecifier: string): string {
    const module = this.findTextModule(moduleSpecifier);
    if (!module) {
      throw new Error(`Module not found: ${moduleSpecifier}`);
    }
    return linkWgslModule(module, this, this.conditions);
  }

  /** parse one module, register exports for later searching */
  private parseOneModule(
    src: string,
    params: Record<string, any> = {},
    modulePath: string,
  ): void {
    const m = parseModule(src, modulePath, params);
    this.textModules.push(m);
  }

  /** @return a ResolveMap to make it easier to resolve imports from the provided module */
  importResolveMap(importingModule: TextModule): ResolveMap {
    const treeImports: TreeImportElem[] = importingModule.imports.filter(
      i => i.kind === "treeImport",
    ); // TODO drop filter when we drop other import kinds

    // TODO cache
    return importResolutionMap(importingModule, treeImports, this);
  }

  /** @return a ModuleExport if the provided pathSegments
   * reference an export in a registered module */
  getModuleExport(
    importingModule: TextModule, // TODO drop this and require pathSegments to be absolute
    pathSegments: string[],
  ): ModuleExport | undefined {
    const exportName = pathSegments[pathSegments.length - 1];
    if (pathSegments[0] === ".") {
      // relative module path in current package
      const moduleDir = dirname(importingModule.modulePath);
      const joined = [moduleDir, ...pathSegments.slice(1, -1)].join("/");
      const modulePath = normalize(joined);
      const result = this.findExport(modulePath, exportName);
      // dlog({ modulePath, exportName, result: !!result });
      return result;
    } else {
      // package rooted path
      const modulePath = pathSegments.slice(0, -1).join("/");
      const result = this.findExport(modulePath, exportName);
      // dlog({ modulePath, exportName, result: !!result });
      return result;
    }
  }

  private findExport(
    modulePath: string,
    exportName: string,
  ): TextModuleExport | undefined {
    const module = this.findTextModule(modulePath);
    // dlog({ modulePath, module: !!module });
    const exp = module?.exports.find(e => e.ref.name === exportName);
    if (exp && module) {
      return { module, exp: exp, kind: "text" };
    }

    return undefined;
  }

  /**
   * Find a text module by module specifier
   * @param packageName requesting package name (for resolving relative paths)
   */
  findTextModule(
    moduleSpecifier: string,
    packageName = "_root",
  ): TextModule | undefined {
    const resolvedPath =
      moduleSpecifier.startsWith(".") ?
        relativeToAbsolute(moduleSpecifier, packageName)
      : moduleSpecifier;
    // const modulePaths = this.textModules.map((m) => m.modulePath);
    // dlog({ modulePaths, resolvedPath });
    const result =
      this.textModules.find(m => m.modulePath === resolvedPath) ??
      this.textModules.find(m => noSuffix(m.modulePath) === resolvedPath);
    // dlog({ moduleSpecifier, packageName, result: !!result });
    return result;
  }
}
