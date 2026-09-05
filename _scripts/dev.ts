import concurrently from "concurrently";
import { ServiceName, SERVICES } from "./services.js";

const requestedServices = process.argv.slice(2);

function isServiceName(value: string): value is ServiceName {
  return value in SERVICES;
}

if (requestedServices.length === 0) {
  console.error(
    `No services specified.\n\nAvailable services:\n${Object.keys(SERVICES)
      .map((service) => `  ${service}`)
      .join("\n")}\n\nExample:\n  npm run dev -- ingress users`,
  );

  process.exit(1);
}

const invalidServices = requestedServices.filter(
  (service) => !isServiceName(service),
);

if (invalidServices.length > 0) {
  console.error(
    `Unknown service${invalidServices.length > 1 ? "s" : ""}: ${invalidServices.join(
      ", ",
    )}\n\nAvailable services:\n${Object.keys(SERVICES)
      .map((service) => `  ${service}`)
      .join("\n")}`,
  );

  process.exit(1);
}

const services = [...new Set(requestedServices)];

const commands = services.map((service) => ({
  command: `npm run dev -w ${SERVICES[service as ServiceName]}`,
  name: service,
}));

concurrently(commands, {
  prefix: "name",
  restartTries: 0,
  prefixColors: "auto",
  killOthersOn: ["failure"],
}).result.then(
  () => process.exit(0),
  () => process.exit(1),
);
