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
  getPatternHistory,
  createThread,
  listThreads,
  getThreadById,
  updateThread,
  deleteThread,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { fetchPatternData, getPatternImageUrls, calculateStringLengths } from "./braceletbook";

const statusEnum = z.enum(["want_to_make", "in_progress", "completed", "frogged", "gifted"]);

const braceletInput = z.object({
  name: z.string().min(1).max(255),
  status: statusEnum.optional().default("want_to_make"),
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
  leftoverStringCm: z.number().min(0).optional().nullable(),
});

const threadInput = z.object({
  colorName: z.string().min(1).max(100),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  brand: z.string().max(100).optional().nullable(),
  colorCode: z.string().max(50).optional().nullable(),
  quantity: z.number().int().min(0).optional().default(1),
  threadType: z.enum(["regular", "glitter", "metallic", "glow_in_dark", "multicolor"]).optional().default("regular"),
  secondaryColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).optional().default([]),
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
        status: input.status ?? "want_to_make",
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
        leftoverStringCm: input.leftoverStringCm ?? null,
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
            status: z.string().optional(),
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

  pattern: router({
    lookup: protectedProcedure
      .input(z.object({ patternId: z.string().min(1) }))
      .query(async ({ input }) => {
        console.log("[Pattern] Looking up BraceletBook pattern:", input.patternId);
        const data = await fetchPatternData(input.patternId);
        if (!data) {
          return null;
        }
        return data;
      }),

    imageUrls: publicProcedure
      .input(z.object({ patternId: z.string().min(1) }))
      .query(({ input }) => {
        return getPatternImageUrls(input.patternId.replace(/^#/, "").replace(/\D/g, ""));
      }),

    calculateStrings: protectedProcedure
      .input(
        z.object({
          patternId: z.string().min(1),
          desiredLengthCm: z.number().min(1),
        })
      )
      .query(async ({ ctx, input }) => {
        console.log("[Pattern] Calculating strings for pattern:", input.patternId, "length:", input.desiredLengthCm);
        const pattern = await fetchPatternData(input.patternId);
        if (!pattern) {
          return { error: "Pattern not found on BraceletBook" };
        }

        // Get historical data for this pattern to improve estimates
        const history = await getPatternHistory(ctx.user.id, input.patternId.replace(/\D/g, ""));

        const calc = calculateStringLengths({
          desiredLengthCm: input.desiredLengthCm,
          totalKnots: pattern.totalKnots,
          numStrings: pattern.strings,
          rows: pattern.rows,
        });

        // If we have historical data, provide a learned estimate
        let learnedEstimate = null;
        if (history.length > 0) {
          const validHistory = history.filter(
            (h) => h.stringLengthCm != null && h.finalLengthCm != null && h.finalLengthCm > 0
          );
          if (validHistory.length > 0) {
            // Calculate the average ratio of string length to final length
            const ratios = validHistory.map((h) => (h.stringLengthCm || 0) / (h.finalLengthCm || 1));
            const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
            const learnedLength = Math.ceil(input.desiredLengthCm * avgRatio);

            // Also check leftover data for more precise estimates
            const withLeftover = validHistory.filter((h) => h.leftoverStringCm != null);
            let avgLeftover = 0;
            if (withLeftover.length > 0) {
              avgLeftover = withLeftover.reduce((a, h) => a + (h.leftoverStringCm || 0), 0) / withLeftover.length;
            }

            learnedEstimate = {
              recommendedLengthCm: learnedLength,
              basedOnCount: validHistory.length,
              avgRatio: Math.round(avgRatio * 100) / 100,
              avgLeftoverCm: Math.round(avgLeftover * 10) / 10,
              note: `Based on ${validHistory.length} previous bracelet(s) with this pattern. Average string-to-length ratio: ${avgRatio.toFixed(1)}x.${avgLeftover > 0 ? ` Average leftover: ${avgLeftover.toFixed(1)}cm — you could cut ${Math.ceil(learnedLength - avgLeftover)}cm to reduce waste.` : ""}`,
            };
          }
        }

        // Build learningData for the frontend
        let learningData = null;
        if (history.length > 0) {
          const withString = history.filter((h) => h.stringLengthCm != null && h.finalLengthCm != null && h.finalLengthCm > 0);
          const withLeftover = history.filter((h) => h.leftoverStringCm != null);
          if (withString.length > 0) {
            const avgStringLength = withString.reduce((a, h) => a + (h.stringLengthCm || 0), 0) / withString.length;
            const avgFinalLength = withString.reduce((a, h) => a + (h.finalLengthCm || 0), 0) / withString.length;
            const avgLeftover = withLeftover.length > 0
              ? withLeftover.reduce((a, h) => a + (h.leftoverStringCm || 0), 0) / withLeftover.length
              : null;
            
            learningData = {
              dataPoints: withString.length,
              avgStringLengthCm: Math.round(avgStringLength * 10) / 10,
              avgFinalLengthCm: Math.round(avgFinalLength * 10) / 10,
              avgLeftoverCm: avgLeftover != null ? Math.round(avgLeftover * 10) / 10 : null,
              personalRecommendation: learnedEstimate?.recommendedLengthCm || null,
            };
          }
        }

        return {
          pattern,
          calculation: calc,
          learningData,
          learnedEstimate,
          historyCount: history.length,
        };
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
