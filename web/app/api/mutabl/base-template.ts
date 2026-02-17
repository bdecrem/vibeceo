import { existsSync, readFileSync } from "fs";
import { join } from "path";

type BaseTemplate = {
  code: string;
  css: string;
  version: number;
};

// Version must be bumped when the corresponding base-template.jsx changes
const VERSIONS: Record<string, number> = {
  todoit: 5,
  contxt: 5,
  notabl: 9,
};

const cache: Record<string, BaseTemplate> = {};

export function getBaseTemplate(app: "todoit" | "contxt" | "notabl"): BaseTemplate {
  if (!cache[app]) {
    const dir = join(process.cwd(), "app/api/mutabl", app);
    const code = readFileSync(join(dir, "base-template.jsx"), "utf-8");
    const cssPath = join(dir, "base-template.css");
    const css = existsSync(cssPath) ? readFileSync(cssPath, "utf-8") : "";
    cache[app] = { code, css, version: VERSIONS[app] };
  }
  return cache[app];
}
