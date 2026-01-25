-- Files & Storage
CREATE TABLE IF NOT EXISTS "file_folders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "parent_id" uuid,
  "color" varchar(7),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "page_id" uuid REFERENCES "pages"("id") ON DELETE SET NULL,
  "name" varchar(255) NOT NULL,
  "original_name" varchar(255) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "size" integer NOT NULL,
  "storage_key" varchar(500) NOT NULL,
  "url" text NOT NULL,
  "thumbnail_url" text,
  "type" varchar(20) NOT NULL DEFAULT 'file',
  "folder_id" uuid REFERENCES "file_folders"("id") ON DELETE SET NULL,
  "is_starred" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "accessed_at" timestamp DEFAULT now() NOT NULL
);

-- Tags
CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" varchar(50) NOT NULL,
  "color" varchar(7) NOT NULL DEFAULT '#6366f1',
  "parent_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "page_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "page_id" uuid NOT NULL REFERENCES "pages"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "folder_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "folder_id" uuid NOT NULL REFERENCES "folders"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for file_folders
CREATE INDEX IF NOT EXISTS "file_folders_user_id_idx" ON "file_folders" ("user_id");
CREATE INDEX IF NOT EXISTS "file_folders_parent_id_idx" ON "file_folders" ("parent_id");

-- Indexes for files
CREATE INDEX IF NOT EXISTS "files_user_id_idx" ON "files" ("user_id");
CREATE INDEX IF NOT EXISTS "files_page_id_idx" ON "files" ("page_id");
CREATE INDEX IF NOT EXISTS "files_type_idx" ON "files" ("user_id", "type");
CREATE INDEX IF NOT EXISTS "files_starred_idx" ON "files" ("user_id", "is_starred");
CREATE INDEX IF NOT EXISTS "files_created_at_idx" ON "files" ("user_id", "created_at");

-- Indexes for tags
CREATE INDEX IF NOT EXISTS "tags_user_id_idx" ON "tags" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tags_user_name_idx" ON "tags" ("user_id", "name");
CREATE INDEX IF NOT EXISTS "tags_parent_id_idx" ON "tags" ("parent_id");

-- Indexes for page_tags
CREATE UNIQUE INDEX IF NOT EXISTS "page_tags_page_tag_idx" ON "page_tags" ("page_id", "tag_id");
CREATE INDEX IF NOT EXISTS "page_tags_tag_id_idx" ON "page_tags" ("tag_id");

-- Indexes for folder_tags
CREATE UNIQUE INDEX IF NOT EXISTS "folder_tags_folder_tag_idx" ON "folder_tags" ("folder_id", "tag_id");
CREATE INDEX IF NOT EXISTS "folder_tags_tag_id_idx" ON "folder_tags" ("tag_id");

-- Full-text search on pages
CREATE INDEX IF NOT EXISTS "pages_fts_idx" ON "pages" USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(content, '')));
