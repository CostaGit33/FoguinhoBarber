import { formatCurrency } from "../booking";
import SectionTitle from "./SectionTitle";

export default function ServicesSection({ active, business, services, selectedServiceName, onSelectService }) {
  return (
    <section
      id="servicos"
      className={`section ${active ? "active" : ""}`}
      aria-labelledby="servicos-title"
      aria-hidden={!active}
    >
      <SectionTitle business={business} id="servicos-title">
        Servicos
      </SectionTitle>
      <div className="chip-row services-chip-row" aria-label="Escolha rapida de servicos">
        {services.map((service) => (
          <button
            key={service.name}
            type="button"
            className={`chip-button ${selectedServiceName === service.name ? "chip-active" : ""}`}
            onClick={() => onSelectService(service.name)}
          >
            {service.name}
          </button>
        ))}
      </div>
      <ul className="list service-grid" aria-label="Lista de servicos">
        {services.map((service) => (
          <li key={service.name} className="card service-card">
            <div className="service-card-top">
              <strong>{service.name}</strong>
              <span className="service-value">{formatCurrency(service.price)}</span>
            </div>
            <span className="meta">{service.meta}</span>
            <span className="service-duration">Duracao media: {service.duration} min</span>
            <button className="chip-button service-select" type="button" onClick={() => onSelectService(service.name)}>
              Escolher servico
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
