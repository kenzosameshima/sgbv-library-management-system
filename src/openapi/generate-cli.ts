import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildOpenApiDocument } from "./document";

const OUTPUT = path.resolve(__dirname, "../../docs/openapi.json");

mkdirSync(path.dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
process.stdout.write(`Wrote ${path.relative(process.cwd(), OUTPUT)}\n`);
