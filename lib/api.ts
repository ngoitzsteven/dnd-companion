export async function postJson<T = unknown>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let message = "Unexpected error";

    try {
      const data = await response.json();
      if (data && typeof data.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore body parsing errors
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}
