import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";
import { APP_CONFIG, type ApiGatewayConfig } from "../config";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: ApiGatewayConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const expected = this.config.apiKey;
    const request = this.getRequest(context);
    const provided =
      request.header("x-api-key") ?? this.bearerToken(request.header("authorization"));

    if (!provided || provided !== expected) {
      throw new UnauthorizedException("Invalid or missing API key");
    }

    return true;
  }

  private getRequest(context: ExecutionContext): Request {
    if (context.getType<"http" | "graphql">() === "graphql") {
      const gqlContext = GqlExecutionContext.create(context);
      return gqlContext.getContext<{ req: Request }>().req;
    }
    return context.switchToHttp().getRequest<Request>();
  }

  private bearerToken(authorization: string | undefined): string | undefined {
    if (!authorization?.startsWith("Bearer ")) {
      return undefined;
    }
    return authorization.slice("Bearer ".length).trim();
  }
}
