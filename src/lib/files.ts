import { mkdir, readFile, writeFile, appendFile, rm } from "node:fs/promises"
import { dirname, join } from "node:path"

export function fixturesRoot(directory: string): string {
  return join(directory, "fixtures", "reto-03")
}

export function outRoot(directory: string): string {
  return join(directory, "out")
}

export async function readJson(path: string): Promise<unknown> {
  const content = await readFile(path, "utf8")
  try {
    return JSON.parse(content) as unknown
  } catch {
    throw new Error(`JSON malformado: ${path}`)
  }
}

export async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, "utf8")
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await writeText(path, `${JSON.stringify(value, null, 2)}\n`)
}

export async function appendText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await appendFile(path, content, "utf8")
}

export async function cleanOut(directory: string): Promise<void> {
  await rm(outRoot(directory), { recursive: true, force: true })
}
