const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

async function main() {
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });
  await fs.copyFile(path.join(root, "index.html"), path.join(dist, "index.html"));
  await fs.copyFile(path.join(root, "vercel.json"), path.join(dist, "vercel.json"));
  await copyDir(path.join(root, "frontend"), path.join(dist, "frontend"));
  await copyDir(path.join(root, "shared"), path.join(dist, "shared"));
  await fs.writeFile(
    path.join(dist, "manifest.json"),
    JSON.stringify(
      {
        name: "solver-poker",
        generatedAt: new Date().toISOString(),
        note: "Static frontend artifact. The Node backend serves the source tree in this no-dependency build.",
      },
      null,
      2
    )
  );
  process.stdout.write(`Build generado en ${dist}\n`);
}

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(source, target);
    else if (entry.isFile()) await fs.copyFile(source, target);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
