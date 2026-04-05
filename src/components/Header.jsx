import { NavLink } from "react-router-dom";

export default function Header({
  business,
  sections,
  isMobileMenuOpen,
  onToggleMenu,
  currentUser,
  onCloseMenu,
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
          <NavLink
            key={section.to}
            to={section.to}
            className="nav-button"
            onClick={section.onClick ?? onCloseMenu}
          >
            {section.label}
          </NavLink>
        ))}
        {currentUser ? (
          <>
            <NavLink className="nav-button nav-user-badge" to="/conta" onClick={onCloseMenu}>
              {currentUser.name.split(" ")[0]}
            </NavLink>
            <button className="nav-button" type="button" onClick={onLogout}>
              Sair
            </button>
          </>
        ) : (
          <NavLink className="nav-button" to="/login" onClick={onCloseMenu}>
            Entrar
          </NavLink>
        )}
      </nav>
    </header>
  );
}
