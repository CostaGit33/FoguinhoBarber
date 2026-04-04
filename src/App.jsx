import { useState } from "react";

const assetBase = import.meta.env.BASE_URL;

const sections = [
  { id: "home", label: "Inicio" },
  { id: "servicos", label: "Servicos" },
  { id: "profissionais", label: "Profissionais" },
  { id: "agendamento", label: "Agendar" },
  { id: "contato", label: "Contato" }
];

const services = [
  { name: "Corte", meta: "R$45 - duracao media de 30 minutos" },
  { name: "Barba", meta: "R$40 - duracao media de 30 minutos" },
  { name: "Cabelo + Barba", meta: "R$80 - duracao media de 60 minutos" },
  { name: "Combo Completo", meta: "R$90 - atendimento completo" },
  { name: "Corte Feminino", meta: "R$60 - finalizacao com atencao aos detalhes" },
  { name: "Corte Infantil", meta: "R$45 - cuidado e conforto para os pequenos" }
];

const professionals = [
  {
    name: "Romulo",
    role: "Barbeiro",
    image: `${assetBase}foguinho10.jpeg`,
    highlight: "Presenca forte, estilo marcante e assinatura da casa.",
    spotlightTitle: "Identidade forte",
    spotlightMeta: "Visual limpo, contraste alto e foco total no que importa."
  },
  {
    name: "Taz",
    role: "Barbeiro",
    image: `${assetBase}foguinho20.jpeg`,
    highlight: "Corte bem resolvido, atendimento leve e experiencia sem enrolacao.",
    spotlightTitle: "Barba, cabelo e resenha",
    spotlightMeta: "Atendimento que mistura tecnica, conforto e conversa boa na cadeira."
  },
  {
    name: "Lucas",
    role: "Barbeiro",
    image: `${assetBase}foguinho3.jpeg`,
    highlight: "Leitura de estilo e execucao cuidadosa em cada detalhe.",
    spotlightTitle: "Agendamento mais rapido 🔥",
    spotlightMeta: "A foto do barbeiro ja leva voce para marcar sem perder tempo."
  }
];

const today = new Date().toISOString().split("T")[0];

function SectionTitle({ id, children }) {
  return (
    <div className="section-heading">
      <img className="section-logo" src={`${assetBase}logo.png`} alt="Logo da Foguinho Barber" />
      <h2 id={id}>{children}</h2>
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    servico: "",
    profissional: "",
    data: "",
    hora: ""
  });
  const [status, setStatus] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function startBooking(professionalName) {
    setFormData((current) => ({ ...current, profissional: professionalName }));
    setStatus(`Profissional selecionado: ${professionalName}. Complete os campos para agendar.`);
    setActiveSection("agendamento");
    setIsMobileMenuOpen(false);
  }

  function startServiceBooking(serviceName) {
    setFormData((current) => ({ ...current, servico: serviceName }));
    setStatus(`Servico selecionado: ${serviceName}. Escolha o profissional e finalize o horario.`);
    setActiveSection("agendamento");
    setIsMobileMenuOpen(false);
  }

  function changeSection(sectionId) {
    setActiveSection(sectionId);
    setIsMobileMenuOpen(false);
  }

  const selectedProfessional = professionals.find(
    (professional) => professional.name === formData.profissional
  );

  function handleSubmit(event) {
    event.preventDefault();

    const { nome, servico, profissional, data, hora } = formData;
    if (!nome.trim() || !servico || !profissional || !data || !hora) {
      setStatus("Preencha todos os campos antes de continuar.");
      return;
    }

    const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date(`${data}T00:00:00`));

    const mensagem = [
      `Ola, meu nome e ${nome.trim()}.`,
      "Quero agendar:",
      "",
      `Servico: ${servico}`,
      `Profissional: ${profissional}`,
      `Data: ${dataFormatada}`,
      `Horario: ${hora}`
    ].join("\n");

    const url = `https://wa.me/5524998747229?text=${encodeURIComponent(mensagem)}`;
    setStatus("Abrindo WhatsApp para finalizar o agendamento 🔥");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src={`${assetBase}logo.png`} alt="Logo da Foguinho Barber" />
          <span>Foguinho Barber 🔥</span>
        </div>
        <button
          className="mobile-menu-toggle"
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="main-navigation"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          Menu
        </button>
        <nav
          id="main-navigation"
          className={`nav ${isMobileMenuOpen ? "nav-open" : ""}`}
          aria-label="Navegacao principal"
        >
          {sections.map((section) => (
            <button
              key={section.id}
              className="nav-button"
              type="button"
              onClick={() => changeSection(section.id)}
              aria-current={activeSection === section.id ? "page" : undefined}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="page">
        <section
          id="home"
          className={`section ${activeSection === "home" ? "active" : ""}`}
          aria-labelledby="home-title"
          aria-hidden={activeSection !== "home"}
        >
          <div className="hero">
            <div className="hero-header">
              <div className="hero-copy">
                <span className="eyebrow">💈Barba, Cabelo e Resenha</span>
                <h1 id="home-title">Corte na regua, barba alinhada e presenca que fala antes de voce.</h1>
                <p className="lead">
                  A home agora coloca a equipe no centro da experiencia. Veja o estilo de cada
                  profissional e toque na foto para iniciar o agendamento.
                </p>
                <div className="hero-actions">
                  <button className="btn hero-primary" type="button" onClick={() => changeSection("agendamento")}>
                    Agendar agora 🔥
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => changeSection("profissionais")}
                  >
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
                  onClick={() => startBooking(professional.name)}
                  aria-label={`Agendar com ${professional.name}`}
                >
                  <img
                    className="featured-professional-photo"
                    src={professional.image}
                    alt={`Profissional ${professional.name}`}
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
                    onClick={() => startServiceBooking(service.name)}
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

        <section
          id="servicos"
          className={`section ${activeSection === "servicos" ? "active" : ""}`}
          aria-labelledby="servicos-title"
          aria-hidden={activeSection !== "servicos"}
        >
          <SectionTitle id="servicos-title">Servicos</SectionTitle>
          <div className="chip-row services-chip-row" aria-label="Escolha rapida de servicos">
            {services.map((service) => (
              <button
                key={service.name}
                type="button"
                className={`chip-button ${formData.servico === service.name ? "chip-active" : ""}`}
                onClick={() => startServiceBooking(service.name)}
              >
                {service.name}
              </button>
            ))}
          </div>
          <ul className="list" aria-label="Lista de servicos">
            {services.map((service) => (
              <li key={service.name} className="card">
                <strong>{service.name}</strong>
                <span className="meta">{service.meta}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="profissionais"
          className={`section ${activeSection === "profissionais" ? "active" : ""}`}
          aria-labelledby="profissionais-title"
          aria-hidden={activeSection !== "profissionais"}
        >
          <SectionTitle id="profissionais-title">Profissionais</SectionTitle>
          <div className="professionals-grid" aria-label="Equipe da barbearia">
            {professionals.map((professional) => (
              <article key={professional.name} className="card professional-card">
                <button
                  type="button"
                  className="professional-booking-button"
                  onClick={() => startBooking(professional.name)}
                >
                  <img
                    className="professional-photo"
                    src={professional.image}
                    alt={`Profissional ${professional.name}`}
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

        <section
          id="agendamento"
          className={`section ${activeSection === "agendamento" ? "active" : ""}`}
          aria-labelledby="agendamento-title"
          aria-hidden={activeSection !== "agendamento"}
        >
          <SectionTitle id="agendamento-title">Agendamento</SectionTitle>
          <form className="form-card" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="booking-steps" aria-label="Etapas do agendamento">
                <span className={`step-pill ${formData.profissional ? "step-done" : ""}`}>
                  1. Profissional
                </span>
                <span className={`step-pill ${formData.servico ? "step-done" : ""}`}>2. Servico</span>
                <span className={`step-pill ${formData.data && formData.hora ? "step-done" : ""}`}>
                  3. Horario
                </span>
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
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="servico">Servico</label>
                <select
                  id="servico"
                  name="servico"
                  value={formData.servico}
                  onChange={handleChange}
                  required
                >
                  <option value="">Escolha o servico</option>
                  {services.map((service) => (
                    <option key={service.name} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
                <div className="chip-row inline-chip-row" aria-label="Servicos sugeridos">
                  {services.slice(0, 4).map((service) => (
                    <button
                      key={service.name}
                      type="button"
                      className={`chip-button small-chip ${formData.servico === service.name ? "chip-active" : ""}`}
                      onClick={() => startServiceBooking(service.name)}
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
                  onChange={handleChange}
                  required
                >
                  <option value="">Escolha o profissional</option>
                  {professionals.map((professional) => (
                    <option key={professional.name} value={professional.name}>
                      {professional.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="data">Data</label>
                <input
                  type="date"
                  id="data"
                  name="data"
                  min={today}
                  value={formData.data}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="hora">Horario</label>
                <input
                  type="time"
                  id="hora"
                  name="hora"
                  value={formData.hora}
                  onChange={handleChange}
                  required
                />
              </div>

              <button className="btn" type="submit">
                Confirmar agendamento
              </button>
              <p className="hint">
                Ao confirmar, abriremos o WhatsApp com a mensagem pronta para envio.
              </p>
              <p className="status" aria-live="polite">
                {status}
              </p>
            </div>
          </form>
        </section>

        <section
          id="contato"
          className={`section ${activeSection === "contato" ? "active" : ""}`}
          aria-labelledby="contato-title"
          aria-hidden={activeSection !== "contato"}
        >
          <SectionTitle id="contato-title">Contato</SectionTitle>
          <div className="contact-list">
            <div className="contact-item">
              <strong>Endereco</strong>
              <a
                className="contact-link"
                href="https://maps.google.com/?q=Avenida%20Paulino%20Mendes%20Lima%20232%2C%20Centro%2C%20Eun%C3%A1polis%20BA"
                target="_blank"
                rel="noreferrer"
              >
                Avenida Paulino Mendes Lima, 232, Centro, Eunapolis/BA
              </a>
              <img className="location-photo" src={`${assetBase}faixada.png`} alt="Fachada da Foguinho Barber" />
            </div>

            <div className="contact-item">
              <strong>Telefone</strong>
              <a className="contact-link" href="tel:+5524998747229">
                24 998747229
              </a>
            </div>

            <div className="contact-item">
              <strong>Horarios</strong>
              <span className="meta">Segunda a quinta: 08h as 19h</span>
              <br />
              <span className="meta">Sexta: 08h as 20h</span>
              <br />
              <span className="meta">Sabado: 08h as 18h</span>
            </div>
          </div>
        </section>
      </main>

      {formData.profissional && activeSection !== "agendamento" ? (
        <div className="booking-shortcut">
          <div>
            <strong>{formData.profissional}</strong>
            <span>Selecao pronta para continuar</span>
          </div>
          <button className="btn booking-shortcut-button" type="button" onClick={() => changeSection("agendamento")}>
            Continuar
          </button>
        </div>
      ) : null}
    </>
  );
}
