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
// SUBSCRIPTIONS
// ============================================================================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: varchar("tier", { length: 20 }).notNull().default("free"), // 'free' | 'pro' | 'team'
    status: varchar("status", { length: 20 }).notNull().default("active"), // 'active' | 'canceled' | 'past_due' | 'trialing'
    billingInterval: varchar("billing_interval", { length: 10 }).default("month"), // 'month' | 'year'
    currentPeriodStart: timestamp("current_period_start").defaultNow().notNull(),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_stripe_customer_idx").on(table.stripeCustomerId),
  ]
)

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: varchar("month", { length: 7 }).notNull(), // Format: YYYY-MM
    requestCount: integer("request_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ai_usage_user_month_idx").on(table.userId, table.month),
  ]
)

// ============================================================================
// TODOS
// ============================================================================

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: varchar("text", { length: 500 }).notNull(),
    completed: boolean("completed").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("todos_user_id_idx").on(table.userId),
    index("todos_user_sort_idx").on(table.userId, table.sortOrder),
  ]
)

// ============================================================================
// FILES & STORAGE
// ============================================================================

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }), // Optional link to page

    // File info
    name: varchar("name", { length: 255 }).notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    size: integer("size").notNull(), // bytes

    // Storage
    storageKey: varchar("storage_key", { length: 500 }).notNull(), // S3/R2 key or local path
    url: text("url").notNull(), // Public URL
    thumbnailUrl: text("thumbnail_url"), // For images/videos

    // Metadata
    type: varchar("type", { length: 20 }).notNull().default("file"), // 'image' | 'pdf' | 'video' | 'audio' | 'document' | 'file'
    folderId: uuid("folder_id").references(() => fileFolders.id, { onDelete: "set null" }),
    isStarred: boolean("is_starred").default(false).notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    accessedAt: timestamp("accessed_at").defaultNow().notNull(),
  },
  (table) => [
    index("files_user_id_idx").on(table.userId),
    index("files_page_id_idx").on(table.pageId),
    index("files_type_idx").on(table.userId, table.type),
    index("files_starred_idx").on(table.userId, table.isStarred),
    index("files_created_at_idx").on(table.userId, table.createdAt),
  ]
)

export const fileFolders = pgTable(
  "file_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    parentId: uuid("parent_id"),
    color: varchar("color", { length: 7 }), // Hex color
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("file_folders_user_id_idx").on(table.userId),
    index("file_folders_parent_id_idx").on(table.parentId),
  ]
)

// ============================================================================
// TAGS
// ============================================================================

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#6366f1"), // Hex color
    parentId: uuid("parent_id"), // For hierarchical tags
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tags_user_id_idx").on(table.userId),
    uniqueIndex("tags_user_name_idx").on(table.userId, table.name),
    index("tags_parent_id_idx").on(table.parentId),
  ]
)

export const pageTags = pgTable(
  "page_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("page_tags_page_tag_idx").on(table.pageId, table.tagId),
    index("page_tags_tag_id_idx").on(table.tagId),
  ]
)

export const folderTags = pgTable(
  "folder_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("folder_tags_folder_tag_idx").on(table.folderId, table.tagId),
    index("folder_tags_tag_id_idx").on(table.tagId),
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

export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  folders: many(folders),
  pages: many(pages),
  collaborations: many(pageCollaborators),
  folderCollaborations: many(folderCollaborators),
  collaborationSessions: many(collaborationSessions),
  presence: many(presence),
  subscription: one(subscriptions),
  aiUsage: many(aiUsage),
  todos: many(todos),
  files: many(files),
  fileFolders: many(fileFolders),
  tags: many(tags),
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

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}))

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
  user: one(users, {
    fields: [aiUsage.userId],
    references: [users.id],
  }),
}))

export const todosRelations = relations(todos, ({ one }) => ({
  user: one(users, {
    fields: [todos.userId],
    references: [users.id],
  }),
}))

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  page: one(pages, {
    fields: [files.pageId],
    references: [pages.id],
  }),
  folder: one(fileFolders, {
    fields: [files.folderId],
    references: [fileFolders.id],
  }),
}))

export const fileFoldersRelations = relations(fileFolders, ({ one, many }) => ({
  user: one(users, {
    fields: [fileFolders.userId],
    references: [users.id],
  }),
  parent: one(fileFolders, {
    fields: [fileFolders.parentId],
    references: [fileFolders.id],
    relationName: "fileFolderHierarchy",
  }),
  children: many(fileFolders, { relationName: "fileFolderHierarchy" }),
  files: many(files),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  parent: one(tags, {
    fields: [tags.parentId],
    references: [tags.id],
    relationName: "tagHierarchy",
  }),
  children: many(tags, { relationName: "tagHierarchy" }),
  pageTags: many(pageTags),
  folderTags: many(folderTags),
}))

export const pageTagsRelations = relations(pageTags, ({ one }) => ({
  page: one(pages, {
    fields: [pageTags.pageId],
    references: [pages.id],
  }),
  tag: one(tags, {
    fields: [pageTags.tagId],
    references: [tags.id],
  }),
}))

export const folderTagsRelations = relations(folderTags, ({ one }) => ({
  folder: one(folders, {
    fields: [folderTags.folderId],
    references: [folders.id],
  }),
  tag: one(tags, {
    fields: [folderTags.tagId],
    references: [tags.id],
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

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert

export type AiUsage = typeof aiUsage.$inferSelect
export type NewAiUsage = typeof aiUsage.$inferInsert

export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert

export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert

export type FileFolder = typeof fileFolders.$inferSelect
export type NewFileFolder = typeof fileFolders.$inferInsert

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert

export type PageTag = typeof pageTags.$inferSelect
export type NewPageTag = typeof pageTags.$inferInsert

export type FolderTag = typeof folderTags.$inferSelect
export type NewFolderTag = typeof folderTags.$inferInsert
