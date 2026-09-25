import { Link } from 'wouter';
import { ArrowRight, CheckCircle, Clock3, Layers3 } from 'lucide-react';
import { kanbanContent } from '@/seo/public-content';

const [etapas, registros, problemas, comparacao, origem] = kanbanContent.sections;

function ActionLinks({ final = false }: { final?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      {(final ? [kanbanContent.finalCta] : kanbanContent.actions).map((action) => (
        <Link
          key={action.text}
          href={action.href}
          data-testid={final ? 'link-kanban-cta-final' : `link-kanban-${action.href.slice(1)}`}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-colors ${
            action.href === '/criar-conta'
              ? 'bg-violet-600 text-white hover:bg-violet-500'
              : 'border border-white/20 text-white hover:border-violet-400'
          }`}
        >
          {action.text} <ArrowRight size={17} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}

function DetailCard({ text }: { text: string }) {
  const separator = text.indexOf(' — ');
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
      <CheckCircle className="mb-4 text-violet-400" size={22} aria-hidden="true" />
      <h3 className="mb-2 text-lg font-bold text-white">{text.slice(0, separator)}</h3>
      <p className="leading-relaxed text-slate-300">{text.slice(separator + 3)}</p>
    </li>
  );
}

export default function KanbanProducaoConfeccao() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5" aria-label="Navegação principal">
          <Link href="/" className="font-bold tracking-wide text-white" data-testid="link-kanban-home">MIRAGE HUB</Link>
          <div className="flex items-center gap-5 text-sm text-slate-300">
            <Link href="/planos" className="hover:text-white" data-testid="link-kanban-planos-nav">Planos</Link>
            <Link href="/criar-conta" className="hidden rounded-lg border border-violet-500/50 px-4 py-2 text-violet-200 hover:bg-violet-500/10 sm:block" data-testid="link-kanban-teste-nav">Teste grátis</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="border-b border-white/10 bg-gradient-to-br from-violet-950/35 via-[#0a0a0f] to-[#0a0a0f] px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-violet-300">Produção de confecção</p>
            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl" data-testid="heading-kanban">{kanbanContent.h1}</h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-slate-300">{kanbanContent.intro}</p>
            {kanbanContent.introExtra.map(text => <p key={text} className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">{text}</p>)}
            <div className="mt-9"><ActionLinks /></div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="etapas-title">
          <div className="mb-9 flex items-center gap-3 text-violet-300"><Layers3 aria-hidden="true" /><span className="text-sm font-bold uppercase tracking-widest">Fluxo de produção</span></div>
          <h2 id="etapas-title" className="mb-9 text-3xl font-bold sm:text-4xl">{etapas.title}</h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(etapas.items ?? []).map((item, i) => (
              <li key={item} className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.035] px-5 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 font-bold text-violet-300">{String(i + 1).padStart(2, '0')}</span>
                <span className="pt-1 leading-relaxed text-slate-200">{item}</span>
              </li>
            ))}
          </ol>
          <p className="mt-7 max-w-4xl rounded-xl border border-violet-500/20 bg-violet-500/10 p-5 leading-relaxed text-violet-100">{etapas.paragraphs?.[0]}</p>
        </section>

        <section className="border-y border-white/10 bg-white/[0.025] px-5 py-20" aria-labelledby="registros-title">
          <div className="mx-auto max-w-6xl">
            <h2 id="registros-title" className="mb-9 text-3xl font-bold sm:text-4xl">{registros.title}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(registros.items ?? []).map(text => <DetailCard key={text} text={text} />)}</ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="problemas-title">
          <div className="mb-7 flex items-center gap-3 text-amber-300"><Clock3 aria-hidden="true" /><span className="text-sm font-bold uppercase tracking-widest">Visibilidade na operação</span></div>
          <h2 id="problemas-title" className="mb-9 text-3xl font-bold sm:text-4xl">{problemas.title}</h2>
          <ul className="grid gap-4 md:grid-cols-3">{(problemas.items ?? []).map(text => <DetailCard key={text} text={text} />)}</ul>
        </section>

        <section className="border-y border-white/10 bg-white/[0.025] px-5 py-20" aria-labelledby="comparacao-title">
          <div className="mx-auto max-w-6xl">
            <h2 id="comparacao-title" className="mb-8 text-3xl font-bold sm:text-4xl">{comparacao.title}</h2>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm sm:text-base">
                <thead className="bg-violet-600/15 text-violet-100">
                  <tr><th scope="col" className="p-5">Critério</th>{comparacao.table?.headers.map(header => <th scope="col" key={header} className="p-5">{header}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {comparacao.table?.rows.map(([label, spreadsheet, mirage]) => (
                    <tr key={label} className="align-top">
                      <th scope="row" className="p-5 font-semibold text-white">{label}</th>
                      <td className="p-5 text-slate-400">{spreadsheet}</td>
                      <td className="p-5 text-slate-200">{mirage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="origem-title">
          <h2 id="origem-title" className="mb-7 text-3xl font-bold sm:text-4xl">{origem.title}</h2>
          {origem.paragraphs?.map(text => <p key={text} className="mb-5 max-w-3xl text-lg leading-relaxed text-slate-300">{text}</p>)}
          <p className="max-w-3xl text-sm text-slate-500">{origem.note}</p>
        </section>

        <section className="border-t border-white/10 bg-white/[0.025] px-5 py-20" aria-labelledby="faq-title">
          <div className="mx-auto max-w-4xl">
            <h2 id="faq-title" className="mb-8 text-3xl font-bold sm:text-4xl">{kanbanContent.faqTitle}</h2>
            <div className="space-y-4">
              {kanbanContent.faq.map(({ q, a }) => (
                <article key={q} className="rounded-2xl border border-white/10 bg-[#11111c] p-6">
                  <h3 className="mb-3 text-lg font-bold">{q}</h3>
                  <p className="leading-relaxed text-slate-300">{a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 text-center">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 rounded-3xl border border-violet-500/25 bg-violet-950/20 p-8 sm:p-12">
            <h2 className="text-3xl font-bold">Acompanhe cada ordem em cada etapa.</h2>
            <ActionLinks final />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-sm text-slate-500">
        <Link href="/" className="hover:text-white" data-testid="link-kanban-footer-home">Mirage Hub</Link>
      </footer>
    </div>
  );
}