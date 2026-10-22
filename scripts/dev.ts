const processes = [
  Bun.spawn(["bun", "--hot", "src/server.ts"], { stdout: "inherit", stderr: "inherit" }),
  Bun.spawn(["bunx", "vite", "--host", "127.0.0.1"], { stdout: "inherit", stderr: "inherit" }),
]

function stop(): void {
  for (const process of processes) process.kill()
}

process.on("SIGINT", stop)
process.on("SIGTERM", stop)
await Promise.race(processes.map((process) => process.exited))
stop()

export {}
