"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flashcardsRelations = exports.flashcardDecksRelations = exports.pagesRelations = exports.foldersRelations = exports.accountsRelations = exports.usersRelations = exports.rateLimits = exports.flashcards = exports.flashcardDecks = exports.userApiKeys = exports.folderTags = exports.pageTags = exports.tags = exports.files = exports.fileFolders = exports.todos = exports.aiUsage = exports.subscriptions = exports.shareLinks = exports.presence = exports.collaborationSessions = exports.pageCollaborators = exports.folderCollaborators = exports.pages = exports.folders = exports.verifications = exports.sessions = exports.accounts = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.users = (0, pg_core_1.pgTable)("user", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    name: (0, pg_core_1.text)("name"),
    image: (0, pg_core_1.text)("image"),
    emailVerified: (0, pg_core_1.boolean)("emailVerified").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull(),
}, (table) => [(0, pg_core_1.uniqueIndex)("user_email_idx").on(table.email)]);
exports.accounts = (0, pg_core_1.pgTable)("account", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("userId").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    accountId: (0, pg_core_1.text)("accountId").notNull(),
    providerId: (0, pg_core_1.text)("providerId").notNull(),
    accessToken: (0, pg_core_1.text)("accessToken"),
    refreshToken: (0, pg_core_1.text)("refreshToken"),
    accessTokenExpiresAt: (0, pg_core_1.timestamp)("accessTokenExpiresAt"),
    refreshTokenExpiresAt: (0, pg_core_1.timestamp)("refreshTokenExpiresAt"),
    scope: (0, pg_core_1.text)("scope"),
    idToken: (0, pg_core_1.text)("idToken"),
    password: (0, pg_core_1.text)("password"),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull(),
}, (table) => [(0, pg_core_1.index)("account_userId_idx").on(table.userId)]);
exports.sessions = (0, pg_core_1.pgTable)("session", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("userId").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    token: (0, pg_core_1.text)("token").notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)("expiresAt").notNull(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull(),
    ipAddress: (0, pg_core_1.text)("ipAddress"),
    userAgent: (0, pg_core_1.text)("userAgent"),
}, (table) => [
    (0, pg_core_1.index)("session_userId_idx").on(table.userId),
    (0, pg_core_1.uniqueIndex)("session_token_idx").on(table.token),
]);
exports.verifications = (0, pg_core_1.pgTable)("verification", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    identifier: (0, pg_core_1.text)("identifier").notNull(),
    value: (0, pg_core_1.text)("value").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expiresAt").notNull(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull(),
}, (table) => [(0, pg_core_1.index)("verification_identifier_idx").on(table.identifier)]);
exports.folders = (0, pg_core_1.pgTable)("folders", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    ownerId: (0, pg_core_1.text)("owner_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    parentId: (0, pg_core_1.uuid)("parent_id"),
    color: (0, pg_core_1.varchar)("color", { length: 7 }),
    image: (0, pg_core_1.text)("image"),
    isExpanded: (0, pg_core_1.boolean)("is_expanded").default(true).notNull(),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("folders_owner_id_idx").on(table.ownerId),
    (0, pg_core_1.index)("folders_parent_id_idx").on(table.parentId),
    (0, pg_core_1.index)("folders_sort_order_idx").on(table.ownerId, table.sortOrder),
]);
exports.pages = (0, pg_core_1.pgTable)("pages", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    folderId: (0, pg_core_1.uuid)("folder_id").notNull().references(() => exports.folders.id, { onDelete: "cascade" }),
    ownerId: (0, pg_core_1.text)("owner_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    content: (0, pg_core_1.text)("content").default(""),
    blocks: (0, pg_core_1.jsonb)("blocks").$type().default([]).notNull(),
    ydocState: (0, pg_core_1.text)("ydoc_state"),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0).notNull(),
    isPublic: (0, pg_core_1.boolean)("is_public").default(false).notNull(),
    version: (0, pg_core_1.integer)("version").default(1).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    lastSavedAt: (0, pg_core_1.timestamp)("last_saved_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("pages_folder_id_idx").on(table.folderId),
    (0, pg_core_1.index)("pages_owner_id_idx").on(table.ownerId),
    (0, pg_core_1.index)("pages_updated_at_idx").on(table.updatedAt),
    (0, pg_core_1.index)("pages_sort_order_idx").on(table.folderId, table.sortOrder),
]);
exports.folderCollaborators = (0, pg_core_1.pgTable)("folder_collaborators", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    folderId: (0, pg_core_1.uuid)("folder_id").notNull().references(() => exports.folders.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    role: (0, pg_core_1.varchar)("role", { length: 20 }).notNull().default("editor"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [(0, pg_core_1.uniqueIndex)("folder_collaborators_folder_user_idx").on(table.folderId, table.userId)]);
exports.pageCollaborators = (0, pg_core_1.pgTable)("page_collaborators", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    pageId: (0, pg_core_1.uuid)("page_id").notNull().references(() => exports.pages.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    role: (0, pg_core_1.varchar)("role", { length: 20 }).notNull().default("editor"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [(0, pg_core_1.uniqueIndex)("page_collaborators_page_user_idx").on(table.pageId, table.userId)]);
exports.collaborationSessions = (0, pg_core_1.pgTable)("collaboration_sessions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    pageId: (0, pg_core_1.uuid)("page_id").notNull().references(() => exports.pages.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    socketId: (0, pg_core_1.varchar)("socket_id", { length: 255 }),
    cursorPosition: (0, pg_core_1.jsonb)("cursor_position").$type(),
    cursorColor: (0, pg_core_1.varchar)("cursor_color", { length: 7 }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    lastActivity: (0, pg_core_1.timestamp)("last_activity").defaultNow().notNull(),
    joinedAt: (0, pg_core_1.timestamp)("joined_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("collab_sessions_page_id_idx").on(table.pageId),
    (0, pg_core_1.index)("collab_sessions_user_id_idx").on(table.userId),
    (0, pg_core_1.index)("collab_sessions_active_idx").on(table.pageId, table.isActive),
]);
exports.presence = (0, pg_core_1.pgTable)("presence", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    pageId: (0, pg_core_1.uuid)("page_id").references(() => exports.pages.id, { onDelete: "cascade" }),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).default("online").notNull(),
    lastSeen: (0, pg_core_1.timestamp)("last_seen").defaultNow().notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata").$type(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("presence_user_page_idx").on(table.userId, table.pageId),
    (0, pg_core_1.index)("presence_page_id_idx").on(table.pageId),
]);
exports.shareLinks = (0, pg_core_1.pgTable)("share_links", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    pageId: (0, pg_core_1.uuid)("page_id").notNull().references(() => exports.pages.id, { onDelete: "cascade" }),
    token: (0, pg_core_1.varchar)("token", { length: 64 }).notNull().unique(),
    createdBy: (0, pg_core_1.text)("created_by").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    permission: (0, pg_core_1.varchar)("permission", { length: 20 }).notNull().default("view"),
    password: (0, pg_core_1.text)("password"),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    viewCount: (0, pg_core_1.integer)("view_count").default(0).notNull(),
    lastAccessedAt: (0, pg_core_1.timestamp)("last_accessed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("share_links_token_idx").on(table.token),
    (0, pg_core_1.index)("share_links_page_id_idx").on(table.pageId),
]);
exports.subscriptions = (0, pg_core_1.pgTable)("subscriptions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull().unique().references(() => exports.users.id, { onDelete: "cascade" }),
    tier: (0, pg_core_1.varchar)("tier", { length: 20 }).notNull().default("free"),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("active"),
    billingInterval: (0, pg_core_1.varchar)("billing_interval", { length: 10 }).default("month"),
    currentPeriodStart: (0, pg_core_1.timestamp)("current_period_start").defaultNow().notNull(),
    currentPeriodEnd: (0, pg_core_1.timestamp)("current_period_end"),
    cancelAtPeriodEnd: (0, pg_core_1.boolean)("cancel_at_period_end").default(false).notNull(),
    stripeCustomerId: (0, pg_core_1.varchar)("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: (0, pg_core_1.varchar)("stripe_subscription_id", { length: 255 }),
    stripePriceId: (0, pg_core_1.varchar)("stripe_price_id", { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("subscriptions_user_id_idx").on(table.userId),
    (0, pg_core_1.index)("subscriptions_stripe_customer_idx").on(table.stripeCustomerId),
]);
exports.aiUsage = (0, pg_core_1.pgTable)("ai_usage", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    month: (0, pg_core_1.varchar)("month", { length: 7 }).notNull(),
    requestCount: (0, pg_core_1.integer)("request_count").default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [(0, pg_core_1.uniqueIndex)("ai_usage_user_month_idx").on(table.userId, table.month)]);
exports.todos = (0, pg_core_1.pgTable)("todos", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    text: (0, pg_core_1.varchar)("text", { length: 500 }).notNull(),
    completed: (0, pg_core_1.boolean)("completed").default(false).notNull(),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("todos_user_id_idx").on(table.userId),
    (0, pg_core_1.index)("todos_user_sort_idx").on(table.userId, table.sortOrder),
]);
exports.fileFolders = (0, pg_core_1.pgTable)("file_folders", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    parentId: (0, pg_core_1.uuid)("parent_id"),
    color: (0, pg_core_1.varchar)("color", { length: 7 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("file_folders_user_id_idx").on(table.userId),
    (0, pg_core_1.index)("file_folders_parent_id_idx").on(table.parentId),
]);
exports.files = (0, pg_core_1.pgTable)("files", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    pageId: (0, pg_core_1.uuid)("page_id").references(() => exports.pages.id, { onDelete: "set null" }),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    originalName: (0, pg_core_1.varchar)("original_name", { length: 255 }).notNull(),
    mimeType: (0, pg_core_1.varchar)("mime_type", { length: 100 }).notNull(),
    size: (0, pg_core_1.integer)("size").notNull(),
    storageKey: (0, pg_core_1.varchar)("storage_key", { length: 500 }).notNull(),
    url: (0, pg_core_1.text)("url").notNull(),
    thumbnailUrl: (0, pg_core_1.text)("thumbnail_url"),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull().default("file"),
    folderId: (0, pg_core_1.uuid)("folder_id").references(() => exports.fileFolders.id, { onDelete: "set null" }),
    isStarred: (0, pg_core_1.boolean)("is_starred").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    accessedAt: (0, pg_core_1.timestamp)("accessed_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("files_user_id_idx").on(table.userId),
    (0, pg_core_1.index)("files_page_id_idx").on(table.pageId),
    (0, pg_core_1.index)("files_type_idx").on(table.userId, table.type),
    (0, pg_core_1.index)("files_starred_idx").on(table.userId, table.isStarred),
    (0, pg_core_1.index)("files_created_at_idx").on(table.userId, table.createdAt),
]);
exports.tags = (0, pg_core_1.pgTable)("tags", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.varchar)("name", { length: 50 }).notNull(),
    color: (0, pg_core_1.varchar)("color", { length: 7 }).notNull().default("#6366f1"),
    parentId: (0, pg_core_1.uuid)("parent_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("tags_user_id_idx").on(table.userId),
    (0, pg_core_1.uniqueIndex)("tags_user_name_idx").on(table.userId, table.name),
    (0, pg_core_1.index)("tags_parent_id_idx").on(table.parentId),
]);
exports.pageTags = (0, pg_core_1.pgTable)("page_tags", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    pageId: (0, pg_core_1.uuid)("page_id").notNull().references(() => exports.pages.id, { onDelete: "cascade" }),
    tagId: (0, pg_core_1.uuid)("tag_id").notNull().references(() => exports.tags.id, { onDelete: "cascade" }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("page_tags_page_tag_idx").on(table.pageId, table.tagId),
    (0, pg_core_1.index)("page_tags_tag_id_idx").on(table.tagId),
]);
exports.folderTags = (0, pg_core_1.pgTable)("folder_tags", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    folderId: (0, pg_core_1.uuid)("folder_id").notNull().references(() => exports.folders.id, { onDelete: "cascade" }),
    tagId: (0, pg_core_1.uuid)("tag_id").notNull().references(() => exports.tags.id, { onDelete: "cascade" }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("folder_tags_folder_tag_idx").on(table.folderId, table.tagId),
    (0, pg_core_1.index)("folder_tags_tag_id_idx").on(table.tagId),
]);
exports.userApiKeys = (0, pg_core_1.pgTable)("user_api_keys", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    provider: (0, pg_core_1.varchar)("provider", { length: 50 }).notNull(),
    label: (0, pg_core_1.varchar)("label", { length: 100 }).notNull(),
    encryptedKey: (0, pg_core_1.text)("encrypted_key").notNull(),
    baseUrl: (0, pg_core_1.text)("base_url"),
    modelOverride: (0, pg_core_1.varchar)("model_override", { length: 100 }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("user_api_keys_user_id_idx").on(table.userId),
    (0, pg_core_1.index)("user_api_keys_provider_idx").on(table.userId, table.provider),
]);
exports.flashcardDecks = (0, pg_core_1.pgTable)("flashcard_decks", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    sourcePageId: (0, pg_core_1.uuid)("source_page_id").references(() => exports.pages.id, { onDelete: "set null" }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("flashcard_decks_user_id_idx").on(table.userId),
    (0, pg_core_1.index)("flashcard_decks_page_id_idx").on(table.sourcePageId),
]);
exports.flashcards = (0, pg_core_1.pgTable)("flashcards", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    deckId: (0, pg_core_1.uuid)("deck_id").notNull().references(() => exports.flashcardDecks.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.text)("user_id").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    front: (0, pg_core_1.text)("front").notNull(),
    back: (0, pg_core_1.text)("back").notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull().default("basic"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("flashcards_deck_id_idx").on(table.deckId),
    (0, pg_core_1.index)("flashcards_user_id_idx").on(table.userId),
]);
exports.rateLimits = (0, pg_core_1.pgTable)("rate_limits", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    identifier: (0, pg_core_1.varchar)("identifier", { length: 255 }).notNull(),
    endpoint: (0, pg_core_1.varchar)("endpoint", { length: 255 }).notNull(),
    count: (0, pg_core_1.integer)("count").default(0).notNull(),
    windowStart: (0, pg_core_1.timestamp)("window_start").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("rate_limits_identifier_endpoint_idx").on(table.identifier, table.endpoint),
    (0, pg_core_1.index)("rate_limits_window_start_idx").on(table.windowStart),
]);
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    accounts: many(exports.accounts),
    sessions: many(exports.sessions),
    folders: many(exports.folders),
    pages: many(exports.pages),
    collaborations: many(exports.pageCollaborators),
    folderCollaborations: many(exports.folderCollaborators),
    subscription: one(exports.subscriptions),
    todos: many(exports.todos),
    files: many(exports.files),
    tags: many(exports.tags),
    userApiKeys: many(exports.userApiKeys),
    flashcardDecks: many(exports.flashcardDecks),
}));
exports.accountsRelations = (0, drizzle_orm_1.relations)(exports.accounts, ({ one }) => ({
    user: one(exports.users, { fields: [exports.accounts.userId], references: [exports.users.id] }),
}));
exports.foldersRelations = (0, drizzle_orm_1.relations)(exports.folders, ({ one, many }) => ({
    owner: one(exports.users, { fields: [exports.folders.ownerId], references: [exports.users.id] }),
    parent: one(exports.folders, { fields: [exports.folders.parentId], references: [exports.folders.id], relationName: "folderHierarchy" }),
    children: many(exports.folders, { relationName: "folderHierarchy" }),
    pages: many(exports.pages),
}));
exports.pagesRelations = (0, drizzle_orm_1.relations)(exports.pages, ({ one, many }) => ({
    folder: one(exports.folders, { fields: [exports.pages.folderId], references: [exports.folders.id] }),
    owner: one(exports.users, { fields: [exports.pages.ownerId], references: [exports.users.id] }),
    collaborators: many(exports.pageCollaborators),
}));
exports.flashcardDecksRelations = (0, drizzle_orm_1.relations)(exports.flashcardDecks, ({ one, many }) => ({
    user: one(exports.users, { fields: [exports.flashcardDecks.userId], references: [exports.users.id] }),
    sourcePage: one(exports.pages, { fields: [exports.flashcardDecks.sourcePageId], references: [exports.pages.id] }),
    flashcards: many(exports.flashcards),
}));
exports.flashcardsRelations = (0, drizzle_orm_1.relations)(exports.flashcards, ({ one }) => ({
    deck: one(exports.flashcardDecks, { fields: [exports.flashcards.deckId], references: [exports.flashcardDecks.id] }),
    user: one(exports.users, { fields: [exports.flashcards.userId], references: [exports.users.id] }),
}));
//# sourceMappingURL=schema.js.map