export const graphqlHttpUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL ?? "http://localhost:3000/graphql";

export const graphqlWsUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_WS_URL ?? "ws://localhost:3000/graphql";

export const pulseApiKey = process.env.NEXT_PUBLIC_PULSE_API_KEY ?? "dev-api-key";
