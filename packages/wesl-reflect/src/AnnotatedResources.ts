import type {
  AttributeElem,
  GlobalVarElem,
  StandardAttribute,
  WeslAST,
  WeslJsPlugin,
} from "wesl";
import { findAnnotation } from "./Annotations.ts";
import { typeRefLayout } from "./StructLayout.ts";

/** Discovered buffer resource from @buffer annotation. */
export interface DiscoveredBuffer {
  kind: "buffer";
  varName: string;
  access: "read" | "read_write";
  byteSize: number;
}

/** Discovered texture resource from @test_texture annotation. */
export interface DiscoveredTexture {
  kind: "test_texture";
  varName: string;
  source: string;
  params: number[];
}

/** Discovered sampler resource from @sampler annotation. */
export interface DiscoveredSampler {
  kind: "sampler";
  varName: string;
  filter: "linear" | "nearest";
}

export type DiscoveredResource =
  | DiscoveredBuffer
  | DiscoveredTexture
  | DiscoveredSampler;

/** Find all @buffer, @test_texture, @sampler annotated global vars in a parsed WESL module. */
export function findAnnotatedResources(ast: WeslAST): DiscoveredResource[] {
  const src = ast.srcModule.src;
  return ast.moduleElem.contents
    .filter((e): e is GlobalVarElem => e.kind === "gvar")
    .flatMap(gvar => discoverResource(gvar, src));
}

/** Linker plugin that decorates @buffer/@test_texture/@sampler globals with
 *  @group(0) @binding(N) so they emit as bindable WGSL vars.
 *  The wgsl-test annotations themselves drop at emit (non-WGSL attributes).
 *  Errors if a target var already carries user-supplied @group/@binding. */
export function annotatedResourcesPlugin(
  resources: DiscoveredResource[],
  startBinding = 1,
): WeslJsPlugin {
  const bindingByName = new Map(
    resources.map((r, i) => [r.varName, startBinding + i]),
  );
  return {
    transform: ast => {
      for (const elem of ast.moduleElem.contents) {
        if (elem.kind !== "gvar") continue;
        const varName = elem.name.decl.ident.originalName;
        const binding = bindingByName.get(varName);
        if (binding === undefined) continue;
        assertNoUserBinding(elem, varName);
        const anchor = annotationAnchor(elem);
        const groupAttr = makeStandardAttr("group", 0, anchor);
        const bindingAttr = makeStandardAttr("binding", binding, anchor);
        elem.attributes = [...(elem.attributes ?? []), groupAttr, bindingAttr];
        // Emission reads attributes from contents when present; prepend there too.
        elem.contents = [groupAttr, bindingAttr, ...elem.contents];
      }
      return ast;
    },
  };
}

function discoverResource(
  gvar: GlobalVarElem,
  src: string,
): DiscoveredResource[] {
  if (findAnnotation(gvar, "buffer")) return [discoverBuffer(gvar, src)];

  const textureAttr = findAnnotation(gvar, "test_texture");
  if (textureAttr) return [discoverTexture(gvar, textureAttr, src)];

  const samplerAttr = findAnnotation(gvar, "sampler");
  if (samplerAttr) return [discoverSampler(gvar, samplerAttr)];

  return [];
}

/** Throw if the user has already put @group or @binding on an annotated var. */
function assertNoUserBinding(gvar: GlobalVarElem, varName: string): void {
  const group = findAnnotation(gvar, "group");
  const binding = findAnnotation(gvar, "binding");
  if (group || binding) {
    throw new Error(
      `@buffer/@test_texture/@sampler on var '${varName}' cannot be combined with ` +
        `user-supplied @group/@binding — wgsl-test owns the binding for annotated resources.`,
    );
  }
}

/** Pick a source position to anchor synthetic attributes on, preferring the
 *  wgsl-test annotation so error maps point to something meaningful. */
function annotationAnchor(gvar: GlobalVarElem): { start: number; end: number } {
  for (const name of ["buffer", "test_texture", "sampler"]) {
    const attr = gvar.attributes?.find(
      a => a.attribute.kind === "@attribute" && a.attribute.name === name,
    );
    if (attr) return { start: attr.start, end: attr.end };
  }
  return { start: gvar.start, end: gvar.start };
}

function makeStandardAttr(
  name: string,
  value: number,
  anchor: { start: number; end: number },
): AttributeElem {
  const { start, end } = anchor;
  return {
    kind: "attribute",
    start,
    end,
    contents: [],
    attribute: {
      kind: "@attribute",
      name,
      params: [
        {
          kind: "expression",
          start,
          end,
          contents: [{ kind: "literal", value: String(value), start, end }],
        },
      ],
    },
  };
}

function discoverBuffer(gvar: GlobalVarElem, src: string): DiscoveredBuffer {
  const varName = gvar.name.decl.ident.originalName;
  const declText = src.slice(gvar.start, gvar.end);
  const access = declText.includes("read_write") ? "read_write" : "read";
  const { typeRef } = gvar.name;
  const byteSize = typeRef ? typeRefLayout(typeRef).size : 0;
  return { kind: "buffer", varName, access, byteSize };
}

function discoverTexture(
  gvar: GlobalVarElem,
  attr: StandardAttribute,
  src: string,
): DiscoveredTexture {
  const varName = gvar.name.decl.ident.originalName;
  const params = attr.params ?? [];

  const sourceRef = params[0]?.contents.find(c => c.kind === "ref");
  const source = sourceRef?.kind === "ref" ? sourceRef.ident.originalName : "";

  const numParams = params
    .slice(1)
    .map(p => Number.parseInt(src.slice(p.start, p.end).trim(), 10) || 0);

  return { kind: "test_texture", varName, source, params: numParams };
}

function discoverSampler(
  gvar: GlobalVarElem,
  attr: StandardAttribute,
): DiscoveredSampler {
  const varName = gvar.name.decl.ident.originalName;
  const filterRef = attr.params?.[0]?.contents.find(c => c.kind === "ref");
  const filterName =
    filterRef?.kind === "ref" ? filterRef.ident.originalName : "linear";
  const filter = filterName === "nearest" ? "nearest" : "linear";
  return { kind: "sampler", varName, filter };
}
