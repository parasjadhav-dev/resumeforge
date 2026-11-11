// Builds the app and runs the visual + accessibility review (Playwright).
//   npm run ui:shots                 build, then screenshots + accessibility report
//   npm run ui:shots -- --no-build   reuse the last build
//   npm run ui:shots -- --strict     fail on serious/critical accessibility problems
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const build = !args.includes("--no-build");
const strict = args.includes("--strict");
const passthrough = args.filter((a) => a !== "--no-build" && a !== "--strict");

function run(command, commandArgs, env = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (build) run("npx", ["next", "build"]);
run("npx", ["playwright", "test", ...passthrough], strict ? { A11Y_STRICT: "1" } : {});
