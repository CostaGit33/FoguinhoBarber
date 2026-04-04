import SectionTitle from "./SectionTitle";

export default function ContactSection({ active, business, weeklySchedule }) {
  return (
    <section
      id="contato"
      className={`section ${active ? "active" : ""}`}
      aria-labelledby="contato-title"
      aria-hidden={!active}
    >
      <SectionTitle business={business} id="contato-title">
        Contato
      </SectionTitle>
      <div className="contact-list">
        <div className="contact-item">
          <strong>Endereco</strong>
          <a className="contact-link" href={business.mapsUrl} target="_blank" rel="noreferrer">
            {business.address}
          </a>
          <img
            className="location-photo"
            src={business.facadeImage}
            alt={`Fachada da ${business.name}`}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="contact-item">
          <strong>Telefone</strong>
          <a className="contact-link" href={business.phoneLink}>
            {business.phone}
          </a>
        </div>

        <div className="contact-item">
          <strong>Horarios</strong>
          <div className="schedule-list">
            {Object.entries(weeklySchedule)
              .filter(([, schedule]) => schedule)
              .map(([day, schedule]) => (
                <div key={day} className="schedule-row">
                  <span>{schedule.label}</span>
                  <span>
                    {schedule.open} - {schedule.close}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
