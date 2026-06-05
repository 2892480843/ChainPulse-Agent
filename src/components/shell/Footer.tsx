export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
        <span>ChainPulse Agent Demo / mock xAPI and attestation data</span>
        <span className="mono">reportHash + evidenceHash only</span>
      </div>
    </footer>
  );
}
