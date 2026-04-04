export default function Header({
  business,
  sections,
  activeSection,
  isMobileMenuOpen,
  onToggleMenu,
  onChangeSection,
  currentUser,
  onAuthAction,
  onLogout
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <img
          className="brand-logo"
          src={business.logo}
          alt={`Logo da ${business.name}`}
          fetchPriority="high"
        />
        <span>{business.name}</span>
      </div>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-expanded={isMobileMenuOpen}
        aria-controls="main-navigation"
        onClick={onToggleMenu}
      >
        Menu
      </button>
      <nav
        id="main-navigation"
        className={`nav ${isMobileMenuOpen ? "nav-open" : ""}`}
        aria-label="Navegacao principal"
      >
        {sections.map((section) => (
          <button
            key={section.id}
            className="nav-button"
            type="button"
            onClick={() => onChangeSection(section.id)}
            aria-current={activeSection === section.id ? "page" : undefined}
          >
            {section.label}
          </button>
        ))}
        {currentUser ? (
          <>
            <button className="nav-button nav-user-badge" type="button" onClick={() => onChangeSection("conta")}>
              {currentUser.name.split(" ")[0]}
            </button>
            <button className="nav-button" type="button" onClick={onLogout}>
              Sair
            </button>
          </>
        ) : (
          <button className="nav-button" type="button" onClick={onAuthAction}>
            Entrar
          </button>
        )}
      </nav>
    </header>
  );
}
