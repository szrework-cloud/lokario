import { logger } from "@/lib/logger";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn("NEXT_PUBLIC_API_URL is not defined, using default: http://localhost:8000");
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string | null
): Promise<T> {
  // En mode développement sans backend, simuler une réponse
  if (!process.env.NEXT_PUBLIC_API_URL) {
    logger.log("[MOCK API] POST", path, body);
    return Promise.resolve({} as T);
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
      } else if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      // Si on ne peut pas parser le JSON, essayer de récupérer le texte
      try {
        const text = await res.text();
        if (text) {
          message = text;
        }
      } catch {
        // ignore
      }
    }
    
    // Si erreur 401 (Unauthorized), gérer différemment selon la route
    if (res.status === 401) {
      // Pour login/register, utiliser le message d'erreur du serveur (email/mot de passe incorrect)
      // Pour les autres routes, c'est une session expirée
      if (path === "/auth/login" || path === "/auth/register") {
        // Utiliser le message du serveur, ou un message par défaut si vide
        const errorMessage = message && message !== "Erreur serveur" 
          ? message 
          : "Email ou mot de passe incorrect";
        const authError = new Error(errorMessage);
        (authError as any).status = 401;
        (authError as any).isAuthError = true;
        throw authError;
      } else {
        // Session expirée pour les autres routes
        const authError = new Error("Votre session a expiré. Veuillez vous reconnecter.");
        (authError as any).status = 401;
        (authError as any).isAuthError = true;
        throw authError;
      }
    }
    
    throw new Error(message);
  }

  return res.json();
}

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  // En mode développement sans backend, simuler une réponse
  if (!process.env.NEXT_PUBLIC_API_URL) {
    logger.log("[MOCK API] GET", path);
    return Promise.resolve({} as T);
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
    let errorBody: any = null;
    try {
      errorBody = await res.json();
      if (errorBody.detail) {
        message = Array.isArray(errorBody.detail)
          ? errorBody.detail[0].msg ?? message
          : errorBody.detail;
      }
    } catch {
      // Si on ne peut pas parser le JSON, utiliser le texte de la réponse
      try {
        const text = await res.text();
        message = text || message;
      } catch {
        // ignore
      }
    }
    
    // Si erreur 401 (Unauthorized), gérer différemment selon la route
    if (res.status === 401) {
      // Pour login/register, utiliser le message d'erreur du serveur
      if (path === "/auth/login" || path === "/auth/register") {
        const authError = new Error(message || "Email ou mot de passe incorrect");
        (authError as any).status = 401;
        (authError as any).isAuthError = true;
        throw authError;
      } else {
        // Pour les autres routes, c'est une session expirée
        // Nettoyer le localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          // Rediriger vers la page de connexion après un court délai
          setTimeout(() => {
            window.location.href = "/login";
          }, 100);
        }
        const authError = new Error("Votre session a expiré. Veuillez vous reconnecter.");
        (authError as any).status = 401;
        (authError as any).isAuthError = true;
        throw authError;
      }
    }
    
    // Pour les erreurs 422 sur /appointments/settings, retourner un objet vide
    // pour que le service puisse utiliser les valeurs par défaut
    if (res.status === 422 && path.includes("/appointments/settings")) {
      // Logger les détails de l'erreur pour debug
      if (errorBody && errorBody.detail && Array.isArray(errorBody.detail)) {
        console.warn("422 Validation Error details:", errorBody.detail);
      }
      return {} as T;
    }
    
    throw new Error(message);
  }

  return res.json();
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  token?: string | null
): Promise<T> {
  // En mode développement sans backend, simuler une réponse
  if (!process.env.NEXT_PUBLIC_API_URL) {
    logger.log("[MOCK API] PUT", path, body);
    return Promise.resolve({} as T);
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
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
    
    // Si erreur 401 (Unauthorized), créer une erreur spéciale
    if (res.status === 401) {
      const authError = new Error("Votre session a expiré. Veuillez vous reconnecter.");
      (authError as any).status = 401;
      (authError as any).isAuthError = true;
      throw authError;
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
  // En mode développement sans backend, simuler une réponse
  if (!process.env.NEXT_PUBLIC_API_URL) {
    logger.log("[MOCK API] PATCH", path, body);
    return Promise.resolve({} as T);
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
    
    // Si erreur 401 (Unauthorized), créer une erreur spéciale
    if (res.status === 401) {
      const authError = new Error("Votre session a expiré. Veuillez vous reconnecter.");
      (authError as any).status = 401;
      (authError as any).isAuthError = true;
      throw authError;
    }
    
    throw new Error(message);
  }

  return res.json();
}

export async function apiDelete<T>(
  path: string,
  token?: string | null
): Promise<T> {
  // En mode développement sans backend, simuler une réponse
  if (!process.env.NEXT_PUBLIC_API_URL) {
    logger.log("[MOCK API] DELETE", path);
    return Promise.resolve({} as T);
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
    
    // Si erreur 401 (Unauthorized), créer une erreur spéciale
    if (res.status === 401) {
      const authError = new Error("Votre session a expiré. Veuillez vous reconnecter.");
      (authError as any).status = 401;
      (authError as any).isAuthError = true;
      throw authError;
    }
    
    throw new Error(message);
  }

  // DELETE peut retourner un body vide
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T;
  }

  return res.json();
}

export async function apiUploadFile<T>(
  path: string,
  file: File,
  token?: string | null
): Promise<T> {
  // En mode développement sans backend, simuler une réponse
  if (!process.env.NEXT_PUBLIC_API_URL) {
    logger.log("[MOCK API] UPLOAD", path, file.name);
    return Promise.resolve({} as T);
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
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
    
    // Si erreur 401 (Unauthorized), créer une erreur spéciale
    if (res.status === 401) {
      const authError = new Error("Votre session a expiré. Veuillez vous reconnecter.");
      (authError as any).status = 401;
      (authError as any).isAuthError = true;
      throw authError;
    }
    
    throw new Error(message);
  }

  return res.json();
}

