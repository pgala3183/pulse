"use client";

import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  split,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { Kind, OperationTypeNode } from "graphql";
import { createClient } from "graphql-ws";
import { graphqlHttpUrl, graphqlWsUrl, pulseApiKey } from "./env";

let browserClient: ApolloClient<unknown> | undefined;

function createApolloClient(): ApolloClient<unknown> {
  const httpLink = new HttpLink({
    uri: graphqlHttpUrl,
    headers: {
      "x-api-key": pulseApiKey,
    },
  });

  const authLink = new ApolloLink((operation, forward) => {
    operation.setContext(({ headers = {} }: { headers?: Record<string, string> }) => ({
      headers: {
        ...headers,
        "x-api-key": pulseApiKey,
      },
    }));
    return forward(operation);
  });

  const wsLink =
    typeof window === "undefined"
      ? null
      : new GraphQLWsLink(
          createClient({
            url: graphqlWsUrl,
            connectionParams: {
              "x-api-key": pulseApiKey,
            },
            retryAttempts: 8,
          }),
        );

  const link =
    wsLink === null
      ? authLink.concat(httpLink)
      : split(
          ({ query }) => {
            const definition = getMainDefinition(query);
            return (
              definition.kind === Kind.OPERATION_DEFINITION &&
              definition.operation === OperationTypeNode.SUBSCRIPTION
            );
          },
          wsLink,
          authLink.concat(httpLink),
        );

  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
  });
}

export function getApolloClient(): ApolloClient<unknown> {
  if (typeof window === "undefined") {
    return createApolloClient();
  }
  browserClient ??= createApolloClient();
  return browserClient;
}
