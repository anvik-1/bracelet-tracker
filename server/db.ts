import { eq, and, like, sql, gte, lte, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  bracelets,
  InsertBracelet,
  threadLibrary,
  InsertThread,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ───────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Bracelet helpers ───────────────────────────────────────────

export async function createBracelet(data: InsertBracelet) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bracelets).values(data);
  const id = result[0].insertId;
  return getBraceletById(id, data.userId);
}

export async function getBraceletById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(bracelets)
    .where(and(eq(bracelets.id, id), eq(bracelets.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function listBracelets(
  userId: number,
  filters?: {
    search?: string;
    difficulty?: string;
    rating?: number;
    outcome?: string;
    status?: string;
    color?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(bracelets.userId, userId)];

  if (filters?.search) {
    conditions.push(
      sql`(${bracelets.name} LIKE ${`%${filters.search}%`} OR ${bracelets.patternName} LIKE ${`%${filters.search}%`} OR ${bracelets.patternNumber} LIKE ${`%${filters.search}%`})`
    );
  }
  if (filters?.difficulty) {
    conditions.push(eq(bracelets.difficulty, filters.difficulty as any));
  }
  if (filters?.rating) {
    conditions.push(eq(bracelets.rating, filters.rating));
  }
  if (filters?.outcome) {
    conditions.push(eq(bracelets.outcome, filters.outcome as any));
  }
  if (filters?.status) {
    conditions.push(eq(bracelets.status, filters.status as any));
  }
  if (filters?.color) {
    conditions.push(sql`JSON_CONTAINS(${bracelets.colors}, ${JSON.stringify(filters.color)})`);
  }
  if (filters?.dateFrom) {
    conditions.push(gte(bracelets.dateMade, filters.dateFrom));
  }
  if (filters?.dateTo) {
    conditions.push(lte(bracelets.dateMade, filters.dateTo));
  }

  const orderCol =
    filters?.sortBy === "name"
      ? bracelets.name
      : filters?.sortBy === "dateMade"
        ? bracelets.dateMade
        : filters?.sortBy === "rating"
          ? bracelets.rating
          : filters?.sortBy === "difficulty"
            ? bracelets.difficulty
            : filters?.sortBy === "status"
              ? bracelets.status
              : bracelets.createdAt;

  const orderFn = filters?.sortOrder === "asc" ? asc : desc;

  return db
    .select()
    .from(bracelets)
    .where(and(...conditions))
    .orderBy(orderFn(orderCol));
}

export async function updateBracelet(id: number, userId: number, data: Partial<InsertBracelet>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(bracelets)
    .set(data)
    .where(and(eq(bracelets.id, id), eq(bracelets.userId, userId)));
  return getBraceletById(id, userId);
}

export async function deleteBracelet(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bracelets).where(and(eq(bracelets.id, id), eq(bracelets.userId, userId)));
  return { success: true };
}

/**
 * Get historical string usage data for a specific pattern.
 * Used by the string calculator to learn from past bracelets.
 */
export async function getPatternHistory(userId: number, patternNumber: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select({
      finalLengthCm: bracelets.finalLengthCm,
      stringLengthCm: bracelets.stringLengthCm,
      leftoverStringCm: bracelets.leftoverStringCm,
      numberOfStrings: bracelets.numberOfStrings,
    })
    .from(bracelets)
    .where(
      and(
        eq(bracelets.userId, userId),
        eq(bracelets.patternNumber, patternNumber),
        sql`${bracelets.stringLengthCm} IS NOT NULL`,
        sql`${bracelets.finalLengthCm} IS NOT NULL`
      )
    );
  return result;
}

export async function getBraceletStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allBracelets = await db
    .select()
    .from(bracelets)
    .where(eq(bracelets.userId, userId));

  const totalCount = allBracelets.length;

  // Color frequency
  const colorCounts: Record<string, number> = {};
  for (const b of allBracelets) {
    const colors = (b.colors as string[]) || [];
    for (const c of colors) {
      colorCounts[c] = (colorCounts[c] || 0) + 1;
    }
  }
  const topColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([color, count]) => ({ color, count }));

  // Average time
  const timeBracelets = allBracelets.filter((b) => b.timeTakenMinutes != null);
  const avgTime =
    timeBracelets.length > 0
      ? Math.round(timeBracelets.reduce((s, b) => s + (b.timeTakenMinutes || 0), 0) / timeBracelets.length)
      : 0;

  // Difficulty distribution
  const difficultyDist: Record<string, number> = {};
  for (const b of allBracelets) {
    if (b.difficulty) {
      difficultyDist[b.difficulty] = (difficultyDist[b.difficulty] || 0) + 1;
    }
  }

  // Outcome distribution
  const outcomeDist: Record<string, number> = {};
  for (const b of allBracelets) {
    if (b.outcome) {
      outcomeDist[b.outcome] = (outcomeDist[b.outcome] || 0) + 1;
    }
  }

  // Rating distribution
  const ratingDist: Record<number, number> = {};
  for (const b of allBracelets) {
    if (b.rating != null) {
      ratingDist[b.rating] = (ratingDist[b.rating] || 0) + 1;
    }
  }

  // Status distribution
  const statusDist: Record<string, number> = {};
  for (const b of allBracelets) {
    statusDist[b.status] = (statusDist[b.status] || 0) + 1;
  }

  // Monthly trend
  const monthlyTrend: Record<string, number> = {};
  for (const b of allBracelets) {
    const date = b.dateMade || b.createdAt;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyTrend[key] = (monthlyTrend[key] || 0) + 1;
  }

  return {
    totalCount,
    topColors,
    avgTimeMinutes: avgTime,
    difficultyDistribution: difficultyDist,
    outcomeDistribution: outcomeDist,
    ratingDistribution: ratingDist,
    statusDistribution: statusDist,
    monthlyTrend,
  };
}

// ─── Thread Library helpers ─────────────────────────────────────

export async function createThread(data: InsertThread) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(threadLibrary).values(data);
  const id = result[0].insertId;
  return getThreadById(id, data.userId);
}

export async function getThreadById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(threadLibrary)
    .where(and(eq(threadLibrary.id, id), eq(threadLibrary.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function listThreads(userId: number, search?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(threadLibrary.userId, userId)];
  if (search) {
    conditions.push(
      sql`(${threadLibrary.colorName} LIKE ${`%${search}%`} OR ${threadLibrary.brand} LIKE ${`%${search}%`} OR ${threadLibrary.colorCode} LIKE ${`%${search}%`})`
    );
  }
  return db
    .select()
    .from(threadLibrary)
    .where(and(...conditions))
    .orderBy(asc(threadLibrary.colorName));
}

export async function updateThread(id: number, userId: number, data: Partial<InsertThread>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(threadLibrary)
    .set(data)
    .where(and(eq(threadLibrary.id, id), eq(threadLibrary.userId, userId)));
  return getThreadById(id, userId);
}

export async function deleteThread(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(threadLibrary)
    .where(and(eq(threadLibrary.id, id), eq(threadLibrary.userId, userId)));
  return { success: true };
}
