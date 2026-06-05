import { Check, Copy } from "lucide-react";
import { buttonClass } from "./styles";

export function CopyButton({
  label,
  copied,
  onClick
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button className={buttonClass} type="button" aria-label={`复制 ${label}`} onClick={onClick}>
      {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
      <span className="hidden sm:inline">{copied ? "copied" : "copy"}</span>
    </button>
  );
}
