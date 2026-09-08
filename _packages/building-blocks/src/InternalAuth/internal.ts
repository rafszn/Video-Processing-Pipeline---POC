import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify, errors as JoseErrors } from "jose";

const ALG = "HS256";

function getSecretKey(): Uint8Array {
  const secret = process.env.INTERNAL_JWT_SECRET;
  if (!secret) throw new Error("INTERNAL_JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface SignServiceTokenInput<T = unknown> {
  user?: T;
  issuer: string;
  audience: string;
  ttlSeconds?: number; // default 60s — minted fresh per request
}

export async function signServiceToken({
  issuer,
  audience,
  user,
  ttlSeconds = 60,
}: SignServiceTokenInput): Promise<string> {
  return new SignJWT(user !== undefined ? { user } : {})
    .setProtectedHeader({ alg: ALG, typ: "JWT" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecretKey());
}

export interface VerifyServiceTokenOptions {
  audience: string; // this service's own identity
  allowedIssuers: string[]; // callers permitted to reach it
}

export interface ServiceAuthContext<T = unknown> {
  caller: string;
  user?: T;
}

export async function verifyServiceToken<T = unknown>(
  token: string,
  { audience, allowedIssuers }: VerifyServiceTokenOptions,
): Promise<ServiceAuthContext<T>> {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    audience,
    issuer: allowedIssuers,
    clockTolerance: "5s",
  });

  return {
    caller: payload.iss as string,
    user: payload.user as T | undefined,
  };
}

export { JoseErrors };
