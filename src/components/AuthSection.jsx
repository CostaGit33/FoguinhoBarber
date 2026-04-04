import SectionTitle from "./SectionTitle";

const tabs = [
  { id: "login", label: "Login" },
  { id: "register", label: "Cadastro" },
  { id: "recover", label: "Recuperar senha" }
];

export default function AuthSection({
  active,
  business,
  authView,
  authForm,
  authMessage,
  onTabChange,
  onChange,
  onSubmit
}) {
  return (
    <section
      id="login"
      className={`section ${active ? "active" : ""}`}
      aria-labelledby="login-title"
      aria-hidden={!active}
    >
      <SectionTitle business={business} id="login-title">
        Acesso
      </SectionTitle>

      <div className="auth-layout">
        <div className="card auth-benefits">
          <p className="dashboard-kicker">Conta do cliente</p>
          <strong>Entre para salvar seu historico e acompanhar agendamentos</strong>
          <ul className="auth-benefit-list">
            <li>Perfil com nome, telefone e preferidos</li>
            <li>Historico dos agendamentos feitos neste navegador</li>
            <li>Painel administrativo para a conta gestora</li>
          </ul>
          <p className="meta">
            Conta admin de demonstração: <strong>admin@foguinhobarber.com</strong> com senha{" "}
            <strong>admin123</strong>.
          </p>
        </div>

        <form className="form-card auth-card" onSubmit={onSubmit}>
          <div className="chip-row auth-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`chip-button ${authView === tab.id ? "chip-active" : ""}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {authView === "register" ? (
            <div className="field">
              <label htmlFor="auth-name">Nome</label>
              <input
                id="auth-name"
                name="name"
                type="text"
                placeholder="Seu nome"
                value={authForm.name}
                onChange={onChange}
                required={authView === "register"}
              />
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="auth-email">E-mail</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              placeholder="voce@email.com"
              value={authForm.email}
              onChange={onChange}
              required
            />
          </div>

          {(authView === "login" || authView === "register") ? (
            <div className="field">
              <label htmlFor="auth-password">Senha</label>
              <input
                id="auth-password"
                name="password"
                type="password"
                placeholder="Sua senha"
                value={authForm.password}
                onChange={onChange}
                required={authView !== "recover"}
              />
            </div>
          ) : null}

          {authView === "register" ? (
            <div className="field">
              <label htmlFor="auth-phone">Telefone</label>
              <input
                id="auth-phone"
                name="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={authForm.phone}
                onChange={onChange}
                required
              />
            </div>
          ) : null}

          <button className="btn" type="submit">
            {authView === "login"
              ? "Entrar"
              : authView === "register"
                ? "Criar conta"
                : "Recuperar acesso"}
          </button>

          <p className="status" aria-live="polite">
            {authMessage}
          </p>
        </form>
      </div>
    </section>
  );
}
