import { and, asc, count, desc, eq, gt, ilike, isNull, lt, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetArticleParams,
  GetArticleResponse,
  GetAuthorParams,
  GetAuthorResponse,
  GetLiveResponse,
  GetPageParams,
  GetPageResponse,
  GetSiteSettingsResponse,
  GetVideoParams,
  GetVideoResponse,
  ListArticlesQueryParams,
  ListArticlesResponse,
  ListAuthorsResponse,
  ListBreakingNewsResponse,
  ListCategoriesResponse,
  ListVideosQueryParams,
  ListVideosResponse,
  SearchContentQueryParams,
  SearchContentResponse,
} from "@workspace/api-zod";
import {
  articleViewsTable,
  articlesTable,
  authorsTable,
  breakingNewsTable,
  categoriesTable,
  contentPagesTable,
  db,
  liveSettingsTable,
  siteSettingsTable,
  videosTable,
} from "@workspace/db";

const router: IRouter = Router();

function visibleArticleFilter(now = new Date()): SQL {
  return or(
    eq(articlesTable.status, "published"),
    and(
      eq(articlesTable.status, "scheduled"),
      lte(articlesTable.publishedAt, now),
    ),
  )!;
}

function visiblePageFilter(now = new Date()): SQL {
  return or(
    eq(contentPagesTable.status, "published"),
    and(
      eq(contentPagesTable.status, "scheduled"),
      lte(contentPagesTable.updatedAt, now),
    ),
  )!;
}

function articleReadingMinutes(body: string): number {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).filter(Boolean).length / 220));
}

function safeSearchPattern(value: string): string {
  return `%${value.trim().replace(/[\\%_]/g, "\\$&")}%`;
}

const articleViewCount = sql<number>`(
  SELECT COUNT(*)::int
  FROM ${articleViewsTable}
  WHERE ${articleViewsTable.articleId} = ${articlesTable.id}
)`;

type JoinedArticleRow = {
  article: typeof articlesTable.$inferSelect;
  category: typeof categoriesTable.$inferSelect;
  author: typeof authorsTable.$inferSelect;
  viewCount: number;
};

function toArticleSummary({
  article,
  category,
  author,
  viewCount,
}: JoinedArticleRow) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    excerpt: article.excerpt,
    categorySlug: category.slug,
    categoryName: category.name,
    tags: article.tags,
    authorSlug: author.slug,
    authorName: author.name,
    authorRole: author.role,
    imageUrl: article.imageUrl,
    imageAlt: article.imageAlt,
    publishedAt: article.publishedAt,
    readingMinutes: articleReadingMinutes(article.body),
    viewCount: Number(viewCount ?? 0),
    featured: article.featured,
    isDemo: article.isDemo,
  };
}

function joinedArticleRows() {
  return db
    .select({
      article: articlesTable,
      category: categoriesTable,
      author: authorsTable,
      viewCount: articleViewCount,
    })
    .from(articlesTable)
    .innerJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .innerJoin(authorsTable, eq(articlesTable.authorId, authorsTable.id));
}

async function nearbyArticles(
  condition: SQL,
  order: "newest" | "oldest" = "newest",
  limit = 3,
): Promise<JoinedArticleRow[]> {
  return joinedArticleRows()
    .where(and(visibleArticleFilter(), condition))
    .orderBy(
      order === "newest"
        ? desc(articlesTable.publishedAt)
        : asc(articlesTable.publishedAt),
    )
    .limit(limit);
}

function articleSearchFilter(query: string): SQL {
  const pattern = safeSearchPattern(query);
  return or(
    ilike(articlesTable.title, pattern),
    ilike(articlesTable.subtitle, pattern),
    ilike(articlesTable.excerpt, pattern),
    ilike(articlesTable.body, pattern),
    ilike(categoriesTable.name, pattern),
    ilike(authorsTable.name, pattern),
  )!;
}

router.get("/articles", async (req, res): Promise<void> => {
  const parsed = ListArticlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, category, author, tag, featured, sort, page, pageSize } =
    parsed.data;
  const filters: SQL[] = [visibleArticleFilter()];
  if (category) filters.push(eq(categoriesTable.slug, category));
  if (author) filters.push(eq(authorsTable.slug, author));
  if (tag) {
    filters.push(sql`${articlesTable.tags} @> ${JSON.stringify([tag])}::jsonb`);
  }
  if (q) filters.push(articleSearchFilter(q));
  if (featured !== undefined) filters.push(eq(articlesTable.featured, featured));
  const condition = and(...filters)!;

  const [totalRow] = await db
    .select({ total: count() })
    .from(articlesTable)
    .innerJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .innerJoin(authorsTable, eq(articlesTable.authorId, authorsTable.id))
    .where(condition);

  const orderBy =
    sort === "popular"
      ? [desc(articleViewCount), desc(articlesTable.publishedAt)]
      : [desc(articlesTable.publishedAt), desc(articlesTable.id)];

  const rows = await db
    .select({
      article: articlesTable,
      category: categoriesTable,
      author: authorsTable,
      viewCount: articleViewCount,
    })
    .from(articlesTable)
    .innerJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .innerJoin(authorsTable, eq(articlesTable.authorId, authorsTable.id))
    .where(condition)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const items = rows.map(toArticleSummary);

  res.json(
    ListArticlesResponse.parse({
      items,
      total: Number(totalRow?.total ?? 0),
      page,
      pageSize,
    }),
  );
});

router.get("/articles/:slug", async (req, res): Promise<void> => {
  const params = GetArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      article: articlesTable,
      category: categoriesTable,
      author: authorsTable,
      viewCount: articleViewCount,
    })
    .from(articlesTable)
    .innerJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .innerJoin(authorsTable, eq(articlesTable.authorId, authorsTable.id))
    .where(
      and(
        eq(articlesTable.slug, params.data.slug),
        visibleArticleFilter(),
      ),
    )
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const { article, category, author, viewCount } = row;
  const sameCategory = await nearbyArticles(
    and(
      eq(articlesTable.categoryId, category.id),
      ne(articlesTable.id, article.id),
    )!,
  );
  const relatedRows =
    sameCategory.length > 0
      ? sameCategory
      : await nearbyArticles(ne(articlesTable.id, article.id));
  const [previousRows, nextRows] = article.publishedAt
    ? await Promise.all([
        nearbyArticles(
          lt(articlesTable.publishedAt, article.publishedAt),
          "newest",
          1,
        ),
        nearbyArticles(
          gt(articlesTable.publishedAt, article.publishedAt),
          "oldest",
          1,
        ),
      ])
    : [[], []];
  res.json(
    GetArticleResponse.parse({
      id: article.id,
      slug: article.slug,
      title: article.title,
      subtitle: article.subtitle,
      excerpt: article.excerpt,
      body: article.body,
      categorySlug: category.slug,
      categoryName: category.name,
      tags: article.tags,
      authorSlug: author.slug,
      authorName: author.name,
      authorRole: author.role,
      authorBio: author.bio,
      imageUrl: article.imageUrl,
      imageAlt: article.imageAlt,
      imageCredit: article.imageCredit,
      gallery: article.gallery,
      videoEmbed: article.videoEmbed,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      readingMinutes: articleReadingMinutes(article.body),
      viewCount: Number(viewCount ?? 0),
      featured: article.featured,
      isDemo: article.isDemo,
      relatedArticles: relatedRows.map(toArticleSummary),
      previousArticle: previousRows[0] ? toArticleSummary(previousRows[0]) : null,
      nextArticle: nextRows[0] ? toArticleSummary(nextRows[0]) : null,
    }),
  );
});

router.get("/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: categoriesTable.id,
      slug: categoriesTable.slug,
      name: categoriesTable.name,
      description: categoriesTable.description,
      articleCount: count(articlesTable.id),
    })
    .from(categoriesTable)
    .leftJoin(
      articlesTable,
      and(
        eq(articlesTable.categoryId, categoriesTable.id),
        visibleArticleFilter(),
      ),
    )
    .groupBy(categoriesTable.id)
    .orderBy(categoriesTable.sortOrder, categoriesTable.name);

  res.json(
    ListCategoriesResponse.parse(
      rows.map((row) => ({ ...row, articleCount: Number(row.articleCount) })),
    ),
  );
});

router.get("/authors", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: authorsTable.id,
      slug: authorsTable.slug,
      name: authorsTable.name,
      role: authorsTable.role,
      bio: authorsTable.bio,
      imageUrl: authorsTable.imageUrl,
      isDemo: authorsTable.isDemo,
      articleCount: count(articlesTable.id),
    })
    .from(authorsTable)
    .leftJoin(
      articlesTable,
      and(
        eq(articlesTable.authorId, authorsTable.id),
        visibleArticleFilter(),
      ),
    )
    .groupBy(authorsTable.id)
    .orderBy(authorsTable.name);

  res.json(
    ListAuthorsResponse.parse(
      rows.map((row) => ({ ...row, articleCount: Number(row.articleCount) })),
    ),
  );
});

router.get("/authors/:slug", async (req, res): Promise<void> => {
  const params = GetAuthorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: authorsTable.id,
      slug: authorsTable.slug,
      name: authorsTable.name,
      role: authorsTable.role,
      bio: authorsTable.bio,
      imageUrl: authorsTable.imageUrl,
      isDemo: authorsTable.isDemo,
      articleCount: count(articlesTable.id),
    })
    .from(authorsTable)
    .leftJoin(
      articlesTable,
      and(
        eq(articlesTable.authorId, authorsTable.id),
        visibleArticleFilter(),
      ),
    )
    .where(eq(authorsTable.slug, params.data.slug))
    .groupBy(authorsTable.id)
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Author not found" });
    return;
  }

  res.json(
    GetAuthorResponse.parse({
      ...row,
      articleCount: Number(row.articleCount),
    }),
  );
});

router.get("/videos", async (req, res): Promise<void> => {
  const parsed = ListVideosQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, category, page, pageSize } = parsed.data;
  const filters: SQL[] = [eq(videosTable.status, "published")];
  if (category) filters.push(eq(videosTable.category, category));
  if (q) {
    const pattern = safeSearchPattern(q);
    filters.push(
      or(ilike(videosTable.title, pattern), ilike(videosTable.description, pattern))!,
    );
  }
  const condition = and(...filters)!;
  const [totalRow] = await db
    .select({ total: count() })
    .from(videosTable)
    .where(condition);
  const items = await db
    .select({
      id: videosTable.id,
      slug: videosTable.slug,
      title: videosTable.title,
      description: videosTable.description,
      category: videosTable.category,
      sourceUrl: videosTable.sourceUrl,
      sourceType: videosTable.sourceType,
      thumbnailUrl: videosTable.thumbnailUrl,
      duration: videosTable.duration,
      publishedAt: videosTable.publishedAt,
      isDemo: videosTable.isDemo,
    })
    .from(videosTable)
    .where(condition)
    .orderBy(desc(videosTable.publishedAt), desc(videosTable.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.json(
    ListVideosResponse.parse({
      items,
      total: Number(totalRow?.total ?? 0),
      page,
      pageSize,
    }),
  );
});

router.get("/videos/:slug", async (req, res): Promise<void> => {
  const params = GetVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [video] = await db
    .select()
    .from(videosTable)
    .where(
      and(
        eq(videosTable.slug, params.data.slug),
        eq(videosTable.status, "published"),
      ),
    )
    .limit(1);

  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  res.json(
    GetVideoResponse.parse({
      id: video.id,
      slug: video.slug,
      title: video.title,
      description: video.description,
      category: video.category,
      sourceUrl: video.sourceUrl,
      sourceType: video.sourceType,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      publishedAt: video.publishedAt,
      isDemo: video.isDemo,
    }),
  );
});

router.get("/live", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(liveSettingsTable).limit(1);
  res.json(
    GetLiveResponse.parse({
      isLive: settings?.isLive === true && Boolean(settings.streamUrl),
      streamUrl: settings?.streamUrl ?? null,
      streamType: settings?.streamType ?? null,
      programTitle: settings?.programTitle ?? null,
      programDescription: settings?.programDescription ?? null,
      schedule: settings?.schedule ?? [],
      alternativeLinks: settings?.alternativeLinks ?? [],
    }),
  );
});

router.get("/breaking-news", async (_req, res): Promise<void> => {
  const now = new Date();
  const rows = await db
    .select({
      id: breakingNewsTable.id,
      headline: breakingNewsTable.headline,
      articleSlug: articlesTable.slug,
      startsAt: breakingNewsTable.startsAt,
      endsAt: breakingNewsTable.endsAt,
      isDemo: breakingNewsTable.isDemo,
    })
    .from(breakingNewsTable)
    .leftJoin(articlesTable, eq(breakingNewsTable.articleId, articlesTable.id))
    .where(
      and(
        eq(breakingNewsTable.active, true),
        lte(breakingNewsTable.startsAt, now),
        or(isNull(breakingNewsTable.endsAt), gt(breakingNewsTable.endsAt, now)),
        or(isNull(breakingNewsTable.articleId), visibleArticleFilter(now)),
      ),
    )
    .orderBy(desc(breakingNewsTable.startsAt));

  res.json(ListBreakingNewsResponse.parse(rows));
});

router.get("/pages/:slug", async (req, res): Promise<void> => {
  const params = GetPageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [page] = await db
    .select()
    .from(contentPagesTable)
    .where(
      and(
        eq(contentPagesTable.slug, params.data.slug),
        visiblePageFilter(),
      ),
    )
    .limit(1);
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.json(
    GetPageResponse.parse({
      slug: page.slug,
      title: page.title,
      summary: page.summary,
      body: page.body,
      updatedAt: page.updatedAt,
    }),
  );
});

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchContentQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const query = parsed.data.q.trim();
  const pattern = safeSearchPattern(query);
  const articleFilters: SQL[] = [
    visibleArticleFilter(),
    or(
      ilike(articlesTable.title, pattern),
      ilike(articlesTable.subtitle, pattern),
      ilike(articlesTable.excerpt, pattern),
      ilike(articlesTable.body, pattern),
      ilike(categoriesTable.name, pattern),
      ilike(authorsTable.name, pattern),
    )!,
  ];
  const articles = await db
    .select({
      article: articlesTable,
      category: categoriesTable,
      author: authorsTable,
      viewCount: articleViewCount,
    })
    .from(articlesTable)
    .innerJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .innerJoin(authorsTable, eq(articlesTable.authorId, authorsTable.id))
    .where(and(...articleFilters))
    .orderBy(desc(articlesTable.publishedAt))
    .limit(30);

  const videos = await db
    .select({
      id: videosTable.id,
      slug: videosTable.slug,
      title: videosTable.title,
      description: videosTable.description,
      category: videosTable.category,
      sourceUrl: videosTable.sourceUrl,
      sourceType: videosTable.sourceType,
      thumbnailUrl: videosTable.thumbnailUrl,
      duration: videosTable.duration,
      publishedAt: videosTable.publishedAt,
      isDemo: videosTable.isDemo,
    })
    .from(videosTable)
    .where(
      and(
        eq(videosTable.status, "published"),
        or(
          ilike(videosTable.title, pattern),
          ilike(videosTable.description, pattern),
        ),
      ),
    )
    .orderBy(desc(videosTable.publishedAt))
    .limit(30);

  const articleItems = articles.map(
    ({ article, category, author, viewCount }) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      subtitle: article.subtitle,
      excerpt: article.excerpt,
      categorySlug: category.slug,
      categoryName: category.name,
      tags: article.tags,
      authorSlug: author.slug,
      authorName: author.name,
      imageUrl: article.imageUrl,
      imageAlt: article.imageAlt,
      publishedAt: article.publishedAt,
      readingMinutes: articleReadingMinutes(article.body),
      viewCount: Number(viewCount ?? 0),
      featured: article.featured,
      isDemo: article.isDemo,
    }),
  );

  res.json(
    SearchContentResponse.parse({
      articles: articleItems,
      videos,
      total: articleItems.length + videos.length,
      query,
    }),
  );
});

router.get("/site-settings", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  res.json(
    GetSiteSettingsResponse.parse({
      organizationName: settings?.organizationName ?? "Focus on Bong TV Network",
      tagline:
        settings?.tagline ??
        "The Heartbeat of Bong County, Connecting the World.",
      brandPromise:
        settings?.brandPromise ?? "Inform. Educate. Entertain. Connect.",
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,
      socialLinks: settings?.socialLinks ?? [],
    }),
  );
});

router.get("/sitemap.xml", async (req, res): Promise<void> => {
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "";
  const protocol = req.get("x-forwarded-proto") ?? req.protocol;
  const baseUrl = `${protocol}://${host}`;
  const [articles, categories, authors, videos] = await Promise.all([
    db
      .select({ slug: articlesTable.slug, updatedAt: articlesTable.updatedAt })
      .from(articlesTable)
      .where(visibleArticleFilter())
      .orderBy(desc(articlesTable.publishedAt))
      .limit(10000),
    db.select({ slug: categoriesTable.slug }).from(categoriesTable),
    db.select({ slug: authorsTable.slug }).from(authorsTable),
    db
      .select({ slug: videosTable.slug, updatedAt: videosTable.updatedAt })
      .from(videosTable)
      .where(eq(videosTable.status, "published"))
      .orderBy(desc(videosTable.publishedAt))
      .limit(10000),
  ]);
  const fixedRoutes = [
    "",
    "latest-news",
    "videos",
    "live",
    "about",
    "privacy-policy",
    "terms",
    "editorial-policy",
  ];
  const urls = [
    ...fixedRoutes.map((path) => ({
      loc: path ? `${baseUrl}/${path}` : `${baseUrl}/`,
      lastmod: null as Date | null,
    })),
    ...categories.map((category) => ({
      loc: `${baseUrl}/category/${encodeURIComponent(category.slug)}`,
      lastmod: null,
    })),
    ...authors.map((author) => ({
      loc: `${baseUrl}/author/${encodeURIComponent(author.slug)}`,
      lastmod: null,
    })),
    ...articles.map((article) => ({
      loc: `${baseUrl}/article/${encodeURIComponent(article.slug)}`,
      lastmod: article.updatedAt,
    })),
    ...videos.map((video) => ({
      loc: `${baseUrl}/videos/${encodeURIComponent(video.slug)}`,
      lastmod: video.updatedAt,
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map(
      ({ loc, lastmod }) =>
        `<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ""}</url>`,
    )
    .join("")}</urlset>`;
  res.type("application/xml").send(xml);
});

router.get("/feed.xml", async (req, res): Promise<void> => {
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "";
  const protocol = req.get("x-forwarded-proto") ?? req.protocol;
  const baseUrl = `${protocol}://${host}`;
  const rows = await db
    .select({
      article: articlesTable,
      category: categoriesTable,
      author: authorsTable,
    })
    .from(articlesTable)
    .innerJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .innerJoin(authorsTable, eq(articlesTable.authorId, authorsTable.id))
    .where(visibleArticleFilter())
    .orderBy(desc(articlesTable.publishedAt))
    .limit(30);
  const items = rows
    .map(
      ({ article, category, author }) =>
        `<item><title>${escapeXml(article.title)}</title><link>${escapeXml(`${baseUrl}/article/${article.slug}`)}</link><guid>${escapeXml(`${baseUrl}/article/${article.slug}`)}</guid><description>${escapeXml(article.excerpt)}</description><category>${escapeXml(category.name)}</category><author>${escapeXml(author.name)}</author>${article.publishedAt ? `<pubDate>${article.publishedAt.toUTCString()}</pubDate>` : ""}</item>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Focus on Bong TV Network</title><link>${escapeXml(baseUrl)}</link><description>${escapeXml("The Heartbeat of Bong County, Connecting the World.")}</description><language>en</language>${items}</channel></rss>`;
  res.type("application/rss+xml").send(xml);
});

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default router;
