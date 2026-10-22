import { cp, mkdir, mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

const sourceFixtures = join(import.meta.dir, "..", "fixtures", "reto-03")

export async function testProject(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agente-oc-sap-"))
  const target = join(directory, "fixtures", "reto-03")
  await mkdir(join(directory, "fixtures"), { recursive: true })
  await cp(sourceFixtures, target, { recursive: true })
  return directory
}

export async function removeTestProject(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true })
}
