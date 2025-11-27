const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  console.warn("NEXT_PUBLIC_API_URL is not defined");
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string | null
): Promise<T> {
  if (!API_URL) {
    throw new Error("API URL is not configured");
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = "Erreur serveur";
    try {
      const errorBody = await res.json();
      if (errorBody.detail) {
        message = Array.isArray(errorBody.detail)
          ? errorBody.detail[0].msg ?? message
          : errorBody.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  if (!API_URL) {
    throw new Error("API URL is not configured");
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = "Erreur serveur";
    try {
      const errorBody = await res.json();
      if (errorBody.detail) {
        message = Array.isArray(errorBody.detail)
          ? errorBody.detail[0].msg ?? message
          : errorBody.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  token?: string | null
): Promise<T> {
  if (!API_URL) {
    throw new Error("API URL is not configured");
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = "Erreur serveur";
    try {
      const errorBody = await res.json();
      if (errorBody.detail) {
        message = Array.isArray(errorBody.detail)
          ? errorBody.detail[0].msg ?? message
          : errorBody.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}

