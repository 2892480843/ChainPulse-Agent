import { inputClass } from "./styles";

export function Field({ label, defaultValue, name }: { label: string; defaultValue: string; name: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input className={inputClass} name={name} defaultValue={defaultValue} autoComplete="off" spellCheck={false} />
    </label>
  );
}

export function SelectField({ label, options, name }: { label: string; options: string[]; name: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select className={inputClass} name={name} defaultValue={options[0]} autoComplete="off">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
