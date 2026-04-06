import { formatCurrency } from "../booking";
import SectionTitle from "./SectionTitle";
import BookingDashboard from "./BookingDashboard";

export default function BookingSection({
  active,
  business,
  formData,
  status,
  today,
  maxDate,
  services,
  professionals,
  selectedProfessional,
  selectedService,
  selectedDaySchedule,
  availableSlots,
  bookings,
  onChange,
  onSubmit,
  onSelectService,
  onSelectProfessional,
  onSelectSlot,
  onCancelBooking
}) {
  return (
    <section
      id="agendamento"
      className={`section ${active ? "active" : ""}`}
      aria-labelledby="agendamento-title"
      aria-hidden={!active}
    >
      <SectionTitle business={business} id="agendamento-title">
        Agendamento
      </SectionTitle>
      <form className="form-card" onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="booking-steps" aria-label="Etapas do agendamento">
            <span className={`step-pill ${formData.profissional ? "step-done" : ""}`}>1. Profissional</span>
            <span className={`step-pill ${formData.servico ? "step-done" : ""}`}>2. Servico</span>
            <span className={`step-pill ${formData.data && formData.hora ? "step-done" : ""}`}>3. Horario</span>
          </div>

          {selectedProfessional ? (
            <div className="booking-summary">
              <img
                className="booking-summary-photo"
                src={selectedProfessional.image}
                alt={`Profissional ${selectedProfessional.name}`}
              />
              <div>
                <strong>Voce esta agendando com {selectedProfessional.name}</strong>
                <p className="meta">{selectedProfessional.highlight}</p>
              </div>
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="nome">Nome</label>
            <input
              type="text"
              id="nome"
              name="nome"
              placeholder="Seu nome"
              autoComplete="name"
              value={formData.nome}
              onChange={onChange}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="servico">Servico</label>
            <select id="servico" name="servico" value={formData.servico} onChange={onChange} required>
              <option value="">Escolha o servico</option>
              {services.map((service) => (
                <option key={service.name} value={service.name}>
                  {service.name} - {formatCurrency(service.price)}
                </option>
              ))}
            </select>
            {selectedService ? (
              <p className="service-price" aria-live="polite">
                Valor selecionado: <strong>{formatCurrency(selectedService.price)}</strong> -{" "}
                {selectedService.duration} min
              </p>
            ) : null}
            <div className="chip-row inline-chip-row" aria-label="Servicos sugeridos">
              {services.map((service) => (
                <button
                  key={service.name}
                  type="button"
                  className={`chip-button small-chip ${formData.servico === service.name ? "chip-active" : ""}`}
                  onClick={() => onSelectService(service.name)}
                >
                  {service.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="profissional">Profissional</label>
            <select
              id="profissional"
              name="profissional"
              value={formData.profissional}
              onChange={onChange}
              required
            >
              <option value="">Escolha o profissional</option>
              {professionals.map((professional) => (
                <option key={professional.name} value={professional.name}>
                  {professional.name}
                </option>
              ))}
            </select>
            <div className="chip-row inline-chip-row" aria-label="Profissionais sugeridos">
              {professionals.map((professional) => (
                <button
                  key={professional.name}
                  type="button"
                  className={`chip-button small-chip ${formData.profissional === professional.name ? "chip-active" : ""}`}
                  onClick={() => onSelectProfessional(professional.name)}
                >
                  {professional.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="data">Data</label>
            <input
              type="date"
              id="data"
              name="data"
              min={today}
              max={maxDate}
              value={formData.data}
              onChange={onChange}
              aria-describedby="horario-funcionamento"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="hora">Horario</label>
            <input
              type="time"
              id="hora"
              name="hora"
              min={selectedDaySchedule?.open}
              max={selectedDaySchedule?.close}
              step="1800"
              value={formData.hora}
              onChange={onChange}
              disabled={!selectedDaySchedule}
              required
            />
            <p id="horario-funcionamento" className="field-note">
              {selectedDaySchedule
                ? `${selectedDaySchedule.label}: ${selectedDaySchedule.open} as ${selectedDaySchedule.close}`
                : "Selecione uma data de segunda a sabado para liberar os horarios de atendimento."}
            </p>
          </div>

          <div className="slot-panel" aria-live="polite">
            <div className="slot-panel-header">
              <strong>Horarios disponiveis</strong>
              <span className="meta">
                {selectedService ? `${selectedService.duration} min por atendimento` : "Escolha um servico"}
              </span>
            </div>
            {availableSlots.length > 0 ? (
              <div className="slot-grid">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    className={`slot-button ${formData.hora === slot.time ? "slot-selected" : ""}${
                      !slot.available ? " slot-unavailable" : ""
                    }`}
                    disabled={!slot.available}
                    title={!slot.available ? "Horário indisponível" : "Selecionar horário"}
                    onClick={() => onSelectSlot(slot.time)}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            ) : (
              <p className="meta">
                Escolha data, profissional e servico para ver os horarios livres da agenda.
              </p>
            )}
          </div>

          <button className="btn" type="submit">
            Confirmar agendamento
          </button>
          <p className="hint">
            Ao confirmar, o agendamento entra na agenda real da barbearia e tambem abrimos o
            WhatsApp com a mensagem pronta para envio.
          </p>
          <p className="status" aria-live="polite">
            {status}
          </p>
        </div>
      </form>

      <BookingDashboard bookings={bookings} onCancel={onCancelBooking} />
    </section>
  );
}
