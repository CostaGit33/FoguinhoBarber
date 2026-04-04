import { formatCurrency, formatDate } from "../booking";

export default function BookingDashboard({ bookings, onCancel }) {
  return (
    <section className="dashboard-card" aria-labelledby="painel-title">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-kicker">Painel rapido</p>
          <h3 id="painel-title">Proximos agendamentos salvos neste dispositivo</h3>
        </div>
        <span className="dashboard-count">{bookings.length}</span>
      </div>

      {bookings.length === 0 ? (
        <p className="meta">
          Quando um agendamento for confirmado, ele aparecera aqui para facilitar revisao e
          cancelamento rapido.
        </p>
      ) : (
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
                <p className="meta">
                  {formatCurrency(booking.price)} - {booking.duration} min
                </p>
              </div>
              <button className="chip-button dashboard-cancel" type="button" onClick={() => onCancel(booking.id)}>
                Cancelar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
