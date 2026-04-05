export default function HomeSection({
  active,
  professionals,
  services,
  onSelectProfessional,
  onSelectService,
  onChangeSection
}) {
  return (
    <section
      id="home"
      className={`section ${active ? "active" : ""}`}
      aria-labelledby="home-title"
      aria-hidden={!active}
    >
      <div className="hero">
        <div className="hero-header">
          <div className="hero-copy">
            <span className="eyebrow">Agendamento simples e direto</span>
            <h1 id="home-title">Escolha seu barbeiro, veja o horario livre e confirme sem enrolacao.</h1>
            <p className="lead">
              A home ficou mais leve para voce chegar mais rapido no que interessa: reservar, acompanhar
              sua agenda e falar com a equipe quando precisar.
            </p>
            <div className="hero-actions">
              <button className="btn hero-primary" type="button" onClick={() => onChangeSection("agendamento")}>
                Agendar agora
              </button>
              <button className="secondary-button" type="button" onClick={() => onChangeSection("profissionais")}>
                Ver profissionais
              </button>
            </div>
          </div>
        </div>

        <div className="home-professionals" aria-label="Profissionais em destaque">
          {professionals.map((professional) => (
            <button
              key={professional.name}
              type="button"
              className="featured-professional"
              onClick={() => onSelectProfessional(professional.name)}
              aria-label={`Agendar com ${professional.name}`}
            >
              <img
                className="featured-professional-photo"
                src={professional.image}
                alt={`Profissional ${professional.name}`}
                loading="lazy"
                decoding="async"
              />
              <span className="featured-professional-overlay">
                <strong>{professional.name}</strong>
                <span>{professional.role}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="quick-picks">
          <p className="quick-picks-label">Atalhos de servico</p>
          <div className="chip-row" aria-label="Escolha rapida de servicos">
            {services.slice(0, 4).map((service) => (
              <button
                key={service.name}
                type="button"
                className="chip-button"
                onClick={() => onSelectService(service.name)}
              >
                {service.name}
              </button>
            ))}
          </div>
        </div>

        <ul className="list compact-list" aria-label="Destaques ligados aos profissionais">
          {professionals.map((professional) => (
            <li key={professional.name} className="card spotlight-card">
              <span className="spotlight-owner">{professional.name}</span>
              <strong>{professional.spotlightTitle}</strong>
              <span className="meta">{professional.spotlightMeta}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
