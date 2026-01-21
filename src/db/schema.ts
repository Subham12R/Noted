import {
  pgTable,
  text,
  timestamp,
  jsonb,
  varchar,
  integer,
  boolean,
  index,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import type { Block } from "@/types/blocks"
import type { CursorPosition } from "@/types/collaboration"

// ============================================================================
// USERS & AUTHENTICATION (better-auth compatible)
// ============================================================================

// better-auth expects specific table and column names
export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    image: text("image"),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_email_idx").on(table.email),
  ]
)

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    idToken: text("idToken"),
    password: text("password"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("account_userId_idx").on(table.userId),
  ]
)

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
  },
  (table) => [
    index("session_userId_idx").on(table.userId),
    uniqueIndex("session_token_idx").on(table.token),
  ]
)

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
  ]
)

// ============================================================================
// CONTENT: FOLDERS & PAGES
// ============================================================================

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    color: varchar("color", { length: 7 }), // Hex color like #FF6B6B
    image: text("image"), // Folder cover image
    isExpanded: boolean("is_expanded").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("folders_owner_id_idx").on(table.ownerId),
    index("folders_parent_id_idx").on(table.parentId),
    index("folders_sort_order_idx").on(table.ownerId, table.sortOrder),
  ]
)

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // HTML/Markdown content from the editor
    content: text("content").default(""),

    // CRITICAL: Block-based content for AI features
    blocks: jsonb("blocks").$type<Block[]>().default([]).notNull(),

    // Y.js document state for real-time collaboration (Base64 encoded)
    ydocState: text("ydoc_state"),

    // Metadata
    sortOrder: integer("sort_order").default(0).notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    version: integer("version").default(1).notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastSavedAt: timestamp("last_saved_at").defaultNow().notNull(),
  },
  (table) => [
    index("pages_folder_id_idx").on(table.folderId),
    index("pages_owner_id_idx").on(table.ownerId),
    index("pages_updated_at_idx").on(table.updatedAt),
    index("pages_sort_order_idx").on(table.folderId, table.sortOrder),
  ]
)

// ============================================================================
// COLLABORATION
// ============================================================================

export const folderCollaborators = pgTable(
  "folder_collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("editor"), // 'viewer' | 'editor' | 'admin'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("folder_collaborators_folder_user_idx").on(table.folderId, table.userId),
  ]
)

export const pageCollaborators = pgTable(
  "page_collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("editor"), // 'viewer' | 'editor' | 'admin'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("page_collaborators_page_user_idx").on(table.pageId, table.userId),
  ]
)

export const collaborationSessions = pgTable(
  "collaboration_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    socketId: varchar("socket_id", { length: 255 }),

    // Cursor position and selection
    cursorPosition: jsonb("cursor_position").$type<CursorPosition>(),
    cursorColor: varchar("cursor_color", { length: 7 }),

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    lastActivity: timestamp("last_activity").defaultNow().notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    index("collab_sessions_page_id_idx").on(table.pageId),
    index("collab_sessions_user_id_idx").on(table.userId),
    index("collab_sessions_active_idx").on(table.pageId, table.isActive),
  ]
)

export const presence = pgTable(
  "presence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("online").notNull(), // 'online' | 'away' | 'offline'
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
    metadata: jsonb("metadata").$type<{
      cursorX?: number
      cursorY?: number
      selection?: unknown
    }>(),
  },
  (table) => [
    uniqueIndex("presence_user_page_idx").on(table.userId, table.pageId),
    index("presence_page_id_idx").on(table.pageId),
  ]
)

// ============================================================================
// SHARE LINKS
// ============================================================================

export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Access control
    permission: varchar("permission", { length: 20 }).notNull().default("view"), // 'view' | 'edit'
    password: text("password"), // Optional password hash

    // Expiration
    expiresAt: timestamp("expires_at"),

    // Usage tracking
    viewCount: integer("view_count").default(0).notNull(),
    lastAccessedAt: timestamp("last_accessed_at"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("share_links_token_idx").on(table.token),
    index("share_links_page_id_idx").on(table.pageId),
  ]
)

// ============================================================================
// SECURITY: RATE LIMITING
// ============================================================================

export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: varchar("identifier", { length: 255 }).notNull(), // userId or IP
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    count: integer("count").default(0).notNull(),
    windowStart: timestamp("window_start").defaultNow().notNull(),
  },
  (table) => [
    index("rate_limits_identifier_endpoint_idx").on(table.identifier, table.endpoint),
    index("rate_limits_window_start_idx").on(table.windowStart),
  ]
)

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  folders: many(folders),
  pages: many(pages),
  collaborations: many(pageCollaborators),
  folderCollaborations: many(folderCollaborators),
  collaborationSessions: many(collaborationSessions),
  presence: many(presence),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const foldersRelations = relations(folders, ({ one, many }) => ({
  owner: one(users, {
    fields: [folders.ownerId],
    references: [users.id],
  }),
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
    relationName: "folderHierarchy",
  }),
  children: many(folders, { relationName: "folderHierarchy" }),
  pages: many(pages),
  collaborators: many(folderCollaborators),
}))

export const pagesRelations = relations(pages, ({ one, many }) => ({
  folder: one(folders, {
    fields: [pages.folderId],
    references: [folders.id],
  }),
  owner: one(users, {
    fields: [pages.ownerId],
    references: [users.id],
  }),
  collaborators: many(pageCollaborators),
  collaborationSessions: many(collaborationSessions),
}))

export const pageCollaboratorsRelations = relations(pageCollaborators, ({ one }) => ({
  page: one(pages, {
    fields: [pageCollaborators.pageId],
    references: [pages.id],
  }),
  user: one(users, {
    fields: [pageCollaborators.userId],
    references: [users.id],
  }),
}))

export const collaborationSessionsRelations = relations(collaborationSessions, ({ one }) => ({
  page: one(pages, {
    fields: [collaborationSessions.pageId],
    references: [pages.id],
  }),
  user: one(users, {
    fields: [collaborationSessions.userId],
    references: [users.id],
  }),
}))

export const presenceRelations = relations(presence, ({ one }) => ({
  user: one(users, {
    fields: [presence.userId],
    references: [users.id],
  }),
  page: one(pages, {
    fields: [presence.pageId],
    references: [pages.id],
  }),
}))

export const shareLinksRelations = relations(shareLinks, ({ one }) => ({
  page: one(pages, {
    fields: [shareLinks.pageId],
    references: [pages.id],
  }),
  creator: one(users, {
    fields: [shareLinks.createdBy],
    references: [users.id],
  }),
}))

export const folderCollaboratorsRelations = relations(folderCollaborators, ({ one }) => ({
  folder: one(folders, {
    fields: [folderCollaborators.folderId],
    references: [folders.id],
  }),
  user: one(users, {
    fields: [folderCollaborators.userId],
    references: [users.id],
  }),
}))

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type Folder = typeof folders.$inferSelect
export type NewFolder = typeof folders.$inferInsert

export type Page = typeof pages.$inferSelect
export type NewPage = typeof pages.$inferInsert

export type PageCollaborator = typeof pageCollaborators.$inferSelect
export type NewPageCollaborator = typeof pageCollaborators.$inferInsert

export type FolderCollaborator = typeof folderCollaborators.$inferSelect
export type NewFolderCollaborator = typeof folderCollaborators.$inferInsert

export type CollaborationSession = typeof collaborationSessions.$inferSelect
export type NewCollaborationSession = typeof collaborationSessions.$inferInsert

export type Presence = typeof presence.$inferSelect
export type NewPresence = typeof presence.$inferInsert

export type RateLimit = typeof rateLimits.$inferSelect
export type NewRateLimit = typeof rateLimits.$inferInsert

export type ShareLink = typeof shareLinks.$inferSelect
export type NewShareLink = typeof shareLinks.$inferInsert
