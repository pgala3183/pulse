"use client";

import { ApolloProvider } from "@apollo/client";
import type { ReactNode } from "react";
import { getApolloClient } from "./apollo-client";

export function ApolloAppProvider({ children }: { children: ReactNode }) {
  return <ApolloProvider client={getApolloClient()}>{children}</ApolloProvider>;
}
