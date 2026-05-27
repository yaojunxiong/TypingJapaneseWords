const checks = [
  {
    label: "Next.js",
    value: "Ready",
    detail: "Local development and production build scripts are configured.",
  },
  {
    label: "Supabase",
    value:
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "Configured"
        : "Needs keys",
    detail: "Fill .env.local with your project URL and anon key.",
  },
  {
    label: "Vercel",
    value: "Ready",
    detail: "The project uses Vercel's Next.js framework detection.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
      <section className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Development environment
        </p>
        <h1 className="text-4xl font-semibold text-slate-950 sm:text-5xl">
          Next + Supabase is ready to wire up.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
          This starter is prepared for local development, Git tracking, and a
          Vercel deployment once your Supabase keys are added.
        </p>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {checks.map((check) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            key={check.label}
          >
            <div className="text-sm font-medium text-slate-500">
              {check.label}
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">
              {check.value}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {check.detail}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
