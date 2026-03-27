import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  float,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Bracelets table - main entity for tracking bracelet projects
 */
export const bracelets = mysqlTable("bracelets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Status of the bracelet project */
  status: mysqlEnum("status", [
    "want_to_make",
    "in_progress",
    "completed",
    "frogged",
    "gifted",
  ]).default("want_to_make").notNull(),
  patternName: varchar("patternName", { length: 255 }),
  patternNumber: varchar("patternNumber", { length: 100 }),
  patternUrl: text("patternUrl"),
  /** Array of thread library IDs used for this bracelet */
  colors: json("colors").$type<string[]>().default([]),
  materials: varchar("materials", { length: 500 }),
  dateMade: timestamp("dateMade"),
  timeTakenMinutes: int("timeTakenMinutes"),
  difficulty: mysqlEnum("difficulty", ["beginner", "easy", "medium", "hard", "expert"]),
  notes: text("notes"),
  rating: int("rating"),
  outcome: mysqlEnum("outcome", ["perfect", "good", "okay", "needs_improvement", "failed"]),
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 500 }),
  /** Final bracelet length in cm (actual measured) */
  finalLengthCm: float("finalLengthCm"),
  /** How long each string was cut in cm (actual measured) - legacy uniform value */
  stringLengthCm: float("stringLengthCm"),
  /** Number of strings used */
  numberOfStrings: int("numberOfStrings"),
  /** How much leftover string remained in cm - legacy uniform value */
  leftoverStringCm: float("leftoverStringCm"),
  /** Per-string measurements: array of {position, colorLetter, cutLengthCm, leftoverCm} */
  perStringMeasurements: json("perStringMeasurements").$type<Array<{
    position: number;
    colorLetter?: string;
    colorHex?: string;
    cutLengthCm: number | null;
    leftoverCm: number | null;
  }>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bracelet = typeof bracelets.$inferSelect;
export type InsertBracelet = typeof bracelets.$inferInsert;

/**
 * Thread library - stores user's thread collection
 */
export const threadLibrary = mysqlTable("thread_library", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  colorName: varchar("colorName", { length: 100 }).notNull(),
  colorHex: varchar("colorHex", { length: 7 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  colorCode: varchar("colorCode", { length: 50 }),
  quantity: int("quantity").default(1),
  /** Thread type: regular, glitter, metallic, glow_in_dark, multicolor */
  threadType: mysqlEnum("threadType", [
    "regular",
    "glitter",
    "metallic",
    "glow_in_dark",
    "multicolor",
  ]).default("regular").notNull(),
  /** For multicolor threads: array of hex colors in the thread */
  secondaryColors: json("secondaryColors").$type<string[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Thread = typeof threadLibrary.$inferSelect;
export type InsertThread = typeof threadLibrary.$inferInsert;
