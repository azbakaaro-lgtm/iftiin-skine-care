import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

// Auth is handled per-procedure via explicit session tokens
// (see server/phase1-auth.ts) rather than request-level context.
export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
  };
}
