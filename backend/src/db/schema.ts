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
import type { Block } from "../types/blocks.js"
import type { CursorPosition } from "../types/collaboration.js"

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
  (table) => [uniqueIndex("user_email_idx").on(table.email)]
)

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  (table) => [index("account_userId_idx").on(table.userId)]
)

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  (table) => [index("verification_identifier_idx").on(table.identifier)]
)

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    color: varchar("color", { length: 7 }),
    image: text("image"),
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
    folderId: uuid("folder_id").notNull().references(() => folders.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").default(""),
    blocks: jsonb("blocks").$type<Block[]>().default([]).notNull(),
    ydocState: text("ydoc_state"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    version: integer("version").default(1).notNull(),
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

export const folderCollaborators = pgTable(
  "folder_collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    folderId: uuid("folder_id").notNull().references(() => folders.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("editor"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("folder_collaborators_folder_user_idx").on(table.folderId, table.userId)]
)

export const pageCollaborators = pgTable(
  "page_collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("editor"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("page_collaborators_page_user_idx").on(table.pageId, table.userId)]
)

export const collaborationSessions = pgTable(
  "collaboration_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    socketId: varchar("socket_id", { length: 255 }),
    cursorPosition: jsonb("cursor_position").$type<CursorPosition>(),
    cursorColor: varchar("cursor_color", { length: 7 }),
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
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("online").notNull(),
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
    metadata: jsonb("metadata").$type<{ cursorX?: number; cursorY?: number; selection?: unknown }>(),
  },
  (table) => [
    uniqueIndex("presence_user_page_idx").on(table.userId, table.pageId),
    index("presence_page_id_idx").on(table.pageId),
  ]
)

export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 20 }).notNull().default("view"),
    password: text("password"),
    expiresAt: timestamp("expires_at"),
    viewCount: integer("view_count").default(0).notNull(),
    lastAccessedAt: timestamp("last_accessed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("share_links_token_idx").on(table.token),
    index("share_links_page_id_idx").on(table.pageId),
  ]
)

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    tier: varchar("tier", { length: 20 }).notNull().default("free"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    billingInterval: varchar("billing_interval", { length: 10 }).default("month"),
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
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    month: varchar("month", { length: 7 }).notNull(),
    requestCount: integer("request_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("ai_usage_user_month_idx").on(table.userId, table.month)]
)

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

export const fileFolders = pgTable(
  "file_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    parentId: uuid("parent_id"),
    color: varchar("color", { length: 7 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("file_folders_user_id_idx").on(table.userId),
    index("file_folders_parent_id_idx").on(table.parentId),
  ]
)

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    size: integer("size").notNull(),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    type: varchar("type", { length: 20 }).notNull().default("file"),
    folderId: uuid("folder_id").references(() => fileFolders.id, { onDelete: "set null" }),
    isStarred: boolean("is_starred").default(false).notNull(),
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

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#6366f1"),
    parentId: uuid("parent_id"),
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
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
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
    folderId: uuid("folder_id").notNull().references(() => folders.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("folder_tags_folder_tag_idx").on(table.folderId, table.tagId),
    index("folder_tags_tag_id_idx").on(table.tagId),
  ]
)

export const userApiKeys = pgTable(
  "user_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    baseUrl: text("base_url"),
    modelOverride: varchar("model_override", { length: 100 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_api_keys_user_id_idx").on(table.userId),
    index("user_api_keys_provider_idx").on(table.userId, table.provider),
  ]
)

export const flashcardDecks = pgTable(
  "flashcard_decks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    sourcePageId: uuid("source_page_id").references(() => pages.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("flashcard_decks_user_id_idx").on(table.userId),
    index("flashcard_decks_page_id_idx").on(table.sourcePageId),
  ]
)

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deckId: uuid("deck_id").notNull().references(() => flashcardDecks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    type: varchar("type", { length: 20 }).notNull().default("basic"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("flashcards_deck_id_idx").on(table.deckId),
    index("flashcards_user_id_idx").on(table.userId),
  ]
)

export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    count: integer("count").default(0).notNull(),
    windowStart: timestamp("window_start").defaultNow().notNull(),
  },
  (table) => [
    index("rate_limits_identifier_endpoint_idx").on(table.identifier, table.endpoint),
    index("rate_limits_window_start_idx").on(table.windowStart),
  ]
)

export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  folders: many(folders),
  pages: many(pages),
  collaborations: many(pageCollaborators),
  folderCollaborations: many(folderCollaborators),
  subscription: one(subscriptions),
  todos: many(todos),
  files: many(files),
  tags: many(tags),
  userApiKeys: many(userApiKeys),
  flashcardDecks: many(flashcardDecks),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const foldersRelations = relations(folders, ({ one, many }) => ({
  owner: one(users, { fields: [folders.ownerId], references: [users.id] }),
  parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: "folderHierarchy" }),
  children: many(folders, { relationName: "folderHierarchy" }),
  pages: many(pages),
}))

export const pagesRelations = relations(pages, ({ one, many }) => ({
  folder: one(folders, { fields: [pages.folderId], references: [folders.id] }),
  owner: one(users, { fields: [pages.ownerId], references: [users.id] }),
  collaborators: many(pageCollaborators),
}))

export const flashcardDecksRelations = relations(flashcardDecks, ({ one, many }) => ({
  user: one(users, { fields: [flashcardDecks.userId], references: [users.id] }),
  sourcePage: one(pages, { fields: [flashcardDecks.sourcePageId], references: [pages.id] }),
  flashcards: many(flashcards),
}))

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  deck: one(flashcardDecks, { fields: [flashcards.deckId], references: [flashcardDecks.id] }),
  user: one(users, { fields: [flashcards.userId], references: [users.id] }),
}))
