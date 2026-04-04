import { formatCurrency, formatDate } from "../booking";
import SectionTitle from "./SectionTitle";

const tabs = [
  { id: "profile", label: "Perfil" },
  { id: "upcoming", label: "Meus agendamentos" },
  { id: "history", label: "Historico" },
  { id: "favorites", label: "Favoritos" }
];

export default function AccountSection({
  active,
  business,
  currentUser,
  accountView,
  profileForm,
  accountMessage,
  upcomingBookings,
  allBookings,
  favoriteProfessionals,
  professionals,
  onTabChange,
  onProfileChange,
  onProfileSubmit,
  onCancelBooking,
  onSelectProfessional
}) {
  const historyBookings = allBookings.filter(
    (booking) => booking.userId === currentUser?.id || booking.userEmail === currentUser?.email
  );

  return (
    <section
      id="conta"
      className={`section ${active ? "active" : ""}`}
      aria-labelledby="conta-title"
      aria-hidden={!active}
    >
      <SectionTitle business={business} id="conta-title">
        Area do cliente
      </SectionTitle>

      <div className="chip-row auth-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`chip-button ${accountView === tab.id ? "chip-active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {accountView === "profile" ? (
        <form className="form-card" onSubmit={onProfileSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="profile-name">Nome</label>
              <input id="profile-name" name="name" value={profileForm.name} onChange={onProfileChange} required />
            </div>
            <div className="field">
              <label htmlFor="profile-email">E-mail</label>
              <input
                id="profile-email"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={onProfileChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="profile-phone">Telefone</label>
              <input id="profile-phone" name="phone" value={profileForm.phone} onChange={onProfileChange} required />
            </div>
            <button className="btn" type="submit">
              Salvar perfil
            </button>
            <p className="status">{accountMessage}</p>
          </div>
        </form>
      ) : null}

      {accountView === "upcoming" ? (
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div>
              <p className="dashboard-kicker">Agenda pessoal</p>
              <h3>Seus proximos agendamentos</h3>
            </div>
            <span className="dashboard-count">{upcomingBookings.length}</span>
          </div>
          {upcomingBookings.length === 0 ? (
            <p className="meta">Voce ainda nao possui agendamentos vinculados a esta conta.</p>
          ) : (
            <ul className="booking-dashboard-list">
              {upcomingBookings.map((booking) => (
                <li key={booking.id} className="booking-dashboard-item">
                  <div>
                    <strong>
                      {booking.service} com {booking.professional}
                    </strong>
                    <p className="meta">
                      {formatDate(booking.date)} as {booking.time}
                    </p>
                    <p className="meta">{formatCurrency(booking.price)}</p>
                  </div>
                  <button className="chip-button dashboard-cancel" type="button" onClick={() => onCancelBooking(booking.id)}>
                    Cancelar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {accountView === "history" ? (
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div>
              <p className="dashboard-kicker">Historico</p>
              <h3>Todos os agendamentos desta conta</h3>
            </div>
            <span className="dashboard-count">{historyBookings.length}</span>
          </div>
          <ul className="booking-dashboard-list">
            {historyBookings.map((booking) => (
              <li key={booking.id} className="booking-dashboard-item">
                <div>
                  <strong>{booking.service}</strong>
                  <p className="meta">
                    {booking.professional} - {formatDate(booking.date)} as {booking.time}
                  </p>
                </div>
                <span className="meta">{formatCurrency(booking.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {accountView === "favorites" ? (
        <div className="professionals-grid">
          {favoriteProfessionals.length === 0 ? (
            <div className="card">
              <strong>Nenhum favorito por enquanto</strong>
              <p className="meta">Marque barbeiros como favoritos para acessa-los mais rapido depois.</p>
            </div>
          ) : (
            favoriteProfessionals.map((name) => {
              const professional = professionals.find((item) => item.name === name);
              if (!professional) {
                return null;
              }

              return (
                <article key={professional.name} className="card professional-card">
                  <button type="button" className="professional-booking-button" onClick={() => onSelectProfessional(professional.name)}>
                    <img className="professional-photo" src={professional.image} alt={`Profissional ${professional.name}`} />
                    <span className="professional-photo-overlay">Agendar com {professional.name}</span>
                  </button>
                  <div className="professional-info">
                    <strong>{professional.name}</strong>
                    <span className="professional-role">{professional.role}</span>
                    <p className="meta">{professional.highlight}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </section>
  );
}
