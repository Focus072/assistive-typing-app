import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "pretty",
  })

// Add query logging middleware to catch Prisma operations
prisma.$use(async (params, next) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:15',message:'Prisma query start',data:{model:params.model,action:params.action},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'I'})}).catch(()=>{});
  // #endregion
  try {
    const result = await next(params)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:19',message:'Prisma query success',data:{model:params.model,action:params.action},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    return result
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:23',message:'Prisma query error',data:{model:params.model,action:params.action,errorCode:error?.code,errorMessage:error?.message,errorMeta:error?.meta},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    if (process.env.NODE_ENV === "development") {
      console.error("[Prisma] Error:", { model: params.model, action: params.action, error })
    }
    throw error
  }
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma


