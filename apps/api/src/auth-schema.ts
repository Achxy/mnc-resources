import { sql } from "drizzle-orm";
import { customType, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Custom column type that stores dates as ISO-8601 text in SQLite.
 *
 * better-auth passes JavaScript Date objects for createdAt/updatedAt/expiresAt
 * fields. Drizzle's built-in text() column has no mapToDriverValue, so the raw
 * Date object reaches D1's bind(), which only accepts null | number | string |
 * boolean | ArrayBuffer. This custom type converts Date -> ISO string on write
 * and string -> Date on read, keeping the column as TEXT in SQLite.
 */
const dateText = customType<{ data: Date | string; driverData: string }>({
	dataType() {
		return "text";
	},
	toDriver(value: Date | string): string {
		if (value instanceof Date) return value.toISOString();
		return value;
	},
	fromDriver(value: string): Date {
		return new Date(value);
	},
});

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("emailVerified", { mode: "boolean" }).default(false).notNull(),
	image: text("image"),
	createdAt: dateText("createdAt").default(sql`(datetime('now'))`).notNull(),
	updatedAt: dateText("updatedAt").default(sql`(datetime('now'))`).notNull(),
	role: text("role").default("user"),
	banned: integer("banned", { mode: "boolean" }).default(false),
	banReason: text("banReason"),
	banExpires: dateText("banExpires"),
	username: text("username").unique(),
	displayUsername: text("displayUsername"),
});

export const session = sqliteTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: dateText("expiresAt").notNull(),
		token: text("token").notNull().unique(),
		createdAt: dateText("createdAt").default(sql`(datetime('now'))`).notNull(),
		updatedAt: dateText("updatedAt").default(sql`(datetime('now'))`).notNull(),
		ipAddress: text("ipAddress"),
		userAgent: text("userAgent"),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		impersonatedBy: text("impersonatedBy"),
	},
	(table) => [index("idx_session_userId").on(table.userId)],
);

export const account = sqliteTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("accountId").notNull(),
		providerId: text("providerId").notNull(),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("accessToken"),
		refreshToken: text("refreshToken"),
		idToken: text("idToken"),
		accessTokenExpiresAt: dateText("accessTokenExpiresAt"),
		refreshTokenExpiresAt: dateText("refreshTokenExpiresAt"),
		scope: text("scope"),
		password: text("password"),
		createdAt: dateText("createdAt").default(sql`(datetime('now'))`).notNull(),
		updatedAt: dateText("updatedAt").default(sql`(datetime('now'))`).notNull(),
	},
	(table) => [index("idx_account_userId").on(table.userId)],
);

export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: dateText("expiresAt").notNull(),
	createdAt: dateText("createdAt").default(sql`(datetime('now'))`).notNull(),
	updatedAt: dateText("updatedAt").default(sql`(datetime('now'))`).notNull(),
});
