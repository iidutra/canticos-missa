import { TAB_PLACEHOLDER } from "../lib/presentation-store.js";

export default function TabView({ value, onChange, className, fontScale = 1 }) {
  return (
    <textarea
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={TAB_PLACEHOLDER}
      spellCheck={false}
      aria-label="Tablatura de percussão"
      style={{ "--present-scale": fontScale }}
    />
  );
}
