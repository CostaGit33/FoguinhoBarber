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
  const isRecover = authView === "recover";

  return (
    <section
      id="login"
      className={`section ${active ? "active" : ""}`}
      aria-labelledby="login-title"
      aria-hidden={!active}
    >
      <SectionTitle business={business} id="login-title">
        Sua conta
      </SectionTitle>

      <div className="auth-layout">
        <div className="card auth-benefits">
          <p className="dashboard-kicker">Acesso rapido</p>
          <strong>Entre para acompanhar seus agendamentos sem sobrecarregar a tela inicial.</strong>
          <ul className="auth-benefit-list">
            <li>Veja seus proximos horarios em uma area separada</li>
            <li>Remarque ou cancele com mais clareza</li>
            <li>Guarde seus barbeiros favoritos para reservar mais rapido</li>
          </ul>
          <p className="meta">
            Inspirado nos fluxos mais diretos de apps de agendamento: menos distração na home e mais foco
            em entrar, marcar e acompanhar.
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
                required
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

          {!isRecover ? (
            <div className="field">
              <label htmlFor="auth-password">Senha</label>
              <input
                id="auth-password"
                name="password"
                type="password"
                placeholder="Sua senha"
                value={authForm.password}
                onChange={onChange}
                required
              />
            </div>
          ) : (
            <p className="hint">
              Informe seu e-mail. Se a recuperação automática ainda não estiver disponível, você recebe a
              orientação pelo atendimento da barbearia.
            </p>
          )}

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
                : "Continuar"}
          </button>

          <p className="status" aria-live="polite">
            {authMessage}
          </p>
        </form>
      </div>
    </section>
  );
}
