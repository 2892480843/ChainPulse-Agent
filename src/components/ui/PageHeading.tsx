export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 md:text-[32px] md:leading-tight">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
