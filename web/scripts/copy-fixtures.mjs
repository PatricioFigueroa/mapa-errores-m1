// Angular cannot read assets outside the workspace, so copy the contract fixtures in
// before start/build. The copy is git-ignored; contracts/fixtures stays the only source.
import { cpSync } from "node:fs";

cpSync(new URL("../../contracts/fixtures", import.meta.url), new URL("../public/assets/artifacts", import.meta.url), { recursive: true });
