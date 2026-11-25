import { Button } from '@/components/ui/button';

/**
 * AI OFFICE — welcome screen (Phase 1).
 * Static only: no AI, no database, no login, no Instagram.
 * The agent list below is plain text; the app does not run or import the agents.
 */
const AGENTS = [
  { n: 1, name: 'Marketing Strateg', job: 'Strategiya, auditoriya va kontent reja' },
  { n: 2, name: 'Kopirayter', job: 'Caption, sarlavha, Reel ssenariysi, xeshteglar' },
  { n: 3, name: 'Grafik dizayner', job: 'Post, Stories va Reels uchun vizual dizayn' },
  { n: 4, name: 'SMM menejer', job: 'Instagram paketi va joylash vaqti' },
  { n: 5, name: 'Marketing tahlilchi', job: 'Natijalar tahlili va xulosalar' },
  { n: 6, name: 'Sifat nazorati', job: 'Imlo, brend va aniqlik tekshiruvi' },
] as const;

export default function WelcomePage() {
  return (
    <main className="safe-area mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6">
      <header className="flex flex-col items-center gap-3 pt-6 text-center">
        <div
          aria-hidden="true"
          className="flex size-20 items-center justify-center rounded-[1.375rem] bg-primary text-3xl font-bold tracking-tight text-primary-foreground shadow-lg shadow-primary/25"
        >
          AI
        </div>
        <h1 className="text-3xl font-bold tracking-tight">AI OFFICE</h1>
        <p className="text-base text-muted-foreground">Sizning AI marketing ofisingiz</p>
        <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-sm font-medium text-success">
          <span aria-hidden="true" className="size-2 rounded-full bg-success" />
          Nashr o‘chiq · Sinov bosqichi
        </span>
      </header>

      <section aria-labelledby="team" className="rounded-lg bg-card p-2 text-card-foreground shadow-sm">
        <h2 id="team" className="px-3 pt-2 pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Jamoa · 6 ta mustaqil agent
        </h2>
        <ul className="divide-y divide-border">
          {AGENTS.map((a) => (
            <li key={a.n} className="flex min-h-14 items-center gap-3 px-3 py-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                {a.n}
              </span>
              <span className="flex flex-col">
                <span className="font-semibold">{a.name}</span>
                <span className="text-sm text-muted-foreground">{a.job}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="px-2 text-center text-sm text-muted-foreground">
        Har bir kontentni faqat siz — CEO — tasdiqlaysiz. Agentlar nashr qila olmaydi.
      </p>

      <div className="mt-auto flex flex-col gap-2 pb-2">
        <Button size="lg" disabled aria-disabled="true">
          Kirish — tez orada
        </Button>
        <p className="text-center text-xs text-muted-foreground">Login keyingi bosqichda qo‘shiladi.</p>
      </div>
    </main>
  );
}
