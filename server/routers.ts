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
import { fetchPatternData, getPatternImageUrls, calculatePerStringLengths } from "./braceletbook";

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
  perStringMeasurements: z.array(z.object({
    position: z.number().int().min(0),
    colorLetter: z.string().optional(),
    colorHex: z.string().optional(),
    cutLengthCm: z.number().min(0).nullable(),
    leftoverCm: z.number().min(0).nullable(),
  })).optional().nullable(),
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
        perStringMeasurements: input.perStringMeasurements ?? null,
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

        // Calculate per-string lengths using SVG knot data
        // Check for historical adjustment from past bracelets
        let historicalAdjustment: number | undefined;
        let learningData = null;

        if (history.length > 0) {
          // Prefer per-string measurements for learning data
          const withPerString = history.filter(
            (h: any) => h.perStringMeasurements && Array.isArray(h.perStringMeasurements) && h.perStringMeasurements.length > 0
          );

          if (withPerString.length > 0) {
            // Aggregate per-string leftover data across all historical bracelets
            const allLeftovers: number[] = [];
            for (const h of withPerString) {
              const measurements = (h as any).perStringMeasurements as Array<{ leftoverCm: number | null }>;
              for (const m of measurements) {
                if (m.leftoverCm != null) allLeftovers.push(m.leftoverCm);
              }
            }
            if (allLeftovers.length > 0) {
              const avgLeftover = allLeftovers.reduce((a, b) => a + b, 0) / allLeftovers.length;
              if (avgLeftover > 5) {
                historicalAdjustment = -(avgLeftover - 5);
              }
            }

            learningData = {
              dataPoints: withPerString.length,
              perStringDataPoints: allLeftovers.length,
              avgLeftoverCm: allLeftovers.length > 0
                ? Math.round((allLeftovers.reduce((a, b) => a + b, 0) / allLeftovers.length) * 10) / 10
                : null,
              source: "per-string" as const,
            };
          } else {
            // Fall back to legacy uniform measurements
            const validHistory = history.filter(
              (h) => h.stringLengthCm != null && h.finalLengthCm != null && h.finalLengthCm > 0
            );
            if (validHistory.length > 0) {
              const withLeftover = validHistory.filter((h) => h.leftoverStringCm != null);
              if (withLeftover.length > 0) {
                const avgLeftover = withLeftover.reduce((a, h) => a + (h.leftoverStringCm || 0), 0) / withLeftover.length;
                if (avgLeftover > 5) {
                  historicalAdjustment = -(avgLeftover - 5);
                }
              }

              const avgStringLength = validHistory.reduce((a, h) => a + (h.stringLengthCm || 0), 0) / validHistory.length;
              const avgFinalLength = validHistory.reduce((a, h) => a + (h.finalLengthCm || 0), 0) / validHistory.length;
              const avgLeftover = withLeftover.length > 0
                ? withLeftover.reduce((a, h) => a + (h.leftoverStringCm || 0), 0) / withLeftover.length
                : null;

              learningData = {
                dataPoints: validHistory.length,
                avgStringLengthCm: Math.round(avgStringLength * 10) / 10,
                avgFinalLengthCm: Math.round(avgFinalLength * 10) / 10,
                avgLeftoverCm: avgLeftover != null ? Math.round(avgLeftover * 10) / 10 : null,
                source: "legacy" as const,
              };
            }
          }
        }

        const calc = calculatePerStringLengths({
          desiredLengthCm: input.desiredLengthCm,
          perStringData: pattern.perStringData.map((s) => ({
            svgId: s.svgId,
            colorLetter: s.colorLetter,
            knotsTied: s.knotsTied,
            knotsOn: s.knotsOn,
          })),
          rows: pattern.rows,
          numStrings: pattern.strings,
          historicalAdjustment,
        });

        return {
          pattern,
          calculation: calc,
          learningData,
          historyCount: history.length,
        };
      }),
  }),

  colorCombo: router({
    suggest: protectedProcedure
      .input(
        z.object({
          patternId: z.string().min(1),
        })
      )
      .query(async ({ ctx, input }) => {
        console.log("[ColorCombo] Suggesting colors for pattern:", input.patternId);

        // Fetch pattern data to get color map
        const pattern = await fetchPatternData(input.patternId);
        if (!pattern) {
          return { error: "Pattern not found on BraceletBook", suggestions: [] };
        }

        // Get user's thread library
        const threads = await listThreads(ctx.user.id);
        if (!threads || threads.length === 0) {
          return {
            error: "Your thread library is empty. Add some threads first!",
            suggestions: [],
            pattern: {
              patternId: pattern.patternId,
              colorMap: pattern.colorMap,
              strings: pattern.strings,
              perStringData: pattern.perStringData.map((s) => ({
                svgId: s.svgId,
                colorLetter: s.colorLetter,
              })),
            },
          };
        }

        // Build color info for the LLM
        const patternColors = Object.entries(pattern.colorMap).map(([letter, hex]) => ({
          letter,
          hex,
          stringCount: pattern.perStringData.filter((s) => s.colorLetter === letter).length,
        }));

        const threadList = threads.map((t: any) => ({
          id: t.id,
          name: t.colorName,
          hex: t.colorHex,
          code: t.colorCode || null,
          brand: t.brand || null,
          type: t.threadType || "regular",
          secondaryColors: t.secondaryColors || [],
          quantity: t.quantity || 0,
        }));

        // Use LLM to suggest creative color combinations
        const { invokeLLM } = await import("./_core/llm");

        const response = await invokeLLM({
          messages: [
            {
              role: "system" as const,
              content: `You are a friendship bracelet color advisor. Given a pattern's color slots and a user's thread library, suggest 3 different color combinations. Each combination should be creative and aesthetically pleasing.

For each combination:
- Assign a thread from the library to each color letter in the pattern
- Consider color harmony, contrast, and visual appeal
- Name the combination theme (e.g., "Ocean Breeze", "Sunset Glow")
- Give a brief reason why the colors work together
- Consider thread types (metallic, glitter, multicolor) for accent positions
- Only suggest threads the user actually has (quantity > 0)
- Each color letter needs exactly one thread assignment

Respond with valid JSON matching the schema.`,
            },
            {
              role: "user" as const,
              content: `Pattern has ${pattern.strings} strings with ${patternColors.length} colors:
${patternColors.map((c) => `  Color "${c.letter}": ${c.hex} (used by ${c.stringCount} strings)`).join("\n")}

My thread library:
${threadList.map((t) => `  ID:${t.id} - ${t.name} (${t.hex})${t.code ? ` [${t.brand} ${t.code}]` : ""}${t.type !== "regular" ? ` [${t.type}]` : ""}${t.secondaryColors.length > 0 ? ` multicolor: ${t.secondaryColors.join(",")}` : ""} qty:${t.quantity}`).join("\n")}

Suggest 3 color combinations.`,
            },
          ],
          response_format: {
            type: "json_schema" as const,
            json_schema: {
              name: "color_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  combinations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Theme name for this combination" },
                        reason: { type: "string", description: "Why these colors work together" },
                        assignments: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              colorLetter: { type: "string", description: "Pattern color letter" },
                              threadId: { type: "number", description: "Thread ID from library" },
                              threadName: { type: "string", description: "Thread name" },
                              threadHex: { type: "string", description: "Thread hex color" },
                            },
                            required: ["colorLetter", "threadId", "threadName", "threadHex"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "reason", "assignments"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["combinations"],
                additionalProperties: false,
              },
            },
          },
        });

        let suggestions: Array<{
          name: string;
          reason: string;
          assignments: Array<{
            colorLetter: string;
            threadId: number;
            threadName: string;
            threadHex: string;
          }>;
        }> = [];

        try {
          const content = response.choices[0]?.message?.content;
          const text = typeof content === "string" ? content : "";
          const parsed = JSON.parse(text);
          suggestions = parsed.combinations || [];
        } catch (e) {
          console.error("[ColorCombo] Failed to parse LLM response:", e);
        }

        return {
          error: null,
          suggestions,
          pattern: {
            patternId: pattern.patternId,
            colorMap: pattern.colorMap,
            strings: pattern.strings,
            perStringData: pattern.perStringData.map((s) => ({
              svgId: s.svgId,
              colorLetter: s.colorLetter,
            })),
            previewImageUrl: pattern.previewImageUrl,
          },
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
