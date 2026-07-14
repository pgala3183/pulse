import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { ThrottlerModule } from "@nestjs/throttler";
import { PubSub } from "graphql-subscriptions";
import { ApiKeyGuard } from "./auth/api-key.guard";
import { GqlThrottlerGuard } from "./auth/gql-throttler.guard";
import { APP_CONFIG, loadApiGatewayConfig } from "./config";
import { GatewayResolver } from "./graphql/gateway.resolver";
import {
  createPulseKafkaClient,
  LiveEventsBridge,
  PULSE_KAFKA_CLIENT,
} from "./kafka/live-events.bridge";
import { MlPassthroughController } from "./ml/ml-passthrough.controller";
import { GRAPHQL_PUB_SUB } from "./pubsub.tokens";
import { GatewayStore } from "./store/gateway.store";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 120,
      },
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: true,
      subscriptions: {
        "graphql-ws": true,
      },
      context: ({
        req,
        res,
        connectionParams,
      }: {
        req?: unknown;
        res?: unknown;
        connectionParams?: unknown;
      }) => {
        if (req) {
          return { req, res };
        }
        const params =
          typeof connectionParams === "object" && connectionParams !== null
            ? (connectionParams as Record<string, unknown>)
            : {};
        const apiKey =
          (typeof params["x-api-key"] === "string" && params["x-api-key"]) ||
          (typeof params["Authorization"] === "string" &&
            String(params["Authorization"]).replace(/^Bearer\s+/i, "")) ||
          undefined;
        const stubRes = {
          header() {
            return stubRes;
          },
          setHeader() {
            return stubRes;
          },
        };
        return {
          req: {
            headers: {
              "x-api-key": apiKey,
            },
            header(name: string): string | undefined {
              if (name.toLowerCase() === "x-api-key") {
                return apiKey;
              }
              if (name.toLowerCase() === "authorization" && apiKey) {
                return `Bearer ${apiKey}`;
              }
              return undefined;
            },
          },
          res: stubRes,
        };
      },
    }),
  ],
  controllers: [MlPassthroughController],
  providers: [
    GatewayStore,
    GatewayResolver,
    LiveEventsBridge,
    {
      provide: APP_CONFIG,
      useFactory: async () => loadApiGatewayConfig(),
    },
    {
      provide: GRAPHQL_PUB_SUB,
      useValue: new PubSub(),
    },
    {
      provide: PULSE_KAFKA_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: Awaited<ReturnType<typeof loadApiGatewayConfig>>) =>
        createPulseKafkaClient(config),
    },
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
  exports: [GatewayStore, LiveEventsBridge, GRAPHQL_PUB_SUB, PULSE_KAFKA_CLIENT, APP_CONFIG],
})
export class AppModule {}
