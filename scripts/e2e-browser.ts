import { chromium, type Page } from "playwright"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const baseUrl = Bun.env.E2E_BASE_URL ?? "http://127.0.0.1:5173"
const stylesPath = join(import.meta.dir, "..", "web", "src", "styles.css")
const evidence = Bun.env.E2E_EVIDENCE_DIR
if (!evidence) throw new Error("E2E_EVIDENCE_DIR es obligatorio")
await mkdir(join(evidence, "screenshots"), { recursive: true })

const results: Array<{ id: string; passed: boolean; detail: string }> = []
const browser = await chromium.launch({ headless: true })

async function check(id: string, action: () => Promise<string>): Promise<void> {
  try {
    results.push({ id, passed: true, detail: await action() })
  } catch (error) {
    results.push({ id, passed: false, detail: error instanceof Error ? error.message : String(error) })
  }
}

async function send(page: Page, message: string): Promise<void> {
  await page.getByLabel("Mensaje").fill(message)
  await page.getByRole("button", { name: "Enviar" }).click()
}

async function noHorizontalOverflow(page: Page): Promise<string> {
  const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
  if (metrics.scrollWidth > metrics.clientWidth + 1) throw new Error(`Desbordamiento: ${metrics.scrollWidth}>${metrics.clientWidth}`)
  return `${metrics.scrollWidth}<=${metrics.clientWidth}`
}

async function responsive(page: Page, label: string): Promise<string> {
  const overflow = await noHorizontalOverflow(page)
  const content = await page.locator("main.shell").evaluate((element) => {
    const style = window.getComputedStyle(element)
    const available = element.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight)
    const chat = element.querySelector(".chat")?.getBoundingClientRect().width ?? 0
    const order = element.querySelector(".order")?.getBoundingClientRect().width ?? 0
    return { available, chat, order }
  })
  if (Math.abs(content.chat - content.available) > 2 || Math.abs(content.order - content.available) > 2) {
    if (label === "mobile") throw new Error(`Columnas no ocupan el espacio útil: ${JSON.stringify(content)}`)
  }
  return `${overflow}; ${JSON.stringify(content)}`
}

try {
  const contextA = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const pageA = await contextA.newPage()
  let sessionLabel = ""
  let chatRequests = 0
  pageA.on("request", (request) => { if (request.url().endsWith("/api/chat") && request.method() === "POST") chatRequests += 1 })
  await pageA.goto(baseUrl)
  await pageA.waitForSelector("text=modo local determinista")

  await check("session-reload", async () => {
    const before = await pageA.locator(".session").textContent()
    sessionLabel = before ?? ""
    await send(pageA, "Procesa sol-004")
    await pageA.getByTestId("confirmation-panel").waitFor()
    await pageA.reload()
    await pageA.getByTestId("confirmation-panel").waitFor()
    const after = await pageA.locator(".session").textContent()
    if (before !== after) throw new Error(`${before} != ${after}`)
    return after ?? ""
  })

  await check("vite-hmr-session-stability", async () => {
    const original = await readFile(stylesPath, "utf8")
    try {
      await writeFile(stylesPath, original.replace("--hmr-sentinel: 2;", "--hmr-sentinel: 3;"), "utf8")
      await pageA.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--hmr-sentinel").trim() === "3", { timeout: 60_000 })
      const sessionAfterHmr = await pageA.locator(".session").textContent()
      if (sessionAfterHmr !== sessionLabel) throw new Error(`${sessionLabel} != ${sessionAfterHmr}`)
      if (chatRequests !== 1) throw new Error(`HMR duplicó solicitudes: ${chatRequests}`)
      return `sesión conservada, ${chatRequests} solicitud`
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 750))
      await writeFile(stylesPath, original, "utf8")
      await pageA.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--hmr-sentinel").trim() === "2", { timeout: 60_000 })
    }
  })

  await check("cross-case-protected", async () => {
    await send(pageA, "Procesa sol-006")
    await pageA.getByText("sigue pendiente de confirmación para RC5").waitFor()
    if (await pageA.getByTestId("po-number").count()) throw new Error("Se mostró una OC")
    return "sol-006 no consumió la confirmación pendiente de sol-004"
  })

  const contextB = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const pageB = await contextB.newPage()
  await pageB.goto(baseUrl)
  await check("tab-isolation", async () => {
    await send(pageB, "Confirmo RC5 de sol-004")
    await pageB.getByTestId("confirmation-panel").waitFor()
    if (await pageB.getByTestId("po-number").count()) throw new Error("La pestaña B creó una OC")
    return "La confirmación de B no creó la OC pendiente de A"
  })

  await check("confirm-context", async () => {
    await pageA.getByTestId("confirm-button").click()
    await pageA.getByTestId("po-number").waitFor()
    const status = await pageA.getByTestId("order-status").textContent()
    if (status !== "exitoso") throw new Error(String(status))
    await pageA.screenshot({ path: join(evidence, "screenshots", "sol-004-confirmado-desktop.png"), fullPage: true })
    return `${status} ${await pageA.getByTestId("po-number").textContent()}`
  })

  await check("reject-context", async () => {
    await pageB.reload()
    await pageB.getByTestId("reject-button").click()
    await pageB.getByText("rechazado").first().waitFor()
    return "Rechazo de sol-004 conservado en la pestaña B"
  })

  await check("no-duplicate-request", async () => {
    if (chatRequests !== 3) throw new Error(`Solicitudes POST /api/chat en pestaña A: ${chatRequests}`)
    return String(chatRequests)
  })

  const pageMobile = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await pageMobile.goto(baseUrl)
  await check("sol-005-confirmation", async () => {
    await send(pageMobile, "Procesa sol-005")
    await pageMobile.getByTestId("retroactive").waitFor()
    await pageMobile.getByText("RC8").first().waitFor()
    if (await pageMobile.getByTestId("po-number").count()) throw new Error("Se creó antes de confirmar")
    await pageMobile.screenshot({ path: join(evidence, "screenshots", "sol-005-pendiente-mobile.png"), fullPage: true })
    await pageMobile.getByTestId("confirm-button").click()
    await pageMobile.getByTestId("po-number").waitFor()
    await pageMobile.screenshot({ path: join(evidence, "screenshots", "sol-005-confirmado-mobile.png"), fullPage: true })
    return `${await pageMobile.getByTestId("order-status").textContent()} ${await pageMobile.getByTestId("po-number").textContent()}`
  })

  await check("mobile-responsive", async () => responsive(pageMobile, "mobile"))
  await check("desktop-responsive", async () => responsive(pageA, "desktop"))
  await check("tool-and-preview-visible", async () => {
    await pageMobile.locator("details.tool").first().click()
    await pageMobile.getByTestId("payload-preview").locator("summary").click()
    await pageMobile.getByTestId("payload-preview").locator("pre").waitFor()
    return "Herramientas y vista previa expandibles en móvil"
  })
  await check("readable-error", async () => {
    await send(pageMobile, "Procesa sol-999")
    await pageMobile.getByText("No pude leer o validar el paquete").waitFor()
    return "Error legible y sesión disponible"
  })
} finally {
  await browser.close()
}

await writeFile(join(evidence, "browser-results.json"), `${JSON.stringify(results, null, 2)}\n`)
for (const result of results) console.log(`${result.passed ? "PASS" : "FAIL"} ${result.id}: ${result.detail}`)
if (results.some((result) => !result.passed)) process.exit(1)
