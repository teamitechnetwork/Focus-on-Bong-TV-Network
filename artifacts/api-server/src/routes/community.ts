import { createHash } from "node:crypto";
import { and, count, desc, eq, lte, or } from "drizzle-orm";
import { Router, type IRouter, type RequestHandler } from "express";
import {
  ListArticleCommentsResponse,
  RecordArticleViewBody,
  RecordArticleViewParams,
  RecordArticleViewResponse,
  SubmitArticleCommentBody,
  SubmitArticleCommentParams,
  SubmitArticleCommentResponse,
  SubscribeNewsletterBody,
  SubscribeNewsletterResponse,
  UnsubscribeNewsletterBody,
  UnsubscribeNewsletterResponse,
} from "@workspace/api-zod";
import {
  articleCommentsTable,
  articleViewsTable,
  articlesTable,
  db,
  newsletterSubscribersTable,
} from "@workspace/db";

const router: IRouter = Router();

function limitRequests(max: number, windowMs: number): RequestHandler {
  const buckets = new Map<string, number[]>();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    const recent = (buckets.get(key) ?? []).filter(
      (timestamp) => now - timestamp < windowMs,
    );

    if (recent.length >= max) {
      res.status(429).json({ error: "Please wait before trying again." });
      return;
    }

    recent.push(now);
    buckets.set(key, recent);
    if (buckets.size > 5000) {
      for (const [bucketKey, timestamps] of buckets) {
        if (!timestamps.some((timestamp) => now - timestamp < windowMs)) {
          buckets.delete(bucketKey);
        }
      }
    }
    next();
  };
}

const newsletterLimit = limitRequests(5, 60 * 60 * 1000);
const commentLimit = limitRequests(5, 60 * 60 * 1000);

function visibleArticleFilter(now = new Date()) {
  return or(
    eq(articlesTable.status, "published"),
    and(
      eq(articlesTable.status, "scheduled"),
      lte(articlesTable.publishedAt, now),
    ),
  );
}

router.post(
  "/articles/:slug/views",
  async (req, res): Promise<void> => {
    const params = RecordArticleViewParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = RecordArticleViewBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [article] = await db
      .select({ id: articlesTable.id })
      .from(articlesTable)
      .where(
        and(
          eq(articlesTable.slug, params.data.slug),
          visibleArticleFilter(),
        ),
      )
      .limit(1);
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    const sessionHash = createHash("sha256")
      .update(body.data.sessionKey)
      .digest("hex");
    const [inserted] = await db
      .insert(articleViewsTable)
      .values({ articleId: article.id, sessionHash })
      .onConflictDoNothing({
        target: [articleViewsTable.articleId, articleViewsTable.sessionHash],
      })
      .returning({ id: articleViewsTable.id });
    const [countRow] = await db
      .select({ viewCount: count() })
      .from(articleViewsTable)
      .where(eq(articleViewsTable.articleId, article.id));

    res.json(
      RecordArticleViewResponse.parse({
        viewCount: Number(countRow?.viewCount ?? 0),
        counted: Boolean(inserted),
      }),
    );
  },
);

router.get("/articles/:slug/comments", async (req, res): Promise<void> => {
  const params = SubmitArticleCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [article] = await db
    .select({ id: articlesTable.id })
    .from(articlesTable)
    .where(
      and(
        eq(articlesTable.slug, params.data.slug),
        visibleArticleFilter(),
      ),
    )
    .limit(1);
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const comments = await db
    .select({
      id: articleCommentsTable.id,
      displayName: articleCommentsTable.displayName,
      body: articleCommentsTable.body,
      createdAt: articleCommentsTable.createdAt,
    })
    .from(articleCommentsTable)
    .where(
      and(
        eq(articleCommentsTable.articleId, article.id),
        eq(articleCommentsTable.status, "approved"),
      ),
    )
    .orderBy(desc(articleCommentsTable.createdAt))
    .limit(100);

  res.json(ListArticleCommentsResponse.parse(comments));
});

router.post(
  "/articles/:slug/comments",
  commentLimit,
  async (req, res): Promise<void> => {
    const params = SubmitArticleCommentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = SubmitArticleCommentBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [article] = await db
      .select({ id: articlesTable.id })
      .from(articlesTable)
      .where(
        and(
          eq(articlesTable.slug, params.data.slug),
          visibleArticleFilter(),
        ),
      )
      .limit(1);
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    await db.insert(articleCommentsTable).values({
      articleId: article.id,
      displayName: body.data.displayName.trim(),
      body: body.data.body.trim(),
      status: "pending",
    });

    res.status(201).json(
      SubmitArticleCommentResponse.parse({
        message: "Your comment was received and is awaiting editorial review.",
      }),
    );
  },
);

router.post(
  "/newsletter/subscribe",
  newsletterLimit,
  async (req, res): Promise<void> => {
    const body = SubscribeNewsletterBody.safeParse(req.body);
    if (!body.success || body.data?.consent !== true) {
      res.status(400).json({
        error: body.success
          ? "Consent is required to subscribe."
          : body.error.message,
      });
      return;
    }

    const email = body.data.email.trim().toLowerCase();
    await db
      .insert(newsletterSubscribersTable)
      .values({ email, status: "subscribed", consentedAt: new Date() })
      .onConflictDoUpdate({
        target: newsletterSubscribersTable.email,
        set: {
          status: "subscribed",
          consentedAt: new Date(),
          unsubscribedAt: null,
        },
      });

    res.status(201).json(
      SubscribeNewsletterResponse.parse({
        message:
          "Your subscription preference is saved. Newsletter delivery will begin after the network configures its official email service.",
      }),
    );
  },
);

router.post(
  "/newsletter/unsubscribe",
  newsletterLimit,
  async (req, res): Promise<void> => {
    const body = UnsubscribeNewsletterBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    await db
      .update(newsletterSubscribersTable)
      .set({
        status: "unsubscribed",
        unsubscribedAt: new Date(),
      })
      .where(
        eq(
          newsletterSubscribersTable.email,
          body.data.email.trim().toLowerCase(),
        ),
      );

    res.json(
      UnsubscribeNewsletterResponse.parse({
        message:
          "If this address was subscribed, it has been removed from the newsletter list.",
      }),
    );
  },
);

export default router;
