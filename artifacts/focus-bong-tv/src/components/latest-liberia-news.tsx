import { useState } from 'react';

type NewsCategory = 'Politics' | 'Economy' | 'Sports' | 'National';
type NewsFilter = 'All' | NewsCategory;

type NewsItem = {
  category: NewsCategory;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string;
};

const publishedAt = '2026-11-13';
const displayDate = 'Nov 13, 2026';

const filters: NewsFilter[] = ['All', 'Politics', 'Economy', 'Sports', 'National'];

const stories: NewsItem[] = [
  {
    category: 'Politics',
    headline: 'Lawmakers Debate Proposed US$1.539 Billion FY2027 National Budget',
    summary:
      'President Joseph Boakai’s US$1.539 billion budget faces scrutiny from lawmakers and watchdog groups like Integrity Watch Liberia, who warn that planned tax hikes could burden small businesses and low-income families.',
    source: 'Liberian Observer / The New Dawn Liberia',
    publishedAt,
  },
  {
    category: 'Politics',
    headline: 'Liberia Records Sharp Decline in Anti-Corruption Score Despite Governance Gains',
    summary:
      'The 2026 Ibrahim Index of African Governance ranks Liberia 27th in Africa overall, noting slight governance improvements alongside a 12.2-point drop in anti-corruption performance over the past decade.',
    source: 'The New Dawn Liberia',
    publishedAt,
  },
  {
    category: 'National',
    headline: 'Kemayah and Co-Defendants Appeal 10-Year Prison Sentences to Supreme Court',
    summary:
      'Former Foreign Minister Dee-Maxwell Saah Kemayah and co-defendants have formally filed an appeal before the Supreme Court of Liberia challenging their 10-year prison sentences.',
    source: 'FrontPageAfrica',
    publishedAt,
  },
  {
    category: 'Economy',
    headline: 'House Agriculture Committee Intervenes in Rubber Trade Dispute Over Executive Order 166',
    summary:
      'Rubber planters have praised the House of Representatives for stepping into the debate surrounding Executive Order 166 as the government cracks down on illegal rubber trade.',
    source: 'FrontPageAfrica',
    publishedAt,
  },
  {
    category: 'Economy',
    headline: 'AfDB and World Bank Urge Stronger Institutions to Unlock Development Financing',
    summary:
      'International financial partners called on Liberia to strengthen public institutions and accountability following the launch of the new digital Anti-Corruption Dashboard.',
    source: 'FrontPageAfrica',
    publishedAt,
  },
  {
    category: 'Sports',
    headline: 'National County Sports Meet Approved as Permanent Budgeted Institution',
    summary:
      'The House of Representatives concurred with the Senate on legislation establishing the annual National County Sports Meet as a permanent national institution funded through the national budget.',
    source: 'Capitol Building / Local Media',
    publishedAt,
  },
  {
    category: 'Sports',
    headline: 'Lofa County Loses Hosting Rights for 2026/2027 County Meet Group C',
    summary:
      'Lofa County lost its hosting rights for Group C matches due to shipping delays for synthetic turf materials needed to complete the Voinjama Sports Pitch.',
    source: 'Liberian Observer',
    publishedAt,
  },
  {
    category: 'National',
    headline: 'Liberian Diaspora in Europe Prepares for 180th Independence Anniversary in Paris',
    summary:
      'Liberian associations across Europe are partnering with the Embassy in Paris and UNESCO delegation to host a three-day cultural gala and sporting event.',
    source: 'Liberian Observer',
    publishedAt,
  },
];

const categoryStyles: Record<NewsCategory, string> = {
  Politics: 'bg-[#f9e3e5] text-[#9f0013]',
  Economy: 'bg-[#fbf3d6] text-[#806300]',
  Sports: 'bg-[#e4efe6] text-[#355a3f]',
  National: 'bg-[#e7ebf2] text-[#304264]',
};

export default function LatestLiberiaNews() {
  const [activeFilter, setActiveFilter] = useState<NewsFilter>('All');
  const visibleStories =
    activeFilter === 'All'
      ? stories
      : stories.filter((story) => story.category === activeFilter);

  return (
    <section className="border-y border-[#ded9cf] py-10 md:py-12" aria-labelledby="latest-liberia-news">
      <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">Liberia · News desk</span>
          <h2
            id="latest-liberia-news"
            className="serif mt-1 text-3xl font-semibold tracking-tight text-[#101f4a] md:text-[38px]"
          >
            Latest Liberia News
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            National headlines across governance, the economy, sports and community life.
          </p>
        </div>
        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          8 headlines · {displayDate}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter news by category">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            aria-pressed={activeFilter === filter}
            className={`border px-3 py-2 text-[11px] font-bold transition-colors ${
              activeFilter === filter
                ? 'border-[#101f4a] bg-[#101f4a] text-white'
                : 'border-[#ddd7ca] bg-white text-[#101f4a] hover:border-[#101f4a]'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        {visibleStories.map((story) => (
          <article key={story.headline} className="paper-card flex h-full flex-col p-5">
            <div className="flex items-center justify-between gap-3">
              <span
                className={`inline-flex px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${categoryStyles[story.category]}`}
              >
                {story.category}
              </span>
              <time
                dateTime={story.publishedAt}
                className="text-[10px] font-semibold uppercase tracking-wide text-stone-500"
              >
                {displayDate}
              </time>
            </div>
            <h3 className="serif mt-4 text-xl font-semibold leading-tight text-[#101f4a]">
              {story.headline}
            </h3>
            <p className="mt-3 flex-1 text-sm leading-6 text-stone-600">{story.summary}</p>
            <div className="mt-5 border-t border-[#eee9e0] pt-3">
              <span className="text-[9px] font-bold uppercase tracking-[.16em] text-stone-500">
                Source
              </span>
              <p className="mt-1 text-xs font-semibold text-[#39445b]">{story.source}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
