import { formatCurrency, formatDate } from "../booking";
import SectionTitle from "./SectionTitle";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "schedule", label: "Agenda" },
  { id: "clients", label: "Clientes" },
  { id: "professionals", label: "Profissionais" },
  { id: "services", label: "Servicos" },
  { id: "notifications", label: "Notificacoes" },
  { id: "settings", label: "Configuracoes" }
];

export default function AdminSection({
  active,
  business,
  adminView,
  bookings,
  users,
  professionals,
  services,
  notifications,
  settings,
  onTabChange,
  onSettingsChange
}) {
  const clientUsers = users.filter((user) => user.role !== "admin");
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.price, 0);

  return (
    <section
      id="admin"
      className={`section ${active ? "active" : ""}`}
      aria-labelledby="admin-title"
      aria-hidden={!active}
    >
      <SectionTitle business={business} id="admin-title">
        Painel admin
      </SectionTitle>

      <div className="chip-row auth-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`chip-button ${adminView === tab.id ? "chip-active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {adminView === "dashboard" ? (
        <div className="admin-grid">
          <div className="dashboard-card">
            <p className="dashboard-kicker">Visao geral</p>
            <h3>{bookings.length} agendamentos registrados</h3>
            <p className="meta">Receita potencial total: {formatCurrency(totalRevenue)}</p>
          </div>
          <div className="dashboard-card">
            <p className="dashboard-kicker">Clientes</p>
            <h3>{clientUsers.length} contas cadastradas</h3>
            <p className="meta">Clientes reais sincronizados com a API e o PostgreSQL.</p>
          </div>
          <div className="dashboard-card">
            <p className="dashboard-kicker">Equipe</p>
            <h3>{professionals.length} profissionais ativos</h3>
            <p className="meta">Gerencie apresentacao e disponibilidade da equipe.</p>
          </div>
        </div>
      ) : null}

      {adminView === "schedule" ? (
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div>
              <p className="dashboard-kicker">Agenda do dia</p>
              <h3>Todos os agendamentos</h3>
            </div>
            <span className="dashboard-count">{bookings.length}</span>
          </div>
          <ul className="booking-dashboard-list">
            {bookings.map((booking) => (
              <li key={booking.id} className="booking-dashboard-item">
                <div>
                  <strong>
                    {booking.service} com {booking.professional}
                  </strong>
                  <p className="meta">
                    {booking.name} - {formatDate(booking.date)} as {booking.time}
                  </p>
                </div>
                <span className="meta">{formatCurrency(booking.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {adminView === "clients" ? (
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div>
              <p className="dashboard-kicker">Clientes</p>
              <h3>Usuarios cadastrados</h3>
            </div>
            <span className="dashboard-count">{clientUsers.length}</span>
          </div>
          <ul className="booking-dashboard-list">
            {clientUsers.map((user) => (
              <li key={user.id} className="booking-dashboard-item">
                <div>
                  <strong>{user.name}</strong>
                  <p className="meta">{user.email}</p>
                  <p className="meta">{user.phone}</p>
                </div>
                <span className="meta">{formatDate(user.createdAt.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {adminView === "professionals" ? (
        <div className="professionals-grid">
          {professionals.map((professional) => (
            <div key={professional.name} className="card">
              <strong>{professional.name}</strong>
              <p className="meta">{professional.role}</p>
              <p className="meta">{professional.highlight}</p>
            </div>
          ))}
        </div>
      ) : null}

      {adminView === "services" ? (
        <div className="list service-grid">
          {services.map((service) => (
            <div key={service.name} className="card service-card">
              <div className="service-card-top">
                <strong>{service.name}</strong>
                <span className="service-value">{formatCurrency(service.price)}</span>
              </div>
              <p className="meta">{service.meta}</p>
              <span className="service-duration">{service.duration} min</span>
            </div>
          ))}
        </div>
      ) : null}

      {adminView === "notifications" ? (
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div>
              <p className="dashboard-kicker">Notificacoes</p>
              <h3>Lembretes e eventos do sistema</h3>
            </div>
            <span className="dashboard-count">{notifications.length}</span>
          </div>
          <ul className="booking-dashboard-list">
            {notifications.map((notification) => (
              <li key={notification.id} className="booking-dashboard-item">
                <div>
                  <strong>{notification.title}</strong>
                  <p className="meta">{notification.message}</p>
                </div>
                <span className="meta">{notification.createdAt.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {adminView === "settings" ? (
        <form className="form-card" onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="settings-reminder">Horas para lembrete</label>
              <input
                id="settings-reminder"
                name="reminderHours"
                type="number"
                min="1"
                max="48"
                value={settings.reminderHours}
                onChange={onSettingsChange}
              />
            </div>
            <div className="field field-checkbox">
              <label>
                <input
                  name="publicBookingEnabled"
                  type="checkbox"
                  checked={settings.publicBookingEnabled}
                  onChange={onSettingsChange}
                />
                Agendamento publico habilitado
              </label>
            </div>
            <div className="field field-checkbox">
              <label>
                <input
                  name="installBannerEnabled"
                  type="checkbox"
                  checked={settings.installBannerEnabled}
                  onChange={onSettingsChange}
                />
                Banner de instalacao habilitado
              </label>
            </div>
            <p className="meta">
              Essas configuracoes ainda ficam locais no navegador, enquanto a agenda e as contas
              ja usam a estrutura real do projeto.
            </p>
          </div>
        </form>
      ) : null}
    </section>
  );
}
