// Next.js instrumentation entry — runs once when the server process starts.
// We use it to register the DI container and start the in-process job runner.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Side-effect import registers the DI bindings.
  await import("@/container");
  const { jobProcessor } = await import("@/logic/jobProcessor");
  jobProcessor.start();
}
