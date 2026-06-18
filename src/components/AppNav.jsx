const TABS = [
  { id: "home", label: "Início", short: "Início", icon: "⌂" },
  { id: "build", label: "Montar", short: "Montar", icon: "♪" },
  { id: "library", label: "Biblioteca", short: "Biblio.", icon: "📚" },
  { id: "saved", label: "Salvos", short: "Salvos", icon: "💾" },
];

export default function AppNav({ tab, onTab, libraryCount, savedCount, variant }) {
  const suffix = (id) => {
    if (id === "library" && libraryCount) return ` (${libraryCount})`;
    if (id === "saved" && savedCount) return ` (${savedCount})`;
    return "";
  };

  return (
    <nav className={variant === "mobile" ? "app-nav-mobile" : "app-nav-desktop"} aria-label="Navegação principal">
      {TABS.map(({ id, label, short, icon }) => (
        <button
          key={id}
          type="button"
          className={`app-tab${tab === id ? " app-tab--active" : ""}`}
          onClick={() => onTab(id)}
          aria-current={tab === id ? "page" : undefined}
        >
          {variant === "mobile" && <span className="app-tab__icon" aria-hidden>{icon}</span>}
          {variant === "mobile" ? short : label}
          {variant !== "mobile" ? suffix(id) : null}
        </button>
      ))}
    </nav>
  );
}
