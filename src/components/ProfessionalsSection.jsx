import SectionTitle from "./SectionTitle";

export default function ProfessionalsSection({
  active,
  business,
  professionals,
  favorites = [],
  onSelectProfessional,
  onToggleFavorite
}) {
  return (
    <section
      id="profissionais"
      className={`section ${active ? "active" : ""}`}
      aria-labelledby="profissionais-title"
      aria-hidden={!active}
    >
      <SectionTitle business={business} id="profissionais-title">
        Profissionais
      </SectionTitle>
      <div className="professionals-grid" aria-label="Equipe da barbearia">
        {professionals.map((professional) => (
          <article key={professional.name} className="card professional-card">
            <button
              type="button"
              className={`favorite-toggle ${favorites.includes(professional.name) ? "favorite-toggle-active" : ""}`}
              onClick={() => onToggleFavorite?.(professional.name)}
              aria-pressed={favorites.includes(professional.name)}
            >
              {favorites.includes(professional.name) ? "Favorito" : "Favoritar"}
            </button>
            <button
              type="button"
              className="professional-booking-button"
              onClick={() => onSelectProfessional(professional.name)}
            >
              <img
                className="professional-photo"
                src={professional.image}
                alt={`Profissional ${professional.name}`}
                loading="lazy"
                decoding="async"
              />
              <span className="professional-photo-overlay">Agendar com {professional.name}</span>
            </button>
            <div className="professional-info">
              <strong>{professional.name}</strong>
              <span className="professional-role">{professional.role}</span>
              <p className="meta">{professional.highlight}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
