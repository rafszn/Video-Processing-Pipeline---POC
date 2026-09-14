/* eslint-disable @typescript-eslint/no-explicit-any */
import https from "node:https";
import CircuitBreaker from "opossum";
import { signServiceToken } from "../InternalAuth/internal.js";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

type BreakerOptions = ConstructorParameters<typeof CircuitBreaker>[1];

interface ResilientClientConfig {
  issuer: string;
  baseURL: string;
  targetId: string; /** identifier of the target service */
  timeout?: number;
  maxContentLength?: number;
  axiosConfig?: AxiosRequestConfig;
  defaultBreakerOptions?: BreakerOptions;
}

export interface HTTPUserContext {
  id: string;
  [key: string]: unknown;
}

/**
 Base class for typed HTTP clients that call other internal services in the monorepo.

 Handles, once, for every client that extends it:
  - Circuit breaking per method (via `withBreaker`)
  - Axios instance setup (baseURL, timeout, keep-alive agent)
  - Internal service-to-service auth headers (via `authHeader`)

 Usage:
   class FlightClient extends ResilientClient {
     getFlightById: (id: number, user?: HTTPUserContext) => Promise<FlightDto>;

     constructor() {
       super({
         issuer: env.SERVICE_NAME, // this service's own identifier
         targetId: 'flight-service', // the service being called
         baseURL: env.FLIGHT_SERVICE_URL,
       });

       this.getFlightById = this.withBreaker('getFlightById', async (id, user) => {
         const headers = await this.authHeader(user);
         return this.client.get(`/api/v1/flight/get-by-id?id=${id}`, { headers }).then(r => r.data);
       });
     }
   }

 Rules of thumb:
  - One breaker per method — give each `withBreaker` call a unique `name`.
  - Always pass the caller's `user` (from req.user) through to `authHeader`, so the internal token carries who originated the request.
  - Not for external/third-party APIs — this is internal-network-only auth.
 */

export abstract class ResilientClient {
  private readonly issuer: string;
  private readonly audience: string;
  protected readonly client: AxiosInstance;
  private readonly defaultBreakerOptions: BreakerOptions;
  private readonly breakers = new Map<string, CircuitBreaker<any[], any>>();

  constructor(config: ResilientClientConfig) {
    this.issuer = config.issuer;
    this.audience = config.targetId;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 60000,
      httpsAgent: new https.Agent({ keepAlive: true }),
      maxContentLength: config.maxContentLength ?? 500 * 1000 * 1000,
      ...config.axiosConfig,
    });

    this.defaultBreakerOptions = {
      timeout: 5000,
      resetTimeout: 10000,
      rollingCountTimeout: 10000,
      errorThresholdPercentage: 50,
      ...config.defaultBreakerOptions,
    };
  }

  protected async authHeader(
    user?: HTTPUserContext,
  ): Promise<Record<string, string>> {
    const token = await signServiceToken({
      issuer: this.issuer,
      audience: this.audience,
      user,
    });
    return { "x-internal-token": token };
  }

  protected withBreaker<Args extends any[], R>(
    name: string,
    fn: (...args: Args) => Promise<R>,
    options: BreakerOptions = {},
  ): (...args: Args) => Promise<R> {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(fn, {
        ...this.defaultBreakerOptions,
        ...options,
      });
      this.breakers.set(name, breaker);
    }
    return (...args: Args): Promise<R> =>
      this.breakers.get(name)!.fire(...args);
  }
}
