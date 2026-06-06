export function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 112 + 4;
      const y = 34 - ((value - min) / range) * 26;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="h-10 w-32" viewBox="0 0 120 40" role="img" aria-label="24h signal sparkline">
      <polyline className="sparkline-path" points={points} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
