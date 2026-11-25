import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock3, Menu, Search, Tv, X } from 'lucide-react';
import {
  useGetArticle, useRecordArticleView, useListArticles, useListCategories,
  useListAuthors, useGetAuthor, useListVideos, useGetVideo, useGetLive,
  useListBreakingNews, useGetPage, useSearchContent, useGetSiteSettings,
  useSubscribeNewsletter, useUnsubscribeNewsletter, useListArticleComments,
  useSubmitArticleComment, getListArticleCommentsQueryKey, setBaseUrl,
} from '@workspace/api-client-react';
import type { ArticleSummary, Video, Author } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import LatestLiberiaNews from '@/components/latest-liberia-news';

const qc = new QueryClient();
const brand = 'Focus on Bong TV Network';
const tagline = 'The Heartbeat of Bong County, Connecting the World.';
const origin = typeof window !== 'undefined' ? window.location.origin : '';
setBaseUrl(import.meta.env.VITE_API_BASE_URL || null);

function useMeta(title: string, description: string, canonical?: string, jsonLd?: object) {
  useEffect(() => {
    document.title = `${title} | ${brand}`;
    const set = (selector: string, attr: string, value: string) => {
      let node = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!node) { node = document.createElement(selector.startsWith('link') ? 'link' : 'meta'); document.head.appendChild(node); }
      node.setAttribute(attr, value);
    };
    set('meta[name="description"]', 'content', description);
    set('meta[property="og:title"]', 'content', `${title} | ${brand}`);
    set('meta[property="og:description"]', 'content', description);
    set('meta[property="og:type"]', 'content', 'website');
    set('link[rel="canonical"]', 'href', canonical || `${origin}${window.location.pathname}`);
    let ld = document.getElementById('page-jsonld');
    if (jsonLd) {
      if (!ld) { ld = document.createElement('script'); ld.id = 'page-jsonld'; ld.setAttribute('type', 'application/ld+json'); document.head.appendChild(ld); }
      ld.textContent = JSON.stringify(jsonLd);
    } else if (ld) ld.remove();
  }, [title, description, canonical, jsonLd]);
}

function dateLabel(date?: string | null) {
  if (!date) return 'Date not available';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Date not available' : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(parsed);
}
function Demo(_props: { demo?: boolean }) { return null; }
function AsyncState({ loading, error, children, label = 'content' }: { loading?: boolean; error?: boolean; children: ReactNode; label?: string }) {
  if (loading) return <div className="grid gap-4" aria-label="Loading"><div className="skeleton h-48"/><div className="skeleton h-8 w-2/3"/><div className="skeleton h-5 w-1/2"/></div>;
  if (error) return <div className="paper-card p-8 text-center" data-testid="status-error"><p className="serif text-2xl text-[#101f4a]">We couldn’t load this {label}.</p><p className="mt-2 text-sm text-stone-600">Please try again in a moment.</p></div>;
  return <>{children}</>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const [path] = useLocation();
  const { data: breaking } = useListBreakingNews();
  const headline = Array.isArray(breaking)
    ? breaking.find((item) => !item.endsAt || new Date(item.endsAt) > new Date())
    : undefined;
  return <>
    <div className="topline"><div className="wrap flex min-h-9 items-center justify-between gap-4"><span className="hidden sm:block" data-testid="text-tagline">{tagline}</span><span className="sm:hidden">Bong County · Liberia · The world</span><Link href="/live" className="flex items-center gap-2 font-bold tracking-[.12em] text-white" data-testid="link-live-top"><span className="h-2 w-2 rounded-full bg-[#f4c51b]"/> CHECK LIVE STATUS</Link></div></div>
    <header className="masthead">
      <div className="wrap flex items-center justify-between py-4 md:py-5">
        <Link href="/" className="flex min-w-0 items-center gap-3" data-testid="link-brand"><img src="/brand-logo.jpg" alt="Focus on Bong TV Network — The Heartbeat of Bong County, Connecting the World" className="h-[62px] w-[62px] shrink-0 rounded-full object-contain md:h-[74px] md:w-[74px]"/><span className="hidden sm:block"><span className="serif block text-[21px] font-bold leading-none text-[#101f4a]">Focus on Bong</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[.24em] text-[#b18a11]">TV Network · Liberia</span></span></Link>
        <div className="hidden flex-1 px-5 text-center lg:block"><div className="eyebrow">Bong County · Liberia · Africa · The world</div><p className="serif mt-1 text-[22px] font-semibold tracking-tight text-[#101f4a]">The stories that bring us closer.</p></div>
        <div className="flex items-center gap-2"><Link className="btn hidden sm:inline-flex" href="/latest-news" data-testid="link-read-latest">Read the latest <ArrowRight size={15}/></Link><Link href="/search" aria-label="Search" className="grid h-10 w-10 place-items-center border border-[#ded8ca] text-[#101f4a] hover:bg-[#f4c51b]" data-testid="link-search"><Search size={17}/></Link><button onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} className="grid h-10 w-10 place-items-center border border-[#ded8ca] md:hidden" data-testid="button-menu">{open ? <X size={18}/> : <Menu size={18}/>}</button></div>
      </div>
      <nav className={`${open ? 'block' : 'hidden'} border-t border-[#e4dfd3] md:block`} aria-label="Main navigation"><div className="wrap flex flex-col gap-0 py-1 md:flex-row md:items-center md:justify-center md:gap-8">
        {[['Home','/'],['Latest News','/latest-news'],['Videos','/videos'],['Live','/live'],['Authors','/authors'],['About','/about']].map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`nav-link border-b border-[#eee9e0] py-3 md:border-0 ${path === href ? 'text-[#c90018]' : ''}`} data-testid={`nav-${label.toLowerCase().replace(' ','-')}`}>{label}{href === '/live' && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#c90018] align-middle"/>}</Link>)}
      </div></nav>
    </header>
    {headline && <div className="breaking"><div className="wrap flex min-h-10 items-center gap-3 text-xs"><span className="bg-white px-2 py-1 text-[9px] font-black tracking-[.16em] text-[#c90018]">BREAKING</span>{headline.articleSlug ? <Link href={`/article/${headline.articleSlug}`} className="line-clamp-1 font-semibold" data-testid={`breaking-headline-${headline.id}`}>{headline.headline}</Link> : <span className="line-clamp-1 font-semibold" data-testid={`breaking-headline-${headline.id}`}>{headline.headline}</span>}<Demo demo={headline.isDemo}/></div></div>}
  </>;
}

function Footer() {
  const { data: settings } = useGetSiteSettings();
  const subscribe = useSubscribeNewsletter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  function submit(e: FormEvent) { e.preventDefault(); if (!email.trim()) return; subscribe.mutate({ data: { email, consent: true } }, { onSuccess: (result) => { setMessage(`${result.message} Email delivery is not configured yet.`); setEmail(''); }, onError: () => setMessage('We couldn’t record your request. Please try again.') }); }
  return <footer className="mt-20 bg-[#101f4a] text-[#f8f6f0]">
    <div className="wrap grid gap-10 py-12 md:grid-cols-[1.2fr_.8fr_1fr] md:py-16">
      <div><img src="/brand-logo.jpg" alt="Focus on Bong TV Network official logo" className="h-24 w-24 rounded-full object-contain" data-testid="img-footer-logo"/><p className="serif mt-4 max-w-sm text-xl leading-snug">{settings?.tagline || tagline}</p><p className="mt-3 text-xs leading-6 text-white/65">Independent public-facing news from Bong County, connecting Liberia, Africa and the world.</p></div>
      <div><p className="eyebrow !text-[#f4c51b]">Explore</p><div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">{[['Latest news','/latest-news'],['Videos','/videos'],['Live','/live'],['Authors','/authors'],['About','/about'],['Search','/search']].map(([l,h])=><Link className="text-white/80 hover:text-[#f4c51b]" href={h} key={h} data-testid={`footer-link-${h.replaceAll('/','') || 'home'}`}>{l}</Link>)}</div><div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/55">{[['Privacy','/privacy-policy'],['Terms','/terms'],['Editorial policy','/editorial-policy']].map(([l,h])=><Link href={h} key={h} className="hover:text-white" data-testid={`footer-policy-${h.slice(1)}`}>{l}</Link>)}</div></div>
      <div><p className="eyebrow !text-[#f4c51b]">A note from the network</p><h3 className="serif mt-3 text-2xl">Stay in the conversation.</h3><p className="mt-2 text-xs leading-5 text-white/65">Register your interest in network updates. Email delivery is not configured yet.</p><form onSubmit={submit} className="mt-4 flex"><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email address" className="min-w-0 flex-1 bg-white px-3 py-3 text-sm text-[#101f4a] outline-none" data-testid="input-newsletter-email"/><button disabled={subscribe.isPending} className="bg-[#f4c51b] px-4 text-xs font-extrabold text-[#101f4a] disabled:opacity-60" data-testid="button-newsletter">{subscribe.isPending ? 'Saving…' : 'SIGN UP'}</button></form>{message && <p className="mt-2 text-xs text-[#f4c51b]" role="status" data-testid="status-newsletter">{message}</p>}<p className="mt-3 text-[10px] text-white/45">By signing up, you consent to your email being recorded for this interest list.</p></div>
    </div>
    <div className="border-t border-white/15"><div className="wrap flex flex-col justify-between gap-2 py-4 text-[10px] text-white/55 sm:flex-row"><span>© {new Date().getFullYear()} {settings?.organizationName || brand}</span><span>{settings?.contactEmail}</span></div></div>
  </footer>;
}

function Shell({ children }: { children: ReactNode }) { return <><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-white focus:p-3">Skip to content</a><Header/><main id="main-content">{children}</main><Footer/></>; }

function SectionTitle({ overline, title, href, action }: { overline?: string; title: string; href?: string; action?: string }) { return <div className="rule-title mb-6"><div><span className="eyebrow">{overline}</span><h2 className="serif mt-1 text-3xl font-semibold tracking-tight text-[#101f4a] md:text-[38px]">{title}</h2></div>{href && <Link href={href} className="ml-auto inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-[#101f4a] hover:text-[#c90018]" data-testid={`link-more-${title.toLowerCase().replaceAll(' ','-')}`}>{action || 'View all'} <ArrowRight size={15}/></Link>}</div>; }

function ArticleCard({ article, feature = false }: { article: ArticleSummary; feature?: boolean }) {
  return <article className="article-card paper-card group overflow-hidden" data-testid={`card-article-${article.id}`}>
    <Link href={`/article/${article.slug}`} className="block" data-testid={`link-article-${article.slug}`}>
      <div className={`img-frame relative ${feature ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>{article.imageUrl ? <img src={article.imageUrl} alt={article.imageAlt || article.title} className="h-full w-full object-cover" data-testid={`img-article-${article.id}`}/> : <div className="grid h-full place-items-center bg-[#ece7dc] text-[#8b8375]"><span className="serif text-4xl">Focus</span></div>}{article.isDemo && <div className="absolute left-3 top-3"><Demo demo/></div>}</div>
      <div className={`${feature ? 'p-5 md:p-7' : 'p-4'}`}><div className="eyebrow">{article.categoryName} <span className="mx-1 text-[#c90018]">/</span>{dateLabel(article.publishedAt)}</div><h3 className={`serif mt-2 font-semibold leading-[1.13] text-[#101f4a] group-hover:text-[#c90018] ${feature ? 'text-3xl md:text-[40px]' : 'text-[22px]'}`} data-testid={`text-article-title-${article.id}`}>{article.title}</h3>{(article.subtitle || article.excerpt) && <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#65645f]">{article.subtitle || article.excerpt}</p>}<div className="mt-4 flex items-center justify-between border-t border-[#eee9e0] pt-3 text-[10px] font-semibold uppercase tracking-wider text-[#6d6b64]"><span>{article.authorName}</span><span className="flex items-center gap-1"><Clock3 size={12}/>{article.readingMinutes} min read</span></div></div>
    </Link>
  </article>;
}
function VideoCard({ video }: { video: Video }) { return <Link href={`/videos/${video.slug}`} className="paper-card group block overflow-hidden" data-testid={`card-video-${video.id}`}><div className="img-frame relative aspect-video">{video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"/> : <div className="grid h-full place-items-center bg-[#e8e3d7] text-[#101f4a]"><Tv size={34}/></div>}<span className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-[#c90018] text-white"><Tv size={16}/></span>{video.isDemo && <span className="absolute right-2 top-2"><Demo demo/></span>}</div><div className="p-4"><div className="eyebrow">{video.category} · {dateLabel(video.publishedAt)}</div><h3 className="serif mt-2 text-xl font-semibold leading-tight text-[#101f4a] group-hover:text-[#c90018]" data-testid={`text-video-title-${video.id}`}>{video.title}</h3>{video.duration && <p className="mt-3 text-xs text-stone-500">{video.duration}</p>}</div></Link>; }

function Home() {
  useMeta('Home', tagline);
  const { data, isLoading, isError } = useListArticles({ page: 1, pageSize: 7, sort: 'newest' });
  const { data: featured } = useListArticles({ page: 1, pageSize: 1, featured: true });
  const { data: cats } = useListCategories();
  const { data: videos } = useListVideos({ page: 1, pageSize: 3 });
  const { data: settings } = useGetSiteSettings();
  const items = Array.isArray(data?.items)
    ? data.items.filter((article) => !article.isDemo)
    : [];
  const featuredItems = Array.isArray(featured?.items) ? featured.items : [];
  const lead = featuredItems.find((article) => !article.isDemo) || items[0];
  const rest = items.filter(x => x.id !== lead?.id).slice(0, 4);
  return <Shell><div className="wrap">
    <div className="flex items-center justify-between border-b border-[#e2ddd2] py-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#6b6b65]"><span>Independent reporting · Bong County, Liberia</span><span className="hidden sm:block">Stories for our place in the world</span></div>
    <section className="grid gap-6 py-8 md:grid-cols-[1.55fr_.8fr] md:gap-9 md:py-11" data-testid="section-top-stories">
      <AsyncState loading={isLoading} error={isError} label="headlines">{lead ? <ArticleCard article={lead} feature/> : <div className="paper-card p-8"><span className="eyebrow">The newsroom</span><h1 className="serif mt-4 text-5xl leading-[1.05] text-[#101f4a] md:text-7xl">Local stories.<br/>A wider world.</h1><p className="mt-5 max-w-lg text-sm leading-7 text-stone-600">{settings?.brandPromise || tagline}</p><Link href="/latest-news" className="btn mt-6" data-testid="link-home-latest">Explore the newsroom <ArrowRight size={15}/></Link></div>}</AsyncState>
      <div className="flex flex-col gap-5">{rest.slice(0,3).map((a,i)=><Link key={a.id} href={`/article/${a.slug}`} className="group grid grid-cols-[104px_1fr] gap-4 border-b border-[#ded9cf] pb-4" data-testid={`link-home-story-${a.id}`}><div className="img-frame aspect-square">{a.imageUrl && <img src={a.imageUrl} alt={a.imageAlt} className="h-full w-full object-cover"/>}</div><div><span className="eyebrow">{a.categoryName}</span><h2 className="serif mt-1 text-xl font-semibold leading-tight text-[#101f4a] group-hover:text-[#c90018]">{a.title}</h2><p className="mt-2 text-[10px] text-stone-500">{dateLabel(a.publishedAt)} {a.isDemo && <span className="ml-1 font-bold text-[#9a7300]">· SAMPLE</span>}</p></div></Link>)}<Link href="/latest-news" className="mt-auto flex items-center justify-between bg-[#101f4a] p-4 text-white" data-testid="link-latest-brief"><span><span className="eyebrow !text-[#f4c51b]">Stay informed</span><span className="serif mt-1 block text-xl">All the latest reporting</span></span><ArrowUpRight size={20}/></Link></div>
    </section>
    {Array.isArray(cats) && cats.length > 0 && <section className="border-y border-[#ded9cf] py-5" data-testid="section-categories"><div className="flex flex-wrap items-center gap-x-5 gap-y-3"><span className="eyebrow mr-2">Browse by</span>{cats.map(c=><Link href={`/category/${c.slug}`} key={c.slug} className="text-xs font-bold text-[#101f4a] hover:text-[#c90018]" data-testid={`link-category-${c.slug}`}>{c.name}</Link>)}</div></section>}
    <LatestLiberiaNews />
    <section className="py-11"><SectionTitle overline="From the newsroom" title="Latest reporting" href="/latest-news"/><AsyncState loading={isLoading} error={isError} label="articles">{items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.slice(0,6).map(a=><ArticleCard key={a.id} article={a}/>)}</div> : <Empty title="No stories published yet" detail="New reporting will appear here when it is available."/>}</AsyncState></section>
    <section className="mb-12 grid items-center gap-5 bg-[#101f4a] p-6 text-white md:grid-cols-[1fr_auto] md:p-9"><div><span className="eyebrow !text-[#f4c51b]">Focus on Bong TV</span><h2 className="serif mt-2 text-3xl md:text-4xl">{settings?.tagline || tagline}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">News and stories rooted in Bong County, with a view toward Liberia, Africa and the world.</p></div><Link className="btn !bg-[#f4c51b] !text-[#101f4a]" href="/about" data-testid="link-about-network">About the network <ArrowRight size={15}/></Link></section>
    <section className="pb-12"><SectionTitle overline="Watch" title="On Focus" href="/videos"/>{Array.isArray(videos?.items) && videos.items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{videos.items.map(v=><VideoCard key={v.id} video={v}/>)}</div> : <Empty title="No videos available" detail="Published video coverage will appear here."/ >}</section>
  </div></Shell>;
}
function Empty({ title, detail }: { title: string; detail: string }) { return <div className="paper-card px-6 py-12 text-center" data-testid="status-empty"><span className="eyebrow">The newsroom</span><h3 className="serif mt-2 text-2xl text-[#101f4a]">{title}</h3><p className="mt-2 text-sm text-stone-600">{detail}</p></div>; }

function ArticleListing({ mode='all', value='' }: { mode?: 'all'|'category'|'author'|'tag'; value?: string }) {
  const [loc, setLoc] = useLocation();
  const page = Number(new URLSearchParams(loc.split('?')[1] || '').get('page') || '1');
  const params: Record<string, string | number> = { page, pageSize: 12, sort: 'newest' };
  if (mode === 'category') params.category = value;
  if (mode === 'author') params.author = value;
  if (mode === 'tag') params.tag = value;
  const { data, isLoading, isError } = useListArticles(params);
  const { data: cats } = useListCategories();
  const title = mode === 'category' ? (cats?.find(c=>c.slug===value)?.name || value.replaceAll('-',' ')) : mode === 'author' ? 'Author archive' : mode === 'tag' ? `#${value}` : 'Latest news';
  useMeta(title, `Latest reporting from ${brand}.`);
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / (data?.pageSize || 12)));
  const changePage = (n:number) => { setLoc(n === 1 ? window.location.pathname : `${window.location.pathname}?page=${n}`); window.scrollTo({top:0,behavior:'smooth'}); };
  return <Shell><div className="wrap py-8 md:py-12"><div className="eyebrow">News &amp; reporting</div><h1 className="serif mt-2 text-5xl font-semibold capitalize text-[#101f4a] md:text-6xl" data-testid="text-listing-title">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">{mode === 'category' ? cats?.find(c=>c.slug===value)?.description : 'News from Bong County, Liberia, Africa and the world.'}</p>{mode==='all' && cats?.length ? <div className="my-6 flex flex-wrap gap-2">{cats.map(c=><Link key={c.slug} href={`/category/${c.slug}`} className="border border-[#ddd7ca] px-3 py-2 text-[11px] font-bold text-[#101f4a] hover:bg-[#f4c51b]" data-testid={`filter-category-${c.slug}`}>{c.name}</Link>)}</div> : null}
    <AsyncState loading={isLoading} error={isError} label="news"><div className="mt-8">{data?.items?.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.items.map(a=><ArticleCard key={a.id} article={a}/>)}</div> : <Empty title="No reporting found" detail="There are no published articles in this view yet."/>}</div></AsyncState>
    {data?.items?.length ? <nav className="mt-9 flex items-center justify-between border-t border-[#ddd7ca] pt-5" aria-label="Pagination"><button disabled={page<=1} onClick={()=>changePage(page-1)} className="btn btn-light disabled:opacity-40" data-testid="button-previous-page"><ArrowLeft size={15}/> Previous</button><span className="text-xs font-semibold text-stone-600" data-testid="text-pagination">Page {page} of {totalPages}</span><button disabled={page>=totalPages} onClick={()=>changePage(page+1)} className="btn btn-light disabled:opacity-40" data-testid="button-next-page">Next <ArrowRight size={15}/></button></nav> : null}
  </div></Shell>;
}

function ArticlePage({ slug }: { slug: string }) {
  const { data: article, isLoading, isError } = useGetArticle(slug);
  const record = useRecordArticleView();
  const comments = useListArticleComments(slug);
  const submitComment = useSubmitArticleComment();
  const [name, setName] = useState(''); const [body, setBody] = useState(''); const [commentMessage, setCommentMessage] = useState('');
  const queryClient = useQueryClient();
  useEffect(() => { if (article) { const key = `fob-view-${article.slug}`; if (!sessionStorage.getItem(key)) { const sessionKey = `${crypto.randomUUID()}-focus`; sessionStorage.setItem(key, '1'); record.mutate({ slug: article.slug, data: { sessionKey } }); } } }, [article?.slug]);
  useMeta(article?.title || 'Article', article?.excerpt || tagline, undefined, article ? { '@context':'https://schema.org', '@type':'NewsArticle', headline:article.title, description:article.excerpt, datePublished:article.publishedAt || undefined, dateModified:article.updatedAt, author:{'@type':'Person',name:article.authorName}, image:article.imageUrl || undefined, mainEntityOfPage:`${origin}/article/${article.slug}`, publisher:{'@type':'Organization',name:brand,logo:{'@type':'ImageObject',url:`${origin}/brand-logo.jpg`}} } : undefined);
  function comment(e:FormEvent) { e.preventDefault(); setCommentMessage(''); submitComment.mutate({ slug, data: { displayName:name.trim(), body:body.trim() } }, { onSuccess: r=>{ setCommentMessage(r.message || 'Your comment was submitted for moderation.'); setName(''); setBody(''); queryClient.invalidateQueries({queryKey:getListArticleCommentsQueryKey(slug)}); }, onError:()=>setCommentMessage('Your comment could not be submitted. Please try again.') }); }
  return <Shell><div className="wrap max-w-[900px] py-8 md:py-12"><AsyncState loading={isLoading} error={isError} label="article">{article ? <article data-testid="article-content">
    <div className="eyebrow"><Link href={`/category/${article.categorySlug}`} className="hover:text-[#c90018]">{article.categoryName}</Link> <span className="mx-2 text-[#c90018]">/</span>{dateLabel(article.publishedAt)}</div><Demo demo={article.isDemo}/>
    <h1 className="serif mt-4 text-4xl font-semibold leading-[1.07] tracking-tight text-[#101f4a] md:text-[62px]" data-testid="text-article-heading">{article.title}</h1>{article.subtitle && <p className="serif mt-4 text-xl leading-snug text-stone-600 md:text-2xl">{article.subtitle}</p>}
    <div className="my-6 flex flex-wrap items-center justify-between gap-3 border-y border-[#e3ded3] py-4 text-xs"><Link href={`/author/${article.authorSlug}`} className="font-bold text-[#101f4a] hover:text-[#c90018]" data-testid="link-article-author">{article.authorName}</Link><span className="text-stone-500">{article.readingMinutes} min read · {article.viewCount} views</span></div>
    {article.imageUrl && <figure className="mb-8"><img src={article.imageUrl} alt={article.imageAlt} className="max-h-[540px] w-full object-cover" data-testid="img-article-hero"/>{article.imageCredit && <figcaption className="mt-2 text-right text-[10px] text-stone-500">{article.imageCredit}</figcaption>}</figure>}
    <p className="serif mb-7 border-l-4 border-[#f4c51b] pl-5 text-xl leading-relaxed text-[#283550]" data-testid="text-article-excerpt">{article.excerpt}</p><div className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-[#101f4a] prose-p:leading-[1.85] prose-p:text-[#3d4147]" data-testid="text-article-body">{article.body.split(/\n{2,}/).map((para,i)=><p key={i}>{para}</p>)}</div>
    {article.tags?.length>0 && <div className="mt-8 flex flex-wrap gap-2 border-t border-[#e3ded3] pt-5">{article.tags.map(tag=><Link key={tag} href={`/tag/${encodeURIComponent(tag)}`} className="bg-[#eeeae1] px-3 py-2 text-[11px] font-semibold text-[#39445b]" data-testid={`link-tag-${tag}`}>#{tag}</Link>)}</div>}
    <section className="mt-12 border-t-2 border-[#101f4a] pt-7" data-testid="section-comments"><span className="eyebrow">Reader responses</span><h2 className="serif mt-1 text-3xl text-[#101f4a]">Join the conversation</h2><p className="mt-2 text-xs text-stone-600">Comments are reviewed by the newsroom before they appear.</p><form onSubmit={comment} className="mt-5 grid gap-3"><label className="text-xs font-bold text-[#101f4a]">Your name<input required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)} className="mt-1 block w-full border border-[#d8d2c6] bg-white p-3 font-normal outline-none focus:border-[#101f4a]" data-testid="input-comment-name"/></label><label className="text-xs font-bold text-[#101f4a]">Comment<textarea required minLength={2} maxLength={1500} rows={4} value={body} onChange={e=>setBody(e.target.value)} className="mt-1 block w-full resize-y border border-[#d8d2c6] bg-white p-3 font-normal outline-none focus:border-[#101f4a]" data-testid="input-comment-body"/></label><div><button disabled={submitComment.isPending} className="btn disabled:opacity-60" data-testid="button-submit-comment">{submitComment.isPending?'Submitting…':'Submit for moderation'}</button></div>{commentMessage && <p role="status" className="text-sm text-[#365c45]" data-testid="status-comment">{commentMessage}</p>}</form><div className="mt-8 space-y-4">{comments.data?.map(c=><div className="border-t border-[#e5e0d6] pt-4" key={c.id} data-testid={`comment-${c.id}`}><div className="flex justify-between text-xs font-bold text-[#101f4a]"><span>{c.displayName}</span><span className="font-normal text-stone-500">{dateLabel(c.createdAt)}</span></div><p className="mt-2 text-sm leading-6 text-stone-700">{c.body}</p></div>)}{comments.isError && <p className="text-xs text-stone-500">Approved comments are temporarily unavailable.</p>}</div></section>
  </article> : <Empty title="Article unavailable" detail="This article may have moved or is not currently published."/>}</AsyncState><Link href="/latest-news" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#101f4a]" data-testid="link-back-news"><ArrowLeft size={15}/> Back to latest news</Link></div></Shell>;
}

function VideoListing() { const { data, isLoading, isError } = useListVideos({ page:1,pageSize:18 }); useMeta('Videos', 'Watch video reporting and coverage from Focus on Bong TV Network.'); return <Shell><div className="wrap py-10"><div className="eyebrow">Watch</div><h1 className="serif mt-2 text-5xl text-[#101f4a]" data-testid="text-videos-title">Video desk</h1><p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">Video reporting and published coverage from the network.</p><div className="mt-8"><AsyncState loading={isLoading} error={isError} label="videos">{data?.items?.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.items.map(v=><VideoCard key={v.id} video={v}/>)}</div> : <Empty title="No videos published yet" detail="Available video coverage will be shown here."/ >}</AsyncState></div></div></Shell>; }
function VideoPage({slug}:{slug:string}) { const {data:video,isLoading,isError}=useGetVideo(slug); useMeta(video?.title || 'Video', video?.description || 'Video coverage from Focus on Bong TV Network.'); const embed = video?.sourceType==='youtube' ? video.sourceUrl.replace('watch?v=','embed/').replace('youtu.be/','www.youtube.com/embed/') : video?.sourceUrl; return <Shell><div className="wrap max-w-[1000px] py-10"><AsyncState loading={isLoading} error={isError} label="video">{video ? <><div className="eyebrow">{video.category} · {dateLabel(video.publishedAt)}</div><Demo demo={video.isDemo}/><h1 className="serif mt-3 text-4xl text-[#101f4a] md:text-6xl" data-testid="text-video-heading">{video.title}</h1><div className="mt-7 aspect-video bg-[#101f4a]">{video.sourceType==='youtube' ? <iframe title={video.title} src={embed} className="h-full w-full" allowFullScreen data-testid="video-player"/> : video.sourceType==='hls' ? <video controls src={video.sourceUrl} poster={video.thumbnailUrl || undefined} className="h-full w-full" data-testid="video-player"/> : <div className="grid h-full place-items-center text-center text-white"><div><Tv className="mx-auto mb-3" size={32}/><p className="mb-4">This video is hosted externally.</p><a href={video.sourceUrl} target="_blank" rel="noreferrer" className="btn !bg-[#f4c51b] !text-[#101f4a]" data-testid="link-external-video">Watch video <ArrowUpRight size={15}/></a></div></div>}</div><p className="mt-6 max-w-3xl text-base leading-7 text-stone-700" data-testid="text-video-description">{video.description}</p></> : <Empty title="Video unavailable" detail="This video may no longer be published."/>}</AsyncState></div></Shell>; }

function LivePage() { const {data:live,isLoading,isError}=useGetLive(); useMeta('Live', 'Live broadcast status and schedule from Focus on Bong TV Network.'); return <Shell><div className="wrap max-w-[1000px] py-10"><div className="eyebrow">Focus on Bong TV Network</div><h1 className="serif mt-2 text-5xl text-[#101f4a]" data-testid="text-live-title">Live &amp; schedule</h1><AsyncState loading={isLoading} error={isError} label="live information"><>{live?.isLive && live.streamUrl ? <section className="mt-8 bg-[#101f4a] p-4 md:p-8" data-testid="section-live-player"><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500"/> Live now</div><h2 className="serif mb-4 text-3xl text-white">{live.programTitle || 'Live broadcast'}</h2>{live.programDescription && <p className="mb-5 text-sm text-white/70">{live.programDescription}</p>}{live.streamType==='youtube' ? <iframe title={live.programTitle || 'Live broadcast'} src={live.streamUrl} className="aspect-video w-full" allowFullScreen data-testid="live-player"/> : <video controls autoPlay className="aspect-video w-full bg-black" src={live.streamUrl} data-testid="live-player"/>}</section> : <div className="mt-8 border-l-4 border-[#f4c51b] bg-[#fffefa] p-6 md:p-9" data-testid="status-not-live"><span className="eyebrow">Broadcast status</span><h2 className="serif mt-2 text-3xl text-[#101f4a]">There is no confirmed live broadcast right now.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">When the network confirms a stream, it will appear here. Browse published coverage in the meantime.</p><Link href="/videos" className="btn mt-5" data-testid="link-live-videos">Watch published videos <ArrowRight size={15}/></Link></div>}{live?.programTitle && !live.isLive && <p className="mt-5 font-semibold text-[#101f4a]">{live.programTitle}{live.programDescription ? ` — ${live.programDescription}` : ''}</p>}<section className="mt-10"><SectionTitle overline="Broadcast guide" title="Upcoming schedule"/>{live?.schedule?.length ? <div className="divide-y divide-[#e1dbce] border-y border-[#e1dbce]">{live.schedule.map((s,i)=><div key={`${s.startsAt}-${i}`} className="grid gap-2 py-4 sm:grid-cols-[180px_1fr]" data-testid={`schedule-item-${i}`}><div className="text-xs font-bold text-[#a37a00]">{dateLabel(s.startsAt)} · {new Date(s.startsAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div><div><h3 className="serif text-xl text-[#101f4a]">{s.title}</h3><p className="mt-1 text-sm text-stone-600">{s.description}</p><Demo demo={s.isDemo}/></div></div>)}</div> : <Empty title="No schedule posted" detail="Broadcast schedule details will be added by the network."/>}</section>{live?.alternativeLinks?.length ? <div className="mt-6 flex flex-wrap gap-3">{live.alternativeLinks.map((url,i)=><a href={url} target="_blank" rel="noreferrer" className="btn btn-light" key={url} data-testid={`link-live-alternative-${i}`}>Alternative stream <ArrowUpRight size={14}/></a>)}</div>:null}</></AsyncState></div></Shell>; }

function SearchPage() { const [loc,setLoc] = useLocation(); const params = new URLSearchParams(loc.split('?')[1] || ''); const [q,setQ] = useState(params.get('q') || ''); const [submitted,setSubmitted] = useState(params.get('q') || ''); const {data,isLoading,isError}=useSearchContent({q:submitted.length>=2?submitted:'  ',page:Number(params.get('page')||1)},{query:{enabled:submitted.length>=2, queryKey:['/api/search',{q:submitted,page:Number(params.get('page')||1)}]}}); useMeta(submitted ? `Search: ${submitted}` : 'Search', 'Search news and video coverage from Focus on Bong TV Network.'); function go(e:FormEvent){e.preventDefault();const value=q.trim();setSubmitted(value);setLoc(`/search?q=${encodeURIComponent(value)}`)} return <Shell><div className="wrap max-w-[1000px] py-10"><div className="eyebrow">Find a story</div><h1 className="serif mt-2 text-5xl text-[#101f4a]">Search the newsroom</h1><form onSubmit={go} className="mt-7 flex max-w-2xl"><label htmlFor="site-search" className="sr-only">Search news and videos</label><input id="site-search" type="search" minLength={2} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search headlines, topics, video…" className="min-w-0 flex-1 border border-[#d8d2c6] bg-white px-4 py-4 text-sm outline-none focus:border-[#101f4a]" data-testid="input-search"/><button className="btn" data-testid="button-search"><Search size={17}/> Search</button></form>{submitted.length<2 ? <div className="mt-7"><Empty title="What are you looking for?" detail="Enter at least two characters to search published news and video."/></div> : <div className="mt-8"><p className="mb-5 text-sm text-stone-600" data-testid="text-search-count">{data?.total ?? 0} results for “{submitted}”</p><AsyncState loading={isLoading} error={isError} label="search results">{data && (data.articles.length || data.videos.length) ? <><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.articles.map(a=><ArticleCard key={`a${a.id}`} article={a}/>)}</div>{data.videos.length>0 && <><h2 className="serif mt-10 text-3xl text-[#101f4a]">Videos</h2><div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.videos.map(v=><VideoCard key={`v${v.id}`} video={v}/>)}</div></>}</> : <Empty title="No matching stories" detail="Try another search term or browse the latest news."/ >}</AsyncState></div>}</div></Shell>; }

function AuthorsPage() { const {data,isLoading,isError}=useListAuthors(); useMeta('Authors', 'Meet the public contributors to Focus on Bong TV Network.'); return <Shell><div className="wrap py-10"><div className="eyebrow">The people behind the reporting</div><h1 className="serif mt-2 text-5xl text-[#101f4a]" data-testid="text-authors-title">Authors</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Public author profiles from the newsroom.</p><div className="mt-8"><AsyncState loading={isLoading} error={isError} label="authors">{data?.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map(author=><AuthorCard key={author.id} author={author}/>)}</div> : <Empty title="No public profiles yet" detail="Author profiles will appear here when they are available."/ >}</AsyncState></div></div></Shell>; }
function AuthorCard({author}:{author:Author}) {return <Link href={`/author/${author.slug}`} className="paper-card group flex gap-4 p-5" data-testid={`card-author-${author.id}`}>{author.imageUrl ? <img src={author.imageUrl} alt={author.name} className="h-16 w-16 rounded-full object-cover"/> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#101f4a] serif text-xl text-[#f4c51b]">{author.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>}<div><h2 className="serif text-xl font-semibold text-[#101f4a] group-hover:text-[#c90018]">{author.name}</h2><p className="eyebrow mt-1">{author.role}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600">{author.bio}</p><p className="mt-2 text-[10px] text-stone-500">{author.articleCount} published {author.articleCount===1?'article':'articles'} {author.isDemo?'· SAMPLE':''}</p></div></Link>}

function AuthorPage({slug}:{slug:string}) { const {data:author,isLoading,isError}=useGetAuthor(slug); const articles=useListArticles({author:slug,page:1,pageSize:12}); useMeta(author?.name || 'Author', author?.bio || 'Public author profile and published reporting.'); return <Shell><div className="wrap py-10"><AsyncState loading={isLoading} error={isError} label="author profile">{author ? <><div className="flex flex-col gap-5 border-b border-[#ded9cf] pb-8 sm:flex-row sm:items-center">{author.imageUrl?<img src={author.imageUrl} alt={author.name} className="h-28 w-28 rounded-full object-cover"/>:<div className="grid h-28 w-28 place-items-center rounded-full bg-[#101f4a] serif text-4xl text-[#f4c51b]">{author.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>}<div><div className="eyebrow">Contributor profile</div><Demo demo={author.isDemo}/><h1 className="serif mt-2 text-5xl text-[#101f4a]" data-testid="text-author-name">{author.name}</h1><p className="mt-2 text-sm font-semibold text-[#9b7500]">{author.role}</p>{author.bio&&<p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">{author.bio}</p>}</div></div><section className="mt-9"><SectionTitle overline="Reporting" title="Articles by this author"/><AsyncState loading={articles.isLoading} error={articles.isError} label="author articles">{articles.data?.items?.length?<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{articles.data.items.map(a=><ArticleCard key={a.id} article={a}/>)}</div>:<Empty title="No published articles" detail="There is no currently published reporting for this profile."/ >}</AsyncState></section></>:<Empty title="Profile unavailable" detail="This author profile may not be public or may have moved."/ >}</AsyncState></div></Shell>; }

function PageContent({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useGetPage(slug);
  useMeta(data?.title || slug.replaceAll('-', ' '), data?.summary || 'Public information from Focus on Bong TV Network.');
  return (
    <Shell>
      <div className="wrap max-w-[860px] py-10">
        <AsyncState loading={isLoading} error={isError} label="page">
          {data ? (
            <article data-testid="content-page">
              <div className="eyebrow">Network information</div>
              <h1 className="serif mt-2 text-5xl text-[#101f4a]" data-testid="text-page-title">
                {data.title}
              </h1>
              {data.summary && (
                <p className="serif mt-4 border-l-4 border-[#f4c51b] pl-5 text-xl leading-relaxed text-stone-600">
                  {data.summary}
                </p>
              )}
              <div
                className="prose prose-lg mt-8 max-w-none prose-headings:font-serif prose-headings:text-[#101f4a] prose-p:leading-[1.8] prose-p:text-stone-700"
                data-testid="text-page-body"
              >
                {data.body.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <p className="mt-8 border-t border-[#e5e0d6] pt-4 text-xs text-stone-500">
                Updated {dateLabel(data.updatedAt)}
              </p>
            </article>
          ) : (
            <Empty
              title="Information not available"
              detail="No published information is available for this page."
            />
          )}
        </AsyncState>
      </div>
    </Shell>
  );
}

function AboutPage() {
  const { data: settings } = useGetSiteSettings();
  const { data } = useGetPage('about');
  const hasContactDetails = Boolean(settings?.contactEmail || settings?.contactPhone);
  const socialLinks = settings?.socialLinks || [];
  useMeta(data?.title || 'About', data?.summary || 'About Focus on Bong TV Network.');

  return (
    <Shell>
      <div className="wrap max-w-[950px] py-10">
        <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div className="bg-[#101f4a] p-8 text-white">
            <img
              src="/brand-logo.jpg"
              alt="Focus on Bong TV Network official logo"
              className="mx-auto w-48 rounded-full"
              data-testid="img-about-logo"
            />
            <p className="serif mt-5 text-center text-2xl">{settings?.tagline || tagline}</p>
          </div>
          <div>
            <div className="eyebrow">Our network</div>
            <h1 className="serif mt-2 text-5xl text-[#101f4a]" data-testid="text-about-title">
              {data?.title || 'About Focus on Bong TV Network'}
            </h1>
            {data?.summary ? (
              <p className="serif mt-4 text-xl leading-relaxed text-stone-600">{data.summary}</p>
            ) : (
              <p className="mt-4 text-base leading-7 text-stone-700">
                {settings?.brandPromise || 'A newsroom for Bong County, Liberia, Africa and the world.'}
              </p>
            )}
          </div>
        </div>
        {data?.body && (
          <div
            className="prose prose-lg mx-auto mt-9 max-w-3xl prose-headings:font-serif prose-headings:text-[#101f4a] prose-p:leading-8"
            data-testid="text-about-body"
          >
            {data.body.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}
        {(hasContactDetails || socialLinks.length > 0) && (
          <div className="mt-8 bg-[#f1ede4] p-5">
            <p className="eyebrow">Contact &amp; social</p>
            {hasContactDetails && (
              <p className="mt-2 text-sm">
                {settings?.contactEmail && <span>{settings.contactEmail}</span>}
                {settings?.contactEmail && settings?.contactPhone && ' · '}
                {settings?.contactPhone && <span>{settings.contactPhone}</span>}
              </p>
            )}
            {socialLinks.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.url}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-[#101f4a] underline"
                    data-testid={`link-social-${social.label.toLowerCase().replaceAll(' ', '-')}`}
                  >
                    {social.label}
                    <ArrowUpRight size={12} className="ml-1 inline" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

function UnsubscribePage(){const unsub=useUnsubscribeNewsletter(); const [email,setEmail]=useState('');const [message,setMessage]=useState('');useMeta('Unsubscribe','Manage your newsletter registration with Focus on Bong TV Network.');function go(e:FormEvent){e.preventDefault();unsub.mutate({data:{email}}, {onSuccess:r=>setMessage(r.message),onError:()=>setMessage('We could not process that request. Please try again.')});}return <Shell><div className="wrap max-w-[620px] py-16"><span className="eyebrow">Newsletter preferences</span><h1 className="serif mt-2 text-5xl text-[#101f4a]">Unsubscribe</h1><p className="mt-4 text-sm leading-6 text-stone-600">Enter your email address to remove it from the network’s newsletter interest list. Email delivery is not configured yet.</p><form onSubmit={go} className="mt-7 grid gap-3"><label className="text-xs font-bold text-[#101f4a]">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 block w-full border border-[#d8d2c6] bg-white p-3 font-normal" data-testid="input-unsubscribe-email"/></label><button className="btn w-fit" disabled={unsub.isPending} data-testid="button-unsubscribe">{unsub.isPending?'Updating…':'Unsubscribe'}</button>{message&&<p className="text-sm text-[#365c45]" role="status" data-testid="status-unsubscribe">{message}</p>}</form></div></Shell>;}

function Routed() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={Home}/><Route path="/latest-news" component={()=><ArticleListing/>}/>
    <Route path="/category/:slug">{p=><ArticleListing mode="category" value={p.slug}/>}</Route>
    <Route path="/article/:slug">{p=><ArticlePage slug={p.slug}/>}</Route>
    <Route path="/videos" component={VideoListing}/><Route path="/videos/:slug">{p=><VideoPage slug={p.slug}/>}</Route>
    <Route path="/live" component={LivePage}/><Route path="/search" component={SearchPage}/>
    <Route path="/authors" component={AuthorsPage}/><Route path="/author/:slug">{p=><AuthorPage slug={p.slug}/>}</Route>
    <Route path="/tag/:tag">{p=><ArticleListing mode="tag" value={decodeURIComponent(p.tag)}/>}</Route>
    <Route path="/about" component={AboutPage}/><Route path="/privacy-policy" component={()=><PageContent slug="privacy-policy"/>}/>
    <Route path="/terms" component={()=><PageContent slug="terms"/>}/><Route path="/editorial-policy" component={()=><PageContent slug="editorial-policy"/>}/>
    <Route path="/newsletter/unsubscribe" component={UnsubscribePage}/><Route component={NotFound}/>
  </Switch></ErrorBoundary>;
}
function App() { return <QueryClientProvider client={qc}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><Routed/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>; }
export default App;
