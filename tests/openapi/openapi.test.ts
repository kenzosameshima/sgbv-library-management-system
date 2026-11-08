import { readFileSync } from "node:fs";
import path from "node:path";
import type { Express } from "express";
import { describe, expect, it } from "vitest";
import app from "../../src/app";
import { buildOpenApiDocument } from "../../src/openapi/document";
import { PASSWORD_MIN_LENGTH } from "../../src/utils/constants";

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
  name: string;
  regexp: RegExp;
  handle: { stack?: Layer[] };
}

/** Express 4 keeps mount paths only as regular expressions, so recover the literal prefix from the source. */
function mountPath(layer: Layer): string {
  return layer.regexp.source
    .replace("^", "")
    .replace("\\/?(?=\\/|$)", "")
    .replace(/\\\//g, "/");
}

function collectRoutes(stack: Layer[], prefix = ""): string[] {
  return stack.flatMap((layer) => {
    if (layer.route) {
      return Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${prefix}${layer.route!.path}`);
    }
    if (layer.name === "router" && layer.handle.stack) {
      return collectRoutes(layer.handle.stack, prefix + mountPath(layer));
    }
    return [];
  });
}

function registeredRoutes(): string[] {
  const router = (app as unknown as Express & { _router: { stack: Layer[] } })._router;
  return collectRoutes(router.stack)
    .map((route) => route.replace(/:([A-Za-z]+)/g, "{$1}").replace(/\/$/, ""))
    .sort();
}

function documentedRoutes(): string[] {
  const doc = buildOpenApiDocument();
  return Object.entries(doc.paths)
    .flatMap(([route, operations]) =>
      Object.keys(operations)
        .filter((key) => key !== "servers")
        .map((method) => `${method.toUpperCase()} ${route === "/health" ? "" : "/api/v1"}${route}`)
    )
    .sort();
}

describe("OpenAPI document", () => {
  it("documents every route the app registers, and nothing else", () => {
    const registered = registeredRoutes();

    expect(registered).toContain("POST /api/v1/loans"); // guards against a vacuous comparison
    expect(documentedRoutes()).toEqual(registered);
  });

  it("is committed up to date (run `npm run docs:openapi` after changing routes or schemas)", () => {
    const committed = JSON.parse(readFileSync(path.resolve(__dirname, "../../docs/openapi.json"), "utf8"));

    expect(committed).toEqual(JSON.parse(JSON.stringify(buildOpenApiDocument())));
  });

  it("derives request bodies from the validation schemas", () => {
    const doc = buildOpenApiDocument();
    const login = doc.paths["/auth/login"].post.requestBody.content["application/json"].schema;
    const createBook = doc.paths["/books"].post.requestBody.content["application/json"].schema;

    expect(login.properties.password.minLength).toBe(PASSWORD_MIN_LENGTH);
    expect(createBook.required).toEqual(expect.arrayContaining(["title", "author", "category", "isbn", "totalCopies"]));
    expect(createBook.additionalProperties).toBe(false);
  });
});
