/**
 * Utilitaires pour la gestion des tokens JWT
 */

/**
 * Décode un token JWT et retourne son payload
 */
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error("Erreur lors du décodage du token:", error);
    return null;
  }
}

/**
 * Vérifie si un token JWT est expiré
 * @param token Token JWT à vérifier
 * @returns true si le token est expiré ou invalide, false sinon
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    return true; // Token invalide ou sans expiration
  }

  // exp est en secondes, convertir en millisecondes
  const expirationTime = payload.exp * 1000;
  const currentTime = Date.now();

  // Considérer comme expiré si l'expiration est passée (avec marge de 5 secondes)
  return currentTime >= expirationTime - 5000;
}

/**
 * Vérifie si un token JWT expire bientôt (dans les prochaines minutes)
 * @param token Token JWT à vérifier
 * @param minutesBeforeExpiration Nombre de minutes avant expiration (défaut: 5)
 * @returns true si le token expire bientôt, false sinon
 */
export function isTokenExpiringSoon(
  token: string | null | undefined,
  minutesBeforeExpiration: number = 5
): boolean {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const expirationTime = payload.exp * 1000;
  const currentTime = Date.now();
  const expirationThreshold = minutesBeforeExpiration * 60 * 1000;

  return currentTime >= expirationTime - expirationThreshold;
}

/**
 * Retourne le temps restant avant expiration du token (en secondes)
 * @param token Token JWT à vérifier
 * @returns Nombre de secondes avant expiration, ou null si token invalide/expiré
 */
export function getTokenTimeRemaining(token: string | null | undefined): number | null {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    return null;
  }

  const expirationTime = payload.exp * 1000;
  const currentTime = Date.now();
  const remaining = Math.floor((expirationTime - currentTime) / 1000);

  return remaining > 0 ? remaining : 0;
}

