import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
]);

export const videoStatusEnum = pgEnum("video_status", [
  "draft",
  "published",
  "archived",
]);

export const commentStatusEnum = pgEnum("comment_status", [
  "pending",
  "approved",
  "rejected",
]);

export const newsletterStatusEnum = pgEnum("newsletter_status", [
  "subscribed",
  "unsubscribed",
]);

export const editorialRoleEnum = pgEnum("editorial_role", [
  "super_admin",
  "editor",
  "journalist",
]);

export const editorialUserStatusEnum = pgEnum("editorial_user_status", [
  "active",
  "invited",
  "disabled",
]);

export const categoriesTable = pgTable("editorial_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authorsTable = pgTable("editorial_authors", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const articlesTable = pgTable(
  "editorial_articles",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull().default(""),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categoriesTable.id),
    authorId: integer("author_id")
      .notNull()
      .references(() => authorsTable.id),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt").notNull().default(""),
    imageCredit: text("image_credit"),
    gallery: jsonb("gallery")
      .$type<{ url: string; alt: string; credit?: string | null }[]>()
      .notNull()
      .default([]),
    videoEmbed: text("video_embed"),
    status: articleStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("editorial_articles_status_published_idx").on(
      table.status,
      table.publishedAt,
    ),
    index("editorial_articles_category_idx").on(table.categoryId),
    index("editorial_articles_author_idx").on(table.authorId),
    index("editorial_articles_featured_idx").on(table.featured),
  ],
);

export const articleViewsTable = pgTable(
  "editorial_article_views",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articlesTable.id, { onDelete: "cascade" }),
    sessionHash: text("session_hash").notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("editorial_article_views_unique_session_idx").on(
      table.articleId,
      table.sessionHash,
    ),
    index("editorial_article_views_article_idx").on(table.articleId),
  ],
);

export const videosTable = pgTable(
  "editorial_videos",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("News"),
    sourceUrl: text("source_url").notNull(),
    sourceType: text("source_type").notNull().default("youtube"),
    thumbnailUrl: text("thumbnail_url"),
    duration: text("duration"),
    status: videoStatusEnum("status").notNull().default("draft"),
    isDemo: boolean("is_demo").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("editorial_videos_status_published_idx").on(
      table.status,
      table.publishedAt,
    ),
  ],
);

export const breakingNewsTable = pgTable(
  "editorial_breaking_news",
  {
    id: serial("id").primaryKey(),
    headline: text("headline").notNull(),
    articleId: integer("article_id").references(() => articlesTable.id, {
      onDelete: "set null",
    }),
    active: boolean("active").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("editorial_breaking_news_active_idx").on(
      table.active,
      table.startsAt,
      table.endsAt,
    ),
  ],
);

export const liveSettingsTable = pgTable("editorial_live_settings", {
  id: serial("id").primaryKey(),
  isLive: boolean("is_live").notNull().default(false),
  streamUrl: text("stream_url"),
  streamType: text("stream_type"),
  programTitle: text("program_title"),
  programDescription: text("program_description"),
  schedule: jsonb("schedule")
    .$type<
      {
        title: string;
        description: string;
        startsAt: string;
        endsAt: string;
        isDemo: boolean;
      }[]
    >()
    .notNull()
    .default([]),
  alternativeLinks: jsonb("alternative_links")
    .$type<string[]>()
    .notNull()
    .default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const newsletterSubscribersTable = pgTable(
  "editorial_newsletter_subscribers",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    status: newsletterStatusEnum("status").notNull().default("subscribed"),
    consentedAt: timestamp("consented_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("editorial_newsletter_status_idx").on(table.status),
  ],
);

export const articleCommentsTable = pgTable(
  "editorial_article_comments",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articlesTable.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    body: text("body").notNull(),
    status: commentStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("editorial_article_comments_article_status_idx").on(
      table.articleId,
      table.status,
    ),
  ],
);

export const contentPagesTable = pgTable("editorial_pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull().default(""),
  status: articleStatusEnum("status").notNull().default("draft"),
  isDemo: boolean("is_demo").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const siteSettingsTable = pgTable("editorial_site_settings", {
  id: serial("id").primaryKey(),
  organizationName: text("organization_name").notNull(),
  tagline: text("tagline").notNull(),
  brandPromise: text("brand_promise").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  socialLinks: jsonb("social_links")
    .$type<{ label: string; url: string }[]>()
    .notNull()
    .default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Phase 2 identity mapping: Clerk remains the authentication provider; the
// application database owns editorial roles and content audit history.
export const editorialUsersTable = pgTable(
  "editorial_users",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: editorialRoleEnum("role").notNull().default("journalist"),
    status: editorialUserStatusEnum("status").notNull().default("invited"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("editorial_users_role_status_idx").on(table.role, table.status),
  ],
);

export const contentAuditEventsTable = pgTable(
  "editorial_content_audit_events",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id").references(() => editorialUsersTable.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("editorial_audit_entity_idx").on(table.entityType, table.entityId)],
);

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({
  id: true,
  createdAt: true,
});
export const insertAuthorSchema = createInsertSchema(authorsTable).omit({
  id: true,
  createdAt: true,
});
export const insertArticleSchema = createInsertSchema(articlesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertAuthor = z.infer<typeof insertAuthorSchema>;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type EditorialArticle = typeof articlesTable.$inferSelect;
export type EditorialCategory = typeof categoriesTable.$inferSelect;
export type EditorialAuthor = typeof authorsTable.$inferSelect;
