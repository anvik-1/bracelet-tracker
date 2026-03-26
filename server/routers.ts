import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createBracelet,
  listBracelets,
  getBraceletById,
  updateBracelet,
  deleteBracelet,
  getBraceletStats,
  createThread,
  listThreads,
  getThreadById,
  updateThread,
  deleteThread,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const braceletInput = z.object({
  name: z.string().min(1).max(255),
  patternName: z.string().max(255).optional().nullable(),
  patternNumber: z.string().max(100).optional().nullable(),
  patternUrl: z.string().optional().nullable(),
  colors: z.array(z.string()).optional().default([]),
  materials: z.string().max(500).optional().nullable(),
  dateMade: z.string().optional().nullable(),
  timeTakenMinutes: z.number().int().min(0).optional().nullable(),
  difficulty: z.enum(["beginner", "easy", "medium", "hard", "expert"]).optional().nullable(),
  notes: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  outcome: z.enum(["perfect", "good", "okay", "needs_improvement", "failed"]).optional().nullable(),
  finalLengthCm: z.number().min(0).optional().nullable(),
  stringLengthCm: z.number().min(0).optional().nullable(),
  numberOfStrings: z.number().int().min(0).optional().nullable(),
});

const threadInput = z.object({
  colorName: z.string().min(1).max(100),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  brand: z.string().max(100).optional().nullable(),
  colorCode: z.string().max(50).optional().nullable(),
  quantity: z.number().int().min(0).optional().default(1),
  notes: z.string().optional().nullable(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  bracelet: router({
    create: protectedProcedure.input(braceletInput).mutation(async ({ ctx, input }) => {
      console.log("[Bracelet] Creating bracelet:", input.name);
      return createBracelet({
        userId: ctx.user.id,
        name: input.name,
        patternName: input.patternName ?? null,
        patternNumber: input.patternNumber ?? null,
        patternUrl: input.patternUrl ?? null,
        colors: input.colors,
        materials: input.materials ?? null,
        dateMade: input.dateMade ? new Date(input.dateMade) : null,
        timeTakenMinutes: input.timeTakenMinutes ?? null,
        difficulty: input.difficulty ?? null,
        notes: input.notes ?? null,
        rating: input.rating ?? null,
        outcome: input.outcome ?? null,
        finalLengthCm: input.finalLengthCm ?? null,
        stringLengthCm: input.stringLengthCm ?? null,
        numberOfStrings: input.numberOfStrings ?? null,
      });
    }),

    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            difficulty: z.string().optional(),
            rating: z.number().optional(),
            outcome: z.string().optional(),
            color: z.string().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            sortBy: z.string().optional(),
            sortOrder: z.enum(["asc", "desc"]).optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        console.log("[Bracelet] Listing bracelets for user:", ctx.user.id);
        return listBracelets(ctx.user.id, {
          ...input,
          dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
          dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
        });
      }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      return getBraceletById(input.id, ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({ id: z.number() }).merge(braceletInput.partial()))
      .mutation(async ({ ctx, input }) => {
        console.log("[Bracelet] Updating bracelet:", input.id);
        const { id, ...data } = input;
        const updateData: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined) {
            if (key === "dateMade" && typeof value === "string") {
              updateData[key] = new Date(value);
            } else {
              updateData[key] = value;
            }
          }
        }
        return updateBracelet(id, ctx.user.id, updateData);
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      console.log("[Bracelet] Deleting bracelet:", input.id);
      return deleteBracelet(input.id, ctx.user.id);
    }),

    uploadPhoto: protectedProcedure
      .input(
        z.object({
          braceletId: z.number(),
          base64: z.string(),
          mimeType: z.string().default("image/jpeg"),
          fileName: z.string().default("photo.jpg"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        console.log("[Bracelet] Uploading photo for bracelet:", input.braceletId);
        const buffer = Buffer.from(input.base64, "base64");
        const fileKey = `bracelet-photos/${ctx.user.id}/${input.braceletId}-${nanoid(8)}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        await updateBracelet(input.braceletId, ctx.user.id, {
          photoUrl: url,
          photoKey: fileKey,
        });
        console.log("[Bracelet] Photo uploaded:", url);
        return { url, key: fileKey };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      console.log("[Bracelet] Getting stats for user:", ctx.user.id);
      return getBraceletStats(ctx.user.id);
    }),
  }),

  thread: router({
    create: protectedProcedure.input(threadInput).mutation(async ({ ctx, input }) => {
      console.log("[Thread] Creating thread:", input.colorName);
      return createThread({
        userId: ctx.user.id,
        ...input,
      });
    }),

    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        console.log("[Thread] Listing threads for user:", ctx.user.id);
        return listThreads(ctx.user.id, input?.search);
      }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      return getThreadById(input.id, ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({ id: z.number() }).merge(threadInput.partial()))
      .mutation(async ({ ctx, input }) => {
        console.log("[Thread] Updating thread:", input.id);
        const { id, ...data } = input;
        return updateThread(id, ctx.user.id, data);
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      console.log("[Thread] Deleting thread:", input.id);
      return deleteThread(input.id, ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
