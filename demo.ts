import { join } from "node:path"
import { cleanOut, outRoot, writeJson } from "./src/lib/files"
import { processCase, type ConfirmationDecision, type ProcessResult } from "./src/orchestrator/processor"

const directory = import.meta.dir
const results: ProcessResult[] = []

async function run(caso: string, decision?: ConfirmationDecision): Promise<ProcessResult> {
  const result = await processCase(directory, caso, "demo-session", decision)
  results.push(result)
  console.log(`${caso}: ${result.resultado}${result.numero_oc ? ` (${result.numero_oc})` : ""}`)
  if (result.bloqueos.length) console.log(`  bloqueos: ${result.bloqueos.join(", ")}`)
  if (result.confirmaciones.length) console.log(`  confirmaciones: ${result.confirmaciones.join(", ")}`)
  if (result.retroactiva) console.log("  retroactiva: true")
  return result
}

await cleanOut(directory)
await run("sol-001")
await run("sol-001")
await run("sol-002")
await run("sol-003")
await run("sol-004")
await run("sol-004", { acceptedCodes: ["RC5"], rejected: false, actor: "demo-session" })
await run("sol-005")
await run("sol-006")
await writeJson(join(outRoot(directory), "demo-resultados.json"), results)
console.log(`Evidencia: ${join(outRoot(directory), "demo-resultados.json")}`)
