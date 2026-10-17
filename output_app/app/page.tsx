import Link from 'next/link';
const TOOLS = [
  {
    "slug": "3d-print-cost-calculator",
    "title": "3D Print Cost & Filament Price Calculator",
    "tagline": "Accurately calculate filament, electricity, machine depreciation, and labor to price your 3D prints.",
    "category": "calculators",
    "created_at": "2026-10-17"
  }
];
export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-14">
          <h1 className="text-4xl font-extrabold mb-3">Free Instant Web Utilities ({TOOLS.length} Live)</h1>
          <p className="text-slate-400">Fast, browser-based calculators, formatters, and converters.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOOLS.map((t) => (
            <Link className="block p-6 bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-2xl" href={`/tools/${t.slug}`} key={t.slug}>
              <span className="text-xs px-2 py-1 rounded bg-slate-800 text-indigo-300">{t.category}</span>
              <h2 className="text-xl font-bold text-white mt-3 mb-2">{t.title} →</h2>
              <p className="text-sm text-slate-400">{t.tagline}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}