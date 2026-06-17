export const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);
export const AUTH_TOKEN_EXPIRES_MINUTES = Number(process.env.AUTH_TOKEN_EXPIRES_MINUTES ?? 30);

export const getTokenExpiresAt = (minutes = AUTH_TOKEN_EXPIRES_MINUTES) =>
  new Date(Date.now() + 1000 * 60 * minutes);
