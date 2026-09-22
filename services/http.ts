export async function jsonRequest(url: string, init: RequestInit = {}, external?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  external?.addEventListener('abort', abort, { once: true });
  if (external?.aborted) controller.abort();
  const timeout = setTimeout(abort, 12_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
    external?.removeEventListener('abort', abort);
  }
}
