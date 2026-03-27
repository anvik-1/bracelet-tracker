import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => {
  const mockBracelets: any[] = [];
  let nextId = 1;

  const mockThreads: any[] = [];
  let nextThreadId = 1;

  return {
    createBracelet: vi.fn(async (data: any) => {
      const bracelet = {
        id: nextId++,
        ...data,
        photoUrl: null,
        photoKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockBracelets.push(bracelet);
      return bracelet;
    }),
    listBracelets: vi.fn(async (userId: number, _filters?: any) => {
      return mockBracelets.filter((b) => b.userId === userId);
    }),
    getBraceletById: vi.fn(async (id: number, userId: number) => {
      return mockBracelets.find((b) => b.id === id && b.userId === userId) ?? null;
    }),
    updateBracelet: vi.fn(async (id: number, userId: number, data: any) => {
      const idx = mockBracelets.findIndex((b) => b.id === id && b.userId === userId);
      if (idx >= 0) {
        mockBracelets[idx] = { ...mockBracelets[idx], ...data };
        return mockBracelets[idx];
      }
      return null;
    }),
    deleteBracelet: vi.fn(async (_id: number, _userId: number) => {
      return { success: true };
    }),
    getBraceletStats: vi.fn(async (_userId: number) => {
      return {
        totalCount: mockBracelets.length,
        topColors: [],
        avgTimeMinutes: 0,
        difficultyDistribution: {},
        outcomeDistribution: {},
        ratingDistribution: {},
        monthlyTrend: {},
      };
    }),
    createThread: vi.fn(async (data: any) => {
      const thread = {
        id: nextThreadId++,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockThreads.push(thread);
      return thread;
    }),
    listThreads: vi.fn(async (userId: number, _search?: string) => {
      return mockThreads.filter((t) => t.userId === userId);
    }),
    getThreadById: vi.fn(async (id: number, userId: number) => {
      return mockThreads.find((t) => t.id === id && t.userId === userId) ?? null;
    }),
    updateThread: vi.fn(async (id: number, userId: number, data: any) => {
      const idx = mockThreads.findIndex((t) => t.id === id && t.userId === userId);
      if (idx >= 0) {
        mockThreads[idx] = { ...mockThreads[idx], ...data };
        return mockThreads[idx];
      }
      return null;
    }),
    deleteThread: vi.fn(async (_id: number, _userId: number) => {
      return { success: true };
    }),
    getPatternHistory: vi.fn(async () => []),
    // Keep user helpers for auth
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getDb: vi.fn(),
  };
});

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn(async (_key: string, _data: any, _mime: string) => ({
    url: "https://cdn.example.com/test-photo.jpg",
    key: "test-key",
  })),
}));

// Mock braceletbook
vi.mock("./braceletbook", () => ({
  fetchPatternData: vi.fn(async (patternId: string) => {
    if (patternId === "999999") return null;
    return {
      patternId,
      patternUrl: `https://www.braceletbook.com/patterns/normal/${patternId}/`,
      previewImageUrl: `https://media.braceletbookcdn.com/preview.png`,
      patternImageUrl: `https://media.braceletbookcdn.com/pattern.png`,
      previewSmallUrl: `https://media.braceletbookcdn.com/preview_small.png`,
      strings: 8,
      rows: 20,
      colors: 3,
      dimensions: "20x8",
      colorHexValues: ["#FF0000", "#00FF00", "#0000FF"],
      totalKnots: 80,
      author: "testuser",
      perStringData: [
        { index: 0, svgId: "s00", colorLetter: "a", knotsTied: 10, knotsOn: 10, totalKnots: 20, recommendedLengthCm: 60 },
        { index: 1, svgId: "s01", colorLetter: "b", knotsTied: 12, knotsOn: 8, totalKnots: 20, recommendedLengthCm: 65 },
        { index: 2, svgId: "s10", colorLetter: "c", knotsTied: 8, knotsOn: 12, totalKnots: 20, recommendedLengthCm: 55 },
        { index: 3, svgId: "s11", colorLetter: "a", knotsTied: 10, knotsOn: 10, totalKnots: 20, recommendedLengthCm: 60 },
        { index: 4, svgId: "s20", colorLetter: "b", knotsTied: 12, knotsOn: 8, totalKnots: 20, recommendedLengthCm: 65 },
        { index: 5, svgId: "s21", colorLetter: "c", knotsTied: 8, knotsOn: 12, totalKnots: 20, recommendedLengthCm: 55 },
        { index: 6, svgId: "s30", colorLetter: "a", knotsTied: 10, knotsOn: 10, totalKnots: 20, recommendedLengthCm: 60 },
        { index: 7, svgId: "s31", colorLetter: "b", knotsTied: 12, knotsOn: 8, totalKnots: 20, recommendedLengthCm: 65 },
      ],
      colorMap: { a: "#FF0000", b: "#00FF00", c: "#0000FF" },
    };
  }),
  getPatternImageUrls: vi.fn((patternId: string) => ({
    previewImage: `https://media.braceletbookcdn.com/preview.png`,
    previewSmall: `https://media.braceletbookcdn.com/preview_small.png`,
    previewSmall2x: `https://media.braceletbookcdn.com/preview_small_2x.png`,
    patternImage: `https://media.braceletbookcdn.com/pattern.png`,
    patternSvg: `https://www.braceletbook.com/pattern.svg`,
    previewSvg: `https://www.braceletbook.com/preview.svg`,
  })),
  calculatePerStringLengths: vi.fn(),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{
      message: {
        content: JSON.stringify({
          combinations: [
            {
              name: "Ocean Breeze",
              reason: "Cool blues and greens create a calming ocean feel",
              assignments: [
                { colorLetter: "a", threadId: 1, threadName: "Sky Blue", threadHex: "#87CEEB" },
                { colorLetter: "b", threadId: 2, threadName: "Sea Green", threadHex: "#2E8B57" },
                { colorLetter: "c", threadId: 3, threadName: "Deep Navy", threadHex: "#000080" },
              ],
            },
          ],
        }),
      },
    }],
  })),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("bracelet router", () => {
  it("creates a bracelet with required fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.create({
      name: "Rainbow Chevron",
      colors: ["#FF0000", "#00FF00", "#0000FF"],
    });

    expect(result).toBeDefined();
    expect(result?.name).toBe("Rainbow Chevron");
    expect(result?.colors).toEqual(["#FF0000", "#00FF00", "#0000FF"]);
    expect(result?.userId).toBe(1);
  });

  it("creates a bracelet with all optional fields including status and leftover", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.create({
      name: "Complex Pattern",
      status: "in_progress",
      patternName: "Chevron",
      patternNumber: "12345",
      patternUrl: "https://braceletbook.com/pattern/12345",
      colors: ["#FF0000"],
      materials: "DMC embroidery floss",
      dateMade: "2026-03-20",
      timeTakenMinutes: 120,
      difficulty: "medium",
      notes: "First attempt at chevron",
      rating: 4,
      outcome: "good",
      finalLengthCm: 15.5,
      stringLengthCm: 80,
      numberOfStrings: 8,
      leftoverStringCm: 12.5,
    });

    expect(result).toBeDefined();
    expect(result?.patternName).toBe("Chevron");
    expect(result?.difficulty).toBe("medium");
    expect(result?.rating).toBe(4);
    expect(result?.status).toBe("in_progress");
    expect(result?.leftoverStringCm).toBe(12.5);
  });

  it("creates a bracelet with status 'want_to_make' by default", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.create({
      name: "Wishlist Bracelet",
    });

    expect(result).toBeDefined();
    expect(result?.status).toBe("want_to_make");
  });

  it("rejects bracelet with invalid status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bracelet.create({ name: "Test", status: "invalid_status" as any })
    ).rejects.toThrow();
  });

  it("lists bracelets with status filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.list({ status: "in_progress" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects bracelet with empty name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.bracelet.create({ name: "" })).rejects.toThrow();
  });

  it("rejects bracelet with invalid rating", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bracelet.create({ name: "Test", rating: 6 })
    ).rejects.toThrow();
  });

  it("rejects bracelet with invalid difficulty", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bracelet.create({ name: "Test", difficulty: "impossible" as any })
    ).rejects.toThrow();
  });

  it("lists bracelets for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("lists bracelets with search filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.list({
      search: "chevron",
      sortBy: "name",
      sortOrder: "asc",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets bracelet stats", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.bracelet.stats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalCount).toBe("number");
    expect(Array.isArray(stats.topColors)).toBe(true);
    expect(typeof stats.avgTimeMinutes).toBe("number");
    expect(typeof stats.difficultyDistribution).toBe("object");
    expect(typeof stats.outcomeDistribution).toBe("object");
  });

  it("deletes a bracelet", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("uploads a photo for a bracelet", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.uploadPhoto({
      braceletId: 1,
      base64: "dGVzdA==", // "test" in base64
      mimeType: "image/jpeg",
      fileName: "test.jpg",
    });

    expect(result).toBeDefined();
    expect(result.url).toBe("https://cdn.example.com/test-photo.jpg");
    expect(result.key).toMatch(/^bracelet-photos\/1\/1-.*-test\.jpg$/);
  });
});

describe("thread router", () => {
  it("creates a thread with required fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.thread.create({
      colorName: "Crimson Red",
      colorHex: "#DC143C",
    });

    expect(result).toBeDefined();
    expect(result?.colorName).toBe("Crimson Red");
    expect(result?.colorHex).toBe("#DC143C");
  });

  it("creates a thread with all fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.thread.create({
      colorName: "DMC 321",
      colorHex: "#CC0000",
      brand: "DMC",
      colorCode: "321",
      quantity: 3,
      notes: "Great for red patterns",
    });

    expect(result).toBeDefined();
    expect(result?.brand).toBe("DMC");
    expect(result?.quantity).toBe(3);
  });

  it("creates a glitter thread", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.thread.create({
      colorName: "Gold Glitter",
      colorHex: "#FFD700",
      brand: "DMC",
      threadType: "glitter",
    });

    expect(result).toBeDefined();
    expect(result?.threadType).toBe("glitter");
  });

  it("creates a multicolor thread with secondary colors", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.thread.create({
      colorName: "Rainbow Variegated",
      colorHex: "#FF0000",
      brand: "DMC",
      threadType: "multicolor",
      secondaryColors: ["#00FF00", "#0000FF", "#FFFF00"],
    });

    expect(result).toBeDefined();
    expect(result?.threadType).toBe("multicolor");
    expect(result?.secondaryColors).toEqual(["#00FF00", "#0000FF", "#FFFF00"]);
  });

  it("rejects thread with invalid thread type", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.thread.create({
        colorName: "Bad Type",
        colorHex: "#FF0000",
        threadType: "sparkle" as any,
      })
    ).rejects.toThrow();
  });

  it("rejects secondary colors with invalid hex", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.thread.create({
        colorName: "Bad Secondary",
        colorHex: "#FF0000",
        threadType: "multicolor",
        secondaryColors: ["not-hex"],
      })
    ).rejects.toThrow();
  });

  it("rejects thread with invalid hex color", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.thread.create({
        colorName: "Bad Color",
        colorHex: "not-a-hex",
      })
    ).rejects.toThrow();
  });

  it("rejects thread with empty color name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.thread.create({
        colorName: "",
        colorHex: "#FF0000",
      })
    ).rejects.toThrow();
  });

  it("lists threads for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.thread.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("lists threads with search", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.thread.list({ search: "DMC" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("deletes a thread", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.thread.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("per-string measurements", () => {
  it("creates a bracelet with per-string measurements", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.create({
      name: "Measured Bracelet",
      status: "completed",
      patternNumber: "207002",
      perStringMeasurements: [
        { position: 0, colorLetter: "a", colorHex: "#FF0000", cutLengthCm: 75.5, leftoverCm: 12.3 },
        { position: 1, colorLetter: "b", colorHex: "#00FF00", cutLengthCm: 80.0, leftoverCm: 8.5 },
        { position: 2, colorLetter: "a", colorHex: "#FF0000", cutLengthCm: 75.5, leftoverCm: 15.0 },
        { position: 3, colorLetter: "b", colorHex: "#00FF00", cutLengthCm: 80.0, leftoverCm: 10.2 },
      ],
    });

    expect(result).toBeDefined();
    expect(result?.perStringMeasurements).toHaveLength(4);
    expect(result?.perStringMeasurements?.[0]).toMatchObject({
      position: 0,
      colorLetter: "a",
      cutLengthCm: 75.5,
      leftoverCm: 12.3,
    });
  });

  it("creates a bracelet with partial per-string measurements (some null)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.create({
      name: "Partial Measurements",
      perStringMeasurements: [
        { position: 0, cutLengthCm: 70, leftoverCm: null },
        { position: 1, cutLengthCm: null, leftoverCm: 5 },
      ],
    });

    expect(result).toBeDefined();
    expect(result?.perStringMeasurements).toHaveLength(2);
  });

  it("creates a bracelet without per-string measurements", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bracelet.create({
      name: "No Per-String",
      stringLengthCm: 80,
      leftoverStringCm: 10,
    });

    expect(result).toBeDefined();
    expect(result?.perStringMeasurements).toBeNull();
  });

  it("rejects per-string measurements with negative cut length", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bracelet.create({
        name: "Bad Measurement",
        perStringMeasurements: [
          { position: 0, cutLengthCm: -5, leftoverCm: null },
        ],
      })
    ).rejects.toThrow();
  });

  it("rejects per-string measurements with negative position", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bracelet.create({
        name: "Bad Position",
        perStringMeasurements: [
          { position: -1, cutLengthCm: 70, leftoverCm: null },
        ],
      })
    ).rejects.toThrow();
  });
});

describe("colorCombo router", () => {
  it("suggests color combinations for a valid pattern with threads", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First add some threads so the library isn't empty
    await caller.thread.create({ colorName: "Sky Blue", colorHex: "#87CEEB", quantity: 2 });
    await caller.thread.create({ colorName: "Sea Green", colorHex: "#2E8B57", quantity: 3 });
    await caller.thread.create({ colorName: "Deep Navy", colorHex: "#000080", quantity: 1 });

    const result = await caller.colorCombo.suggest({ patternId: "207002" });

    expect(result.error).toBeNull();
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].name).toBe("Ocean Breeze");
    expect(result.suggestions[0].assignments).toHaveLength(3);
    expect(result.suggestions[0].assignments[0].colorLetter).toBe("a");
    expect(result.pattern).toBeDefined();
    expect(result.pattern?.strings).toBe(8);
  });

  it("returns error for non-existent pattern", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.colorCombo.suggest({ patternId: "999999" });

    expect(result.error).toBe("Pattern not found on BraceletBook");
    expect(result.suggestions).toHaveLength(0);
  });

  it("rejects empty pattern ID", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.colorCombo.suggest({ patternId: "" })
    ).rejects.toThrow();
  });
});

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("User 1");
    expect(result?.email).toBe("user1@example.com");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});
