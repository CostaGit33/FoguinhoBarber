import { readdir } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(process.cwd());
const srcDir = path.join(projectRoot, "src");

async function getJavaScriptFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return getJavaScriptFiles(fullPath);
      }

      return fullPath.endsWith(".js") ? [fullPath] : [];
    })
  );

  return files.flat();
}

try {
  const files = await getJavaScriptFiles(srcDir);

  if (files.length === 0) {
    console.log("Nenhum arquivo JavaScript encontrado em src.");
    process.exit(0);
  }

  for (const file of files) {
    const relativeFile = path.relative(projectRoot, file);
    await execFileAsync(process.execPath, ["--check", file], { cwd: projectRoot });
    console.log(`OK: ${relativeFile}`);
  }

  console.log(`Build concluido com sucesso. ${files.length} arquivo(s) validados.`);
} catch (error) {
  console.error("Build falhou.");
  if (error.stdout) {
    process.stdout.write(error.stdout);
  }
  if (error.stderr) {
    process.stderr.write(error.stderr);
  }
  process.exit(error.code || 1);
}
