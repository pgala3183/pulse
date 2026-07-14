import { ExecutionContext, Injectable } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { ThrottlerGuard } from "@nestjs/throttler";

type HeaderCapable = {
  header: (name: string, value?: string) => unknown;
  setHeader?: (name: string, value: string) => unknown;
};

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  override getRequestResponse(context: ExecutionContext): {
    req: Record<string, unknown>;
    res: HeaderCapable;
  } {
    if (context.getType<"http" | "graphql">() === "graphql") {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext<{ req: Record<string, unknown>; res?: HeaderCapable }>();
      const res: HeaderCapable = ctx.res ?? {
        header() {
          return this;
        },
        setHeader() {
          return this;
        },
      };
      return { req: ctx.req, res };
    }
    const http = context.switchToHttp();
    return {
      req: http.getRequest<Record<string, unknown>>(),
      res: http.getResponse<HeaderCapable>(),
    };
  }
}
