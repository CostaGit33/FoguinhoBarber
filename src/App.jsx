import { useEffect, useMemo, useState } from "react";
import {
  business,
  professionals,
  sections as publicSections,
  services,
  weeklySchedule
} from "./data";
import {
  createBooking,
  formatCurrency,
  formatDate,
  getAvailableSlots,
  getDaySchedule,
  getUpcomingBookings,
  loadBookings,
  loadLastService,
  saveBookings,
  saveLastService,
  sortBookings
} from "./booking";
import {
  getCurrentUser,
  loadFavorites,
  loadNotifications,
  loadSettings,
  loadUsers,
  loginUser,
  logoutUser,
  recoverPassword,
  registerUser,
  saveFavorites,
  saveNotifications,
  saveSettings,
  updateUserProfile
} from "./auth";
import Header from "./components/Header";
import HomeSection from "./components/HomeSection";
import ServicesSection from "./components/ServicesSection";
import ProfessionalsSection from "./components/ProfessionalsSection";
import BookingSection from "./components/BookingSection";
import ContactSection from "./components/ContactSection";
import AuthSection from "./components/AuthSection";
import AccountSection from "./components/AccountSection";
import AdminSection from "./components/AdminSection";

const today = new Date().toISOString().split("T")[0];
const installPromptDismissKey = "foguinho-barber-install-dismissed";

export default function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bookings, setBookings] = useState(() => loadBookings());
  const [users, setUsers] = useState(() => loadUsers());
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [notifications, setNotifications] = useState(() => loadNotifications());
  const [settings, setSettings] = useState(() => loadSettings());
  const [formData, setFormData] = useState(() => ({
    nome: getCurrentUser()?.name ?? "",
    servico: loadLastService(),
    profissional: "",
    data: "",
    hora: ""
  }));
  const [status, setStatus] = useState("");
  const [authView, setAuthView] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [accountView, setAccountView] = useState("profile");
  const [profileForm, setProfileForm] = useState(() => ({
    name: currentUser?.name ?? "",
    email: currentUser?.email ?? "",
    phone: currentUser?.phone ?? ""
  }));
  const [accountMessage, setAccountMessage] = useState("");
  const [adminView, setAdminView] = useState("dashboard");
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

  const upcomingBookings = useMemo(
    () => getUpcomingBookings(bookings, currentUser),
    [bookings, currentUser]
  );

  const favoriteProfessionals = currentUser ? favorites[currentUser.id] ?? [] : [];

  const navSections = useMemo(() => {
    const nextSections = [...publicSections];

    if (currentUser) {
      nextSections.push({ id: "conta", label: "Minha area" });
      if (currentUser.role === "admin") {
        nextSections.push({ id: "admin", label: "Admin" });
      }
    } else {
      nextSections.push({ id: "login", label: "Login" });
    }

    return nextSections;
  }, [currentUser]);

  useEffect(() => {
    saveBookings(bookings);
  }, [bookings]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    if (formData.servico) {
      saveLastService(formData.servico);
    }
  }, [formData.servico]);

  useEffect(() => {
    if (currentUser) {
      setFormData((current) => ({ ...current, nome: currentUser.name }));
      setProfileForm({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone
      });
    }
  }, [currentUser]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPromptEvent(event);

      const dismissedAt = window.localStorage.getItem(installPromptDismissKey);
      if (!dismissedAt && settings.installBannerEnabled) {
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
  }, [settings.installBannerEnabled]);

  function pushNotification(title, message) {
    setNotifications((current) => [
      {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
        title,
        message,
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
  }

  function changeSection(sectionId) {
    setActiveSection(sectionId);
    setIsMobileMenuOpen(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => {
      if (name === "data" || name === "servico" || name === "profissional") {
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
    const booking = bookings.find((item) => item.id === bookingId);
    setBookings((current) => current.filter((item) => item.id !== bookingId));
    if (booking) {
      pushNotification("Agendamento cancelado", `${booking.name} cancelou ${booking.service} com ${booking.professional}.`);
    }
    setStatus("Agendamento removido do painel local.");
  }

  function toggleFavorite(professionalName) {
    if (!currentUser) {
      setAuthMessage("Entre na sua conta para salvar profissionais favoritos.");
      changeSection("login");
      return;
    }

    setFavorites((current) => {
      const currentFavorites = current[currentUser.id] ?? [];
      const exists = currentFavorites.includes(professionalName);
      const nextFavorites = exists
        ? currentFavorites.filter((name) => name !== professionalName)
        : [...currentFavorites, professionalName];

      return { ...current, [currentUser.id]: nextFavorites };
    });
  }

  function handleAuthChange(event) {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  }

  function handleAuthSubmit(event) {
    event.preventDefault();

    if (authView === "login") {
      const result = loginUser(authForm);
      if (!result.ok) {
        setAuthMessage(result.message);
        return;
      }

      setCurrentUser(result.user);
      setUsers(loadUsers());
      setAuthMessage("Login realizado com sucesso.");
      changeSection(result.user.role === "admin" ? "admin" : "conta");
      return;
    }

    if (authView === "register") {
      const result = registerUser(authForm);
      if (!result.ok) {
        setAuthMessage(result.message);
        return;
      }

      setCurrentUser(result.user);
      setUsers(loadUsers());
      pushNotification("Novo cliente cadastrado", `${result.user.name} criou uma conta no app.`);
      setAuthMessage("Conta criada com sucesso.");
      changeSection("conta");
      return;
    }

    const result = recoverPassword(authForm.email);
    setAuthMessage(result.message);
  }

  function handleLogout() {
    logoutUser();
    setCurrentUser(null);
    setAccountMessage("");
    changeSection("home");
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  function handleProfileSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
      return;
    }

    const updatedUser = updateUserProfile(currentUser.id, profileForm);
    setCurrentUser(updatedUser);
    setUsers(loadUsers());
    setAccountMessage("Perfil atualizado com sucesso.");
  }

  function handleSettingsChange(event) {
    const { name, type, checked, value } = event.target;
    setSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : Number(value)
    }));
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

    if (!settings.publicBookingEnabled && currentUser?.role !== "admin") {
      setStatus("Agendamentos publicos estao temporariamente desativados.");
      return;
    }

    const slot = availableSlots.find((item) => item.time === hora);
    if (!slot?.available) {
      setStatus("Esse horario ja foi ocupado ou nao esta disponivel para o servico escolhido.");
      return;
    }

    const booking = createBooking({ formData, selectedProfessional, selectedService, currentUser });
    const nextBookings = sortBookings([...bookings, booking]);
    setBookings(nextBookings);
    pushNotification(
      "Novo agendamento",
      `${booking.name} marcou ${booking.service} com ${booking.professional} para ${formatDate(booking.date)}.`
    );

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
        sections={navSections}
        activeSection={activeSection}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMenu={() => setIsMobileMenuOpen((current) => !current)}
        onChangeSection={changeSection}
        currentUser={currentUser}
        onAuthAction={() => changeSection("login")}
        onLogout={handleLogout}
      />

      <main className="page">
        {isInstallBannerVisible && installPromptEvent ? (
          <section className="install-banner" aria-label="Instalar aplicativo">
            <div>
              <p className="install-banner-kicker">Atalho no celular</p>
              <strong>Instale a Foguinho Barber como app</strong>
              <p className="meta">
                Abra mais rapido, use em tela cheia e tenha uma experiencia mais parecida com app nativo.
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
          favorites={favoriteProfessionals}
          onSelectProfessional={startBooking}
          onToggleFavorite={toggleFavorite}
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

        <AuthSection
          active={activeSection === "login"}
          business={business}
          authView={authView}
          authForm={authForm}
          authMessage={authMessage}
          onTabChange={setAuthView}
          onChange={handleAuthChange}
          onSubmit={handleAuthSubmit}
        />

        {currentUser ? (
          <AccountSection
            active={activeSection === "conta"}
            business={business}
            currentUser={currentUser}
            accountView={accountView}
            profileForm={profileForm}
            accountMessage={accountMessage}
            upcomingBookings={upcomingBookings}
            allBookings={bookings}
            favoriteProfessionals={favoriteProfessionals}
            professionals={professionals}
            onTabChange={setAccountView}
            onProfileChange={handleProfileChange}
            onProfileSubmit={handleProfileSubmit}
            onCancelBooking={cancelBooking}
            onSelectProfessional={startBooking}
          />
        ) : null}

        {currentUser?.role === "admin" ? (
          <AdminSection
            active={activeSection === "admin"}
            business={business}
            adminView={adminView}
            bookings={bookings}
            users={users}
            professionals={professionals}
            services={services}
            notifications={notifications}
            settings={settings}
            onTabChange={setAdminView}
            onSettingsChange={handleSettingsChange}
          />
        ) : null}
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
