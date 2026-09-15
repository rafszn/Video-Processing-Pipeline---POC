/**
 Scaffolds a new service under _apps/<name>.
 Usage: npm run make:service -- <name> [--port <number>]

 Example:
   npm run make:service -- auth
   npm run make:service -- payments
   npm run make:service -- payments --port 5005
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPS_DIR = path.join(ROOT, "_apps");

interface Ctx {
  port: number;
  name: string; // kebab-case
  pascal: string; // PascalCase
}

interface TemplateFile {
  path: string;
  content: (ctx: Ctx) => string;
}

const TEMPLATE_FILES: TemplateFile[] = [
  {
    path: "package.json",
    content: ({ name }) => `{
  "name": "@core/${name}",
  "version": "1.0.0",
  "description": "",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/Bootstrap.ts",
    "make:module": "tsx scripts/make-module.ts",
    "start": "npm run build && node dist/Bootstrap.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "@core/building-blocks": "^1.0.0",
    "cors": "^2.8.6",
    "zod": "^4.6.4",
    "express": "^5.2.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.6"
  }
}
`,
  },
  {
    path: ".env.development",
    content: ({ name, port }) => `APP_NAME=${name}
PORT=${port}
INTERNAL_JWT_SECRET=...
ALLOWED_INTERNAL_CALLERS=ingress

REDIS_URL=

#messaging
RABBITMQ_HOST=
RABBITMQ_VHOST=
RABBITMQ_USERNAME=
RABBITMQ_PASSWORD=
RABBITMQ_PORT=
`,
  },
  {
    path: "Dockerfile",
    content: ({ name, port }) => `# syntax=docker/dockerfile:1
#
# Auto-generated for the "${name}" service
#
# Build context MUST be the repo root — npm workspaces needs every
# workspace's package.json to resolve @core/building-blocks correctly:
#
#   docker build -f _apps/${name}/Dockerfile --target production -t ${name} .
#
# Not meant to be built by hand day-to-day — see docker-compose.yml / docker-compose.override.yml at the repo root, which set the right target (dev vs production) and env vars for you.
 
ARG NODE_VERSION=22-alpine
 
# deps
FROM node:\${NODE_VERSION} AS deps
WORKDIR /app
COPY . .
RUN npm ci
 
# build: compile every workspace (building-blocks + all apps)
FROM deps AS build
RUN npm run build
 
# dev: run TS directly via tsx watch; compose mounts live
FROM deps AS dev
WORKDIR /app/_apps/${name}
ENV NODE_ENV=development
EXPOSE ${port}
CMD ["npx", "tsx", "watch", "src/Bootstrap.ts"]
 
# production: compiled JS, no live-reload
# Note: this still carries the full monorepo's node_modules (incl.
# devDependencies) and every workspace's compiled dist, not just ${name}
FROM build AS production
ENV NODE_ENV=production
WORKDIR /app/_apps/${name}
EXPOSE ${port}
CMD ["node", "dist/Bootstrap.js"]
`,
  },
  {
    path: "tsconfig.json",
    content: () => `{
  "extends": "../../tsconfig.base.json",

  "references": [{ "path": "../../_packages/building-blocks" }],

  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },

  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
`,
  },
  {
    path: "src/Bootstrap.ts",
    content: () => `import "reflect-metadata";
import App from "./app.js";
import env from "./global/environment.config.js";
import { initializeMessaging } from "./core/ext/messaging.js";

async function bootstrap() {
  const app = new App();
  await app.initialize();
  await initializeMessaging();
  const port = Number(env.PORT);
  app.listen(port);
}

bootstrap();
`,
  },
  {
    path: "src/Routes.ts",
    content: () => `import { Router } from "express";
import v1Routes from "./core/v1/routes.js";

const router = Router();

router.use("/v1", v1Routes);

export default router;
`,
  },
  {
    path: "src/app.ts",
    content: () => `import hpp from "hpp";
import helmet from "helmet";
import Routes from "./Routes.js";
import compression from "compression";
import cookieParser from "cookie-parser";
import express, { Application } from "express";
import logger from "./global/library/logger.js";
import env from "./global/environment.config.js";
import { health } from "@core/building-blocks/health";
import { requestLogger } from "@core/building-blocks/logger";
import { notFound } from "./global/middlewares/not-found.js";
import { requestId } from "./global/middlewares/request-id.js";
import { errorHandler } from "@core/building-blocks/exceptions";
import internalAuthGuard from "./global/middlewares/internal-auth-guard.js";

export default class App {
  public app: Application;
  constructor() {
    this.app = express();
  }

  async initialize() {
    this.app.set("trust proxy", true);
    this.app.use(requestId);

    // security middlewares
    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(compression());
    this.app.use(hpp());
    this.app.use(cookieParser());
    this.app.use(requestLogger);

    // health check
    this.app.get("/health", health(env.APP_NAME));

    this.app.use(internalAuthGuard);
    this.app.use(express.json());

    // routes
    this.app.use(Routes);

    this.app.use(notFound);
    this.app.use(errorHandler);
  }

  listen(port: number) {
    this.app.listen(port, () => {
      logger.info(\`[\${env.APP_NAME}] Server listening\`, {
        port,
        environment: env.NODE_ENV,
      });
    });
  }
}
`,
  },
  {
    path: "src/core/ext/cache.ts",
    content: () => `import {
  CacheContract,
  RedisCacheAdapterImpl,
  MemoryCacheAdapterImpl,
} from "@core/building-blocks/cache";
import { redis } from "./redis.js";
import logger from "../../global/library/logger.js";
import env from "../../global/environment.config.js";

function createCacheService(): CacheContract {
  if (env.CACHE_DRIVER !== "redis") {
    return new MemoryCacheAdapterImpl();
  }

  if (!redis) {
    logger.warn(
      "[Cache] CACHE_DRIVER is redis, but REDIS_URL is missing. Falling back to memory cache.",
    );
    return new MemoryCacheAdapterImpl();
  }

  return new RedisCacheAdapterImpl(redis);
}

export const Cache = createCacheService();
`,
  },
  {
    path: "src/core/ext/messaging.ts",
    content: () => `import {
  initiateRabbitMQ,
  RabbitMQConnectionOptions,
} from "@core/building-blocks/messaging";
import env from "../../global/environment.config.js";

export const initializeMessaging = async () => {
  await initiateRabbitMQ(
    new RabbitMQConnectionOptions(
      env.RABBITMQ_HOST!,
      env.RABBITMQ_PORT!,
      env.RABBITMQ_USERNAME!,
      env.RABBITMQ_PASSWORD!,
      env.RABBITMQ_VHOST!,
    ),
  );
};
`,
  },
  {
    path: "src/core/ext/redis.ts",
    content: () => `import env from "../../global/environment.config.js";
import { createRedisClient } from "@core/building-blocks/redis";

export const redis = createRedisClient({
  redisUrl: env.REDIS_URL!,
});
`,
  },
  {
    path: "src/core/v1/controllers.ts",
    content: ({ pascal }) => `import defService from "./service.js";
import { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "../../global/constants/http-status-codes.js";

export const get${pascal} = async (
  req: Request<object, object, object>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await defService.create${pascal}();

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "complete",
      data,
    });
  } catch (error) {
    next(error);
  }
};
`,
  },
  {
    path: "src/core/v1/docs.ts",
    content: () => "",
  },
  {
    path: "src/core/v1/dto.ts",
    content: ({ pascal }) => `import { z } from "zod";

export const create${pascal}Schema = z.object({
  type: z.string().min(2),
});

export type Create${pascal}DTO = z.infer<typeof create${pascal}Schema>;
`,
  },
  {
    path: "src/core/v1/routes.ts",
    content: ({ pascal }) => `import { Router } from "express";
import { get${pascal} } from "./controllers.js";
import { create${pascal}Schema } from "./dto.js";
import { validate } from "@core/building-blocks/validator";

const router = Router();

router.get("/", get${pascal});
router.post("/", validate(create${pascal}Schema), get${pascal});

export default router;
`,
  },
  {
    path: "src/core/v1/service.ts",
    content: ({ name, pascal }) => `import { Cache } from "../ext/cache.js";
import { MINUTE } from "@core/building-blocks/time";

class DefService {
  private readonly cachePrefix = "myapp:${name}";

  async create${pascal}() {
    const cacheKey = Cache.createKey(this.cachePrefix);
    return Cache.getOrSet(
      cacheKey,
      async () => ({
        module: "${pascal}",
        status: "ready",
      }),
      5 * MINUTE,
    );
  }
}

const defService = new DefService();
export default defService;
`,
  },
  {
    path: "src/core/v1/types.ts",
    content: () => "",
  },
  {
    path: "src/global/constants/http-status-codes.ts",
    content: () => `export const HTTP_STATUS = Object.freeze({
  // 2xx Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // 3xx Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // 4xx Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const);
`,
  },
  {
    path: "src/global/environment.config.ts",
    content: ({ name, port }) => `import { z } from "zod";
import dotenv from "dotenv";
import { loadEnv } from "@core/building-blocks/config";

const envFile = \`.env.\${process.env.NODE_ENV || "development"}\`;
dotenv.config({ path: envFile });

const envSchema = z.object({
  APP_NAME: z.string().default("${name}"),
  NODE_ENV: z
    .enum(["development", "production"])
    .default("development"),
  PORT: z.coerce.number().default(${port}),

  ALLOWED_INTERNAL_CALLERS: z.string().default("ingress"), //comma seperated string of service names

  /* ---------- cache config ---------- */
  REDIS_URL: z.string().optional(),
  CACHE_DRIVER: z.enum(["redis", "memory"]).default("memory"),

  /* ---------- rabbitmq config ------- */
  RABBITMQ_HOST: z.string().optional(),
  RABBITMQ_VHOST: z.string().optional(),
  RABBITMQ_USERNAME: z.string().optional(),
  RABBITMQ_PASSWORD: z.string().optional(),
  RABBITMQ_PORT: z.coerce.number().optional(),
});

const env = loadEnv(envSchema, "${name}");

export default env;
`,
  },
  {
    path: "src/global/library/logger.ts",
    content: () => `import {Logger} from "@core/building-blocks/logger";
const logger = new Logger();
export default logger;
`,
  },
  {
    path: "src/global/middlewares/internal-auth-guard.ts",
    content: () => `import env from "../environment.config.js";
import { createInternalAuthGuard } from "@core/building-blocks/s2s-auth";

const internalAuthGuard = createInternalAuthGuard({
  audience: env.APP_NAME!,
  allowedIssuers: (env.ALLOWED_INTERNAL_CALLERS ?? "").split(","),
});

export default internalAuthGuard;
`,
  },
  {
    path: "src/global/middlewares/not-found.ts",
    content: () => `import logger from "../library/logger.js";
import { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/http-status-codes.js";

export const notFound = (req: Request, res: Response) => {
  logger.error("NOT_FOUND", {
    message: \`Method [\${req.method}] | Route [\${req.originalUrl}] not found\`,
    path: req.path,
  });
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: \`Method [\${req.method}] | Route [\${req.originalUrl}] not found\`,
    code: "NOT_FOUND",
  });
};
`,
  },
  {
    path: "src/global/middlewares/request-id.ts",
    content: () => `import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = req.header("x-request-id") ?? randomUUID();
  req.headers["x-request-id"] = id;
  res.setHeader("x-request-id", id);
  next();
}
`,
  },
  {
    path: "src/global/types/index.d.ts",
    content: () => `export {};

declare global {
  namespace Express {
    interface Request {
      internalServiceToken: string;
      serviceName?: string;
      user?: {
        id: string;
        [key: string]: unknown;
      };
    }
  }
}
`,
  },
];

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function toCamelCase(kebab: string): string {
  const pascal = toPascalCase(kebab);
  return pascal[0].toLowerCase() + pascal.slice(1);
}

function parseArgs(argv: string[]) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const name = positional[0];

  const portFlagIndex = argv.indexOf("--port");
  const port =
    portFlagIndex !== -1 && argv[portFlagIndex + 1]
      ? Number(argv[portFlagIndex + 1])
      : undefined;

  if (portFlagIndex !== -1 && (!port || Number.isNaN(port))) {
    fail("--port requires a valid number");
  }

  return { name, port };
}

function getExistingPorts(): number[] {
  const ports: number[] = [];

  if (!fs.existsSync(APPS_DIR)) return ports;

  for (const service of fs.readdirSync(APPS_DIR)) {
    const envConfigPath = path.join(
      APPS_DIR,
      service,
      "src/global/environment.config.ts",
    );
    if (!fs.existsSync(envConfigPath)) continue;

    const content = fs.readFileSync(envConfigPath, "utf8");
    const match = content.match(
      /PORT:\s*z\.coerce\.number\(\)\.default\((\d+)\)/,
    );
    if (match) ports.push(Number(match[1]));
  }

  return ports;
}

function updateTsconfigReferences(kebab: string) {
  const tsconfigPath = path.join(ROOT, "tsconfig.json");
  let content = fs.readFileSync(tsconfigPath, "utf8");

  const refPath = `./_apps/${kebab}`;
  if (content.includes(refPath)) return;

  const buildingBlocksRef = `{ "path": "./_packages/building-blocks" }`;
  if (!content.includes(buildingBlocksRef)) {
    fail(
      `Couldn't find the building-blocks reference in tsconfig.json to insert next to.`,
    );
  }

  content = content.replace(
    buildingBlocksRef,
    `{ "path": "${refPath}" },\n    ${buildingBlocksRef}`,
  );

  fs.writeFileSync(tsconfigPath, content, "utf8");
}

function updateServicesMap(kebab: string, camel: string): boolean {
  const servicesPath = path.join(__dirname, "services.ts");
  let content = fs.readFileSync(servicesPath, "utf8");

  const keyPattern = new RegExp(`^\\s*${camel}\\s*:`, "m");
  if (keyPattern.test(content)) return false;

  const newEntry = `  ${camel}: "@core/${kebab}",\n`;
  const marker = "} as const;";

  if (!content.includes(marker)) {
    fail(`Couldn't find "${marker}" in _scripts/services.ts to insert into.`);
  }

  content = content.replace(marker, `${newEntry}${marker}`);
  fs.writeFileSync(servicesPath, content, "utf8");
  return true;
}

function hasComposeService(content: string, name: string): boolean {
  // Matches a top-level (2-space indented) service key, e.g. "  auth:".
  return new RegExp(`^  ${name}:`, "m").test(content);
}

function updateDockerCompose(name: string, port: number): boolean {
  const composePath = path.join(ROOT, "docker-compose.yml");
  if (!fs.existsSync(composePath)) return false;

  let content = fs.readFileSync(composePath, "utf8");
  if (hasComposeService(content, name)) return false;

  const block = `#######################################################
  #  ${name}
  #######################################################
  ${name}:
    build:
      context: .
      dockerfile: _apps/${name}/Dockerfile
      target: production
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: ${port}
      ALLOWED_INTERNAL_CALLERS: ingress
      CACHE_DRIVER: redis
      REDIS_URL: redis://redis:6379
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USERNAME: \${RABBITMQ_USERNAME:-guest}
      RABBITMQ_PASSWORD: \${RABBITMQ_PASSWORD:-guest}
      RABBITMQ_VHOST: /
    depends_on:
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
 
`;

  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const marker = `${newline}volumes:${newline}`;

  if (!content.includes(marker)) {
    fail(
      `Couldn't find the top-level "volumes:" section in docker-compose.yml to insert before.`,
    );
  }

  content = content.replace(
    marker,
    `${newline}${block}${newline}volumes:${newline}`,
  );

  fs.writeFileSync(composePath, content, "utf8");

  return true;
}

function updateDockerComposeOverride(name: string, port: number): boolean {
  const overridePath = path.join(ROOT, "docker-compose.override.yml");
  if (!fs.existsSync(overridePath)) return false;

  const content = fs.readFileSync(overridePath, "utf8");
  if (hasComposeService(content, name)) return false;

  const block = `
  ${name}:
    build:
      target: dev
    environment:
      NODE_ENV: development
    volumes:
      - ./_apps/${name}:/app/_apps/${name}
      - ./_packages/building-blocks:/app/_packages/building-blocks
    ports:
      - "${port}:${port}"
`;

  fs.writeFileSync(overridePath, content.replace(/\n?$/, "\n") + block, "utf8");
  return true;
}

function main() {
  const { name, port: explicitPort } = parseArgs(process.argv.slice(2));

  if (!name) {
    fail(
      "Missing service name.\n\nUsage:\n  npm run make:service -- <name> [--port <number>]\n\nExample:\n  npm run make:service -- payments",
    );
  }

  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    fail(
      `Invalid service name "${name}". Use lowercase letters, numbers, and hyphens, starting with a letter (e.g. "payments", "user-profile").`,
    );
  }

  const targetDir = path.join(APPS_DIR, name);
  if (fs.existsSync(targetDir)) {
    fail(`_apps/${name} already exists.`);
  }

  const camel = toCamelCase(name);
  const pascal = toPascalCase(name);
  const port = explicitPort ?? Math.max(...getExistingPorts(), 4999) + 1;
  const ctx: Ctx = { name, pascal, port };

  console.log(`\nScaffolding _apps/${name}...`);

  for (const file of TEMPLATE_FILES) {
    const dest = path.join(targetDir, file.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, file.content(ctx), "utf8");
  }

  updateTsconfigReferences(name);
  const registeredInServicesMap = updateServicesMap(name, camel);
  const registeredInCompose = updateDockerCompose(name, port);
  const registeredInComposeOverride = updateDockerComposeOverride(name, port);

  console.log(`✓ Created _apps/${name}`);
  console.log(`✓ Added project reference in tsconfig.json`);
  console.log(
    registeredInServicesMap
      ? `✓ Registered "${camel}" in _scripts/services.ts`
      : `✓ "${camel}" was already registered in _scripts/services.ts (left as-is)`,
  );
  console.log(`✓ Assigned PORT ${port}`);
  if (registeredInCompose) {
    console.log(`✓ Added "${name}" service to docker-compose.yml`);
  }
  if (registeredInComposeOverride) {
    console.log(
      `✓ Added "${name}" dev overrides to docker-compose.override.yml`,
    );
  }

  const envVarName = `${name.toUpperCase().replace(/-/g, "_")}_SERVICE_URL`;

  console.log(`
Next steps:

  1. npm install                     # link the new workspace
  2. npm run dev -- ${name}${" ".repeat(Math.max(1, 10 - name.length))}# start it on port ${port}

To expose it through the ingress gateway, in _apps/ingress:

  - add ${envVarName} to src/global/environment.config.ts

  - add an entry to the \`services\` map in src/proxy/services.ts:
      ${camel}: { 
               id: "${name}", 
               serviceName: "${pascal}", 
               target: env.${envVarName} 
              },
                
  - add a route in src/Routes.ts:
      router.use(
        "/${name}", 
        ...createServiceProxy({ 
          id: services.${camel}.id, 
          target: services.${camel}.target, 
          serviceName: services.${camel}.serviceName 
        })
      );

  - add "${name}" to ALLOWED_INTERNAL_CALLERS in the new service's .env if it should be reachable from somewhere other than ingress
`);
}

main();
