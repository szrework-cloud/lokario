/**
 * Abstraction pour le stockage des données d'authentification
 * 
 * Utilise sessionStorage par défaut (plus sûr que localStorage)
 * - sessionStorage : Effacé à la fermeture de l'onglet (plus sûr)
 * - localStorage : Persiste même après fermeture (moins sûr mais plus pratique)
 * 
 * Cette abstraction permet de migrer progressivement et facilement
 * entre les deux méthodes de stockage sans casser le code existant.
 */

type StorageType = "localStorage" | "sessionStorage";

// Configuration : choisir le type de stockage
const STORAGE_TYPE: StorageType = "sessionStorage"; // Plus sûr pour la sécurité

/**
 * Obtenir l'instance de storage appropriée
 */
function getStorage(): Storage {
  if (typeof window === "undefined") {
    // En SSR, retourner un objet mock
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    } as Storage;
  }
  
  return STORAGE_TYPE === "sessionStorage" ? sessionStorage : localStorage;
}

/**
 * Clés utilisées pour le stockage
 */
const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  AUTH_USER: "auth_user",
} as const;

/**
 * Sauvegarder le token d'authentification
 */
export function saveAuthToken(token: string): void {
  try {
    const storage = getStorage();
    storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch (error) {
    console.error("❌ Erreur lors de la sauvegarde du token:", error);
    // Si sessionStorage est plein, essayer localStorage en fallback
    if (STORAGE_TYPE === "sessionStorage") {
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      } catch (fallbackError) {
        console.error("❌ Erreur lors du fallback vers localStorage:", fallbackError);
      }
    }
  }
}

/**
 * Récupérer le token d'authentification
 */
export function getAuthToken(): string | null {
  try {
    const storage = getStorage();
    return storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du token:", error);
    return null;
  }
}

/**
 * Supprimer le token d'authentification
 */
export function removeAuthToken(): void {
  try {
    const storage = getStorage();
    storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    // Nettoyer aussi dans l'autre storage pour compatibilité
    if (STORAGE_TYPE === "sessionStorage") {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  } catch (error) {
    console.error("❌ Erreur lors de la suppression du token:", error);
  }
}

/**
 * Sauvegarder les données utilisateur
 */
export function saveAuthUser(user: unknown): void {
  try {
    const storage = getStorage();
    storage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  } catch (error) {
    console.error("❌ Erreur lors de la sauvegarde de l'utilisateur:", error);
    // Si sessionStorage est plein, essayer localStorage en fallback
    if (STORAGE_TYPE === "sessionStorage") {
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
      } catch (fallbackError) {
        console.error("❌ Erreur lors du fallback vers localStorage:", fallbackError);
      }
    }
  }
}

/**
 * Récupérer les données utilisateur
 */
export function getAuthUser<T = unknown>(): T | null {
  try {
    const storage = getStorage();
    const userRaw = storage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!userRaw) {
      return null;
    }
    return JSON.parse(userRaw) as T;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
}

/**
 * Supprimer les données utilisateur
 */
export function removeAuthUser(): void {
  try {
    const storage = getStorage();
    storage.removeItem(STORAGE_KEYS.AUTH_USER);
    // Nettoyer aussi dans l'autre storage pour compatibilité
    if (STORAGE_TYPE === "sessionStorage") {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  } catch (error) {
    console.error("❌ Erreur lors de la suppression de l'utilisateur:", error);
  }
}

/**
 * Nettoyer toutes les données d'authentification
 */
export function clearAuthStorage(): void {
  removeAuthToken();
  removeAuthUser();
}

/**
 * Migrer les données depuis localStorage vers sessionStorage (si nécessaire)
 * Utile pour la migration progressive
 */
export function migrateFromLocalStorage(): void {
  if (typeof window === "undefined") return;
  
  if (STORAGE_TYPE === "sessionStorage") {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const user = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      
      if (token || user) {
        if (token) {
          sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        }
        if (user) {
          sessionStorage.setItem(STORAGE_KEYS.AUTH_USER, user);
          localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        }
        console.log("✅ Migration vers sessionStorage effectuée");
      }
    } catch (error) {
      console.error("❌ Erreur lors de la migration:", error);
    }
  }
}

