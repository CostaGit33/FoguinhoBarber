import { useEffect, useState } from "react";
import {
  business,
  professionals,
  sections,
  services,
  weeklySchedule
} from "./data";
import {
  createBooking,
  formatCurrency,
  formatDate,
  getAvailableSlots,
  getDaySchedule,
  loadBookings,
  loadLastService,
  saveBookings,
  saveLastService,
  sortBookings
} from "./booking";
import Header from "./components/Header";
import HomeSection from "./components/HomeSection";
import ServicesSection from "./components/ServicesSection";
import ProfessionalsSection from "./components/ProfessionalsSection";
import BookingSection from "./components/BookingSection";
import ContactSection from "./components/ContactSection";

const today = new Date().toISOString().split("T")[0];
const installPromptDismissKey = "foguinho-barber-install-dismissed";

export default function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bookings, setBookings] = useState(() => loadBookings());
  const [formData, setFormData] = useState(() => ({
    nome: "",
    servico: loadLastService(),
    profissional: "",
    data: "",
    hora: ""
  }));
  const [status, setStatus] = useState("");
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstallBannerVisible, setIsInstallBannerVisible] = useState(false);

  const selectedProfessional = professionals.find(
    (professional) => professional.name === formData.profissional
  );
  const selectedService = services.find((service) => service.name === formData.servico);
  const selectedDaySchedule = getDaySchedule(formData.data);
  const availableSlots = getAvailableSlots({
    date: formData.data,
    service: selectedService,
    professional: formData.profissional,
    bookings
  });

  useEffect(() => {
    saveBookings(bookings);
  }, [bookings]);

  useEffect(() => {
    if (formData.servico) {
      saveLastService(formData.servico);
    }
  }, [formData.servico]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPromptEvent(event);

      const dismissedAt = window.localStorage.getItem(installPromptDismissKey);
      if (!dismissedAt) {
        setIsInstallBannerVisible(true);
      }
    }

    function handleAppInstalled() {
      setInstallPromptEvent(null);
      setIsInstallBannerVisible(false);
      window.localStorage.removeItem(installPromptDismissKey);
      setStatus("App instalado com sucesso no seu aparelho.");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function changeSection(sectionId) {
    setActiveSection(sectionId);
    setIsMobileMenuOpen(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => {
      if (name === "data") {
        return { ...current, data: value, hora: "" };
      }

      if (name === "servico" || name === "profissional") {
        return { ...current, [name]: value, hora: "" };
      }

      return { ...current, [name]: value };
    });
  }

  function startBooking(professionalName) {
    setFormData((current) => ({ ...current, profissional: professionalName, hora: "" }));
    setStatus(`Profissional selecionado: ${professionalName}. Agora escolha servico, dia e horario.`);
    changeSection("agendamento");
  }

  function startServiceBooking(serviceName) {
    const selected = services.find((service) => service.name === serviceName);
    setFormData((current) => ({ ...current, servico: serviceName, hora: "" }));
    setStatus(
      `Servico selecionado: ${serviceName}${selected ? ` por ${formatCurrency(selected.price)}` : ""}. Escolha um profissional para continuar.`
    );
    changeSection("agendamento");
  }

  function selectSlot(time) {
    setFormData((current) => ({ ...current, hora: time }));
    setStatus(`Horario ${time} reservado no formulario. Falta so confirmar pelo WhatsApp.`);
  }

  function cancelBooking(bookingId) {
    setBookings((current) => current.filter((booking) => booking.id !== bookingId));
    setStatus("Agendamento removido do painel local.");
  }

  function dismissInstallBanner() {
    window.localStorage.setItem(installPromptDismissKey, String(Date.now()));
    setIsInstallBannerVisible(false);
  }

  async function promptInstall() {
    if (!installPromptEvent) {
      return;
    }

    installPromptEvent.prompt();
    const result = await installPromptEvent.userChoice;

    if (result.outcome === "accepted") {
      setStatus("Instalacao iniciada. Confirme no seu navegador para concluir.");
    } else {
      setStatus("Tudo certo. Voce pode instalar o app quando quiser.");
    }

    setInstallPromptEvent(null);
    setIsInstallBannerVisible(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const { nome, servico, profissional, data, hora } = formData;
    if (!nome.trim() || !servico || !profissional || !data || !hora || !selectedService || !selectedProfessional) {
      setStatus("Preencha todos os campos antes de continuar.");
      return;
    }

    if (!selectedDaySchedule) {
      setStatus("Nao atendemos aos domingos. Escolha outro dia para agendar.");
      return;
    }

    const slot = availableSlots.find((item) => item.time === hora);
    if (!slot?.available) {
      setStatus("Esse horario ja foi ocupado ou nao esta disponivel para o servico escolhido.");
      return;
    }

    const booking = createBooking({ formData, selectedProfessional, selectedService });
    const nextBookings = sortBookings([...bookings, booking]);
    setBookings(nextBookings);

    const mensagem = [
      `Ola, meu nome e ${booking.name}.`,
      "Quero agendar:",
      "",
      `Servico: ${booking.service}`,
      `Valor: ${formatCurrency(booking.price)}`,
      `Duracao: ${booking.duration} min`,
      `Profissional: ${booking.professional}`,
      `Data: ${formatDate(booking.date)}`,
      `Horario: ${booking.time}`
    ].join("\n");

    const url = `${business.whatsapp}?text=${encodeURIComponent(mensagem)}`;
    setStatus("Agendamento salvo no painel local e WhatsApp aberto para confirmacao.");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Header
        business={business}
        sections={sections}
        activeSection={activeSection}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMenu={() => setIsMobileMenuOpen((current) => !current)}
        onChangeSection={changeSection}
      />

      <main className="page">
        {isInstallBannerVisible && installPromptEvent ? (
          <section className="install-banner" aria-label="Instalar aplicativo">
            <div>
              <p className="install-banner-kicker">Atalho no celular</p>
              <strong>Instale a Foguinho Barber como app</strong>
              <p className="meta">
                Abra mais rapido, use em tela cheia e tenha uma experiencia mais parecida com app
                nativo.
              </p>
            </div>
            <div className="install-banner-actions">
              <button className="btn install-banner-button" type="button" onClick={promptInstall}>
                Instalar app
              </button>
              <button className="chip-button" type="button" onClick={dismissInstallBanner}>
                Agora nao
              </button>
            </div>
          </section>
        ) : null}

        <HomeSection
          active={activeSection === "home"}
          professionals={professionals}
          services={services}
          onSelectProfessional={startBooking}
          onSelectService={startServiceBooking}
          onChangeSection={changeSection}
        />

        <ServicesSection
          active={activeSection === "servicos"}
          business={business}
          services={services}
          selectedServiceName={formData.servico}
          onSelectService={startServiceBooking}
        />

        <ProfessionalsSection
          active={activeSection === "profissionais"}
          business={business}
          professionals={professionals}
          onSelectProfessional={startBooking}
        />

        <BookingSection
          active={activeSection === "agendamento"}
          business={business}
          formData={formData}
          status={status}
          today={today}
          services={services}
          professionals={professionals}
          selectedProfessional={selectedProfessional}
          selectedService={selectedService}
          selectedDaySchedule={selectedDaySchedule}
          availableSlots={availableSlots}
          bookings={bookings}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onSelectService={startServiceBooking}
          onSelectProfessional={startBooking}
          onSelectSlot={selectSlot}
          onCancelBooking={cancelBooking}
        />

        <ContactSection
          active={activeSection === "contato"}
          business={business}
          weeklySchedule={weeklySchedule}
        />
      </main>

      {formData.profissional && activeSection !== "agendamento" ? (
        <div className="booking-shortcut">
          <div>
            <strong>{formData.profissional}</strong>
            <span>
              {selectedService
                ? `${selectedService.name} por ${formatCurrency(selectedService.price)}`
                : "Selecao pronta para continuar"}
            </span>
          </div>
          <button className="btn booking-shortcut-button" type="button" onClick={() => changeSection("agendamento")}>
            Continuar
          </button>
        </div>
      ) : null}
    </>
  );
}
