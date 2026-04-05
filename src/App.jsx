import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { business, professionals, services, weeklySchedule } from "./data";
import {
  formatCurrency,
  formatDate,
  getAvailableSlots,
  getDaySchedule,
  loadLastService,
  saveLastService,
  sortBookings
} from "./booking";
import { loadFavorites, loadNotifications, loadSettings, saveFavorites, saveNotifications, saveSettings } from "./auth";
import { clearApiSession, loadApiSession, saveApiSession } from "./session";
import { serverApi } from "./serverApi";
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

const sectionRoutes = {
  home: "/",
  servicos: "/servicos",
  profissionais: "/profissionais",
  agendamento: "/agendar",
  contato: "/contato",
  conta: "/conta",
  login: "/login",
  admin: "/admin"
};

const authRouteMap = {
  login: "/login",
  register: "/cadastro",
  recover: "/recuperar-senha"
};

const accountRouteMap = {
  profile: "/conta",
  upcoming: "/meus-agendamentos",
  history: "/historico",
  favorites: "/favoritos"
};

const adminRouteMap = {
  dashboard: "/admin",
  schedule: "/admin/agenda",
  clients: "/admin/clientes",
  professionals: "/admin/profissionais",
  services: "/admin/servicos",
  notifications: "/admin/notificacoes",
  settings: "/admin/configuracoes"
};

function normalizeDate(value) {
  if (!value) {
    return "";
  }

  return typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
}

function normalizeTime(value) {
  if (!value) {
    return "";
  }

  return typeof value === "string" ? value.slice(0, 5) : "";
}

function mapUser(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    role: record.role,
    createdAt: record.created_at ?? record.createdAt ?? new Date().toISOString()
  };
}

function mapBooking(record) {
  return {
    id: record.id,
    userId: record.user_id ?? record.userId ?? null,
    userEmail: record.customer_email ?? record.userEmail ?? null,
    name: record.customer_name ?? record.customerName ?? "",
    phone: record.customer_phone ?? record.customerPhone ?? "",
    service: record.service_name ?? record.serviceName ?? "",
    price: Number(record.service_price ?? record.servicePrice ?? 0),
    duration: Number(record.service_duration ?? record.serviceDuration ?? 0),
    professional: record.professional_name ?? record.professionalName ?? "",
    date: normalizeDate(record.booking_date ?? record.bookingDate),
    time: normalizeTime(record.booking_time ?? record.bookingTime),
    status: record.status ?? "scheduled",
    createdAt: record.created_at ?? record.createdAt ?? new Date().toISOString()
  };
}

function buildWhatsappMessage(booking) {
  return [
    `Ola, meu nome e ${booking.name}.`,
    "Quero confirmar este agendamento:",
    "",
    `Servico: ${booking.service}`,
    `Valor: ${formatCurrency(booking.price)}`,
    `Duracao: ${booking.duration} min`,
    `Profissional: ${booking.professional}`,
    `Data: ${formatDate(booking.date)}`,
    `Horario: ${booking.time}`
  ].join("\n");
}

function ProtectedRoute({ currentUser, adminOnly = false, children }) {
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && currentUser.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const savedSession = useMemo(() => loadApiSession(), []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [token, setToken] = useState(savedSession?.token ?? "");
  const [currentUser, setCurrentUser] = useState(() => mapUser(savedSession?.user));
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [availabilityBookings, setAvailabilityBookings] = useState([]);
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [notifications, setNotifications] = useState(() => loadNotifications());
  const [settings, setSettings] = useState(() => loadSettings());
  const [formData, setFormData] = useState(() => ({
    nome: savedSession?.user?.name ?? "",
    servico: loadLastService(),
    profissional: "",
    data: "",
    hora: ""
  }));
  const [status, setStatus] = useState("");
  const [authForm, setAuthForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [profileForm, setProfileForm] = useState(() => ({
    name: savedSession?.user?.name ?? "",
    email: savedSession?.user?.email ?? "",
    phone: savedSession?.user?.phone ?? ""
  }));
  const [accountMessage, setAccountMessage] = useState("");
  const [isSessionLoading, setIsSessionLoading] = useState(Boolean(savedSession?.token));
  const [apiStatus, setApiStatus] = useState("checking");
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstallBannerVisible, setIsInstallBannerVisible] = useState(false);

  const pathname = location.pathname;
  const authView =
    pathname === "/cadastro" ? "register" : pathname === "/recuperar-senha" ? "recover" : "login";
  const accountView =
    pathname === "/meus-agendamentos"
      ? "upcoming"
      : pathname === "/historico"
        ? "history"
        : pathname === "/favoritos"
          ? "favorites"
          : "profile";
  const adminView =
    pathname === "/admin/agenda"
      ? "schedule"
      : pathname === "/admin/clientes"
        ? "clients"
        : pathname === "/admin/profissionais"
          ? "professionals"
          : pathname === "/admin/servicos"
            ? "services"
            : pathname === "/admin/notificacoes"
              ? "notifications"
              : pathname === "/admin/configuracoes"
                ? "settings"
                : "dashboard";

  const selectedProfessional = professionals.find((professional) => professional.name === formData.profissional);
  const selectedService = services.find((service) => service.name === formData.servico);
  const selectedDaySchedule = getDaySchedule(formData.data);
  const availableSlots = useMemo(
    () =>
      getAvailableSlots({
        date: formData.data,
        service: selectedService,
        professional: formData.profissional,
        bookings: availabilityBookings
      }),
    [availabilityBookings, formData.data, formData.profissional, selectedService]
  );

  const scheduledBookings = useMemo(
    () => sortBookings(bookings).filter((booking) => booking.status === "scheduled"),
    [bookings]
  );

  const accountBookings = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    if (currentUser.role !== "admin") {
      return bookings;
    }

    return bookings.filter(
      (booking) => booking.userId === currentUser.id || booking.userEmail === currentUser.email
    );
  }, [bookings, currentUser]);

  const favoriteProfessionals = currentUser ? favorites[currentUser.id] ?? [] : [];

  const navSections = useMemo(() => {
    const sections = [
      { to: "/", label: "Inicio" },
      { to: "/servicos", label: "Servicos" },
      { to: "/profissionais", label: "Profissionais" },
      { to: "/agendar", label: "Agendar" },
      { to: "/contato", label: "Contato" }
    ];

    if (currentUser) {
      sections.push({ to: "/meus-agendamentos", label: "Agenda" });
      sections.push({ to: "/conta", label: "Conta" });
      if (currentUser.role === "admin") {
        sections.push({ to: "/admin", label: "Admin" });
      }
    }

    return sections.map((section) => ({
      ...section,
      onClick: () => setIsMobileMenuOpen(false)
    }));
  }, [currentUser]);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

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
    let isCancelled = false;

    async function checkApiHealth() {
      try {
        await serverApi.health();
        if (!isCancelled) {
          setApiStatus("online");
        }
      } catch {
        if (!isCancelled) {
          setApiStatus("offline");
        }
      }
    }

    checkApiHealth();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function syncSession() {
      if (!token) {
        clearApiSession();
        setCurrentUser(null);
        setBookings([]);
        setUsers([]);
        setIsSessionLoading(false);
        return;
      }

      setIsSessionLoading(true);

      try {
        const meResponse = await serverApi.me(token);
        if (!isCancelled) {
          setApiStatus("online");
        }
        const nextUser = mapUser(meResponse.user);
        if (isCancelled) {
          return;
        }

        setCurrentUser(nextUser);
        saveApiSession({ token, user: nextUser });

        const bookingsResponse = await serverApi.listBookings(token);
        if (isCancelled) {
          return;
        }

        setBookings(sortBookings(bookingsResponse.bookings.map(mapBooking)));

        if (nextUser.role === "admin") {
          const usersResponse = await serverApi.adminUsers(token);
          if (isCancelled) {
            return;
          }

          setUsers(usersResponse.users.map(mapUser));
        } else {
          setUsers([]);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setApiStatus("offline");
        clearApiSession();
        setToken("");
        setCurrentUser(null);
        setBookings([]);
        setUsers([]);
        setStatus(error.message || "Sua sessao expirou. Entre novamente.");
      } finally {
        if (!isCancelled) {
          setIsSessionLoading(false);
        }
      }
    }

    syncSession();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAvailability() {
      if (!formData.data || !formData.profissional) {
        setAvailabilityBookings([]);
        return;
      }

      try {
        const response = await serverApi.availability({
          date: formData.data,
          professional: formData.profissional
        });
        if (!isCancelled) {
          setApiStatus("online");
          setAvailabilityBookings(response.bookings.map(mapBooking));
        }
      } catch {
        if (!isCancelled) {
          setApiStatus("offline");
          setAvailabilityBookings([]);
        }
      }
    }

    loadAvailability();

    return () => {
      isCancelled = true;
    };
  }, [formData.data, formData.profissional]);

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

  function goToSection(sectionId) {
    navigate(sectionRoutes[sectionId] ?? "/");
    setIsMobileMenuOpen(false);
  }

  function setAuthRoute(nextView) {
    navigate(authRouteMap[nextView] ?? "/login");
  }

  function setAccountRoute(nextView) {
    navigate(accountRouteMap[nextView] ?? "/conta");
  }

  function setAdminRoute(nextView) {
    navigate(adminRouteMap[nextView] ?? "/admin");
  }

  function handleFormChange(event) {
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
    navigate("/agendar");
  }

  function startServiceBooking(serviceName) {
    const selected = services.find((service) => service.name === serviceName);
    setFormData((current) => ({ ...current, servico: serviceName, hora: "" }));
    setStatus(
      `Servico selecionado: ${serviceName}${selected ? ` por ${formatCurrency(selected.price)}` : ""}. Escolha um profissional para continuar.`
    );
    navigate("/agendar");
  }

  function selectSlot(time) {
    setFormData((current) => ({ ...current, hora: time }));
    setStatus(`Horario ${time} reservado no formulario. Falta so confirmar.`);
  }

  async function refreshBookings(sessionToken = token) {
    if (!sessionToken) {
      setBookings([]);
      return [];
    }

    const response = await serverApi.listBookings(sessionToken);
    const mapped = sortBookings(response.bookings.map(mapBooking));
    setBookings(mapped);
    return mapped;
  }

  async function refreshAdminUsers(sessionToken = token, role = currentUser?.role) {
    if (!sessionToken || role !== "admin") {
      setUsers([]);
      return [];
    }

    const response = await serverApi.adminUsers(sessionToken);
    const mapped = response.users.map(mapUser);
    setUsers(mapped);
    return mapped;
  }

  async function handleCancelBooking(bookingId) {
    if (!token) {
      return;
    }

    try {
      await serverApi.cancelBooking(token, bookingId);
      await refreshBookings(token);
      if (formData.data && formData.profissional) {
        const response = await serverApi.availability({
          date: formData.data,
          professional: formData.profissional
        });
        setAvailabilityBookings(response.bookings.map(mapBooking));
      }
      setStatus("Agendamento cancelado com sucesso.");
    } catch (error) {
      setStatus(error.message || "Nao foi possivel cancelar o agendamento.");
    }
  }

  function toggleFavorite(professionalName) {
    if (!currentUser) {
      setAuthMessage("Entre na sua conta para salvar profissionais favoritos.");
      navigate("/login", { state: { from: "/favoritos" } });
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

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (authView === "recover") {
      setAuthMessage("A recuperacao automatica ainda sera integrada. Fale com a barbearia pelo WhatsApp para suporte.");
      return;
    }

    try {
      const response =
        authView === "login"
          ? await serverApi.login({ email: authForm.email, password: authForm.password })
          : await serverApi.register({
              name: authForm.name,
              email: authForm.email,
              phone: authForm.phone,
              password: authForm.password
            });

      const nextUser = mapUser(response.user);
      saveApiSession({ token: response.token, user: nextUser });
      setToken(response.token);
      setCurrentUser(nextUser);
      setAuthForm({ name: "", email: "", phone: "", password: "" });
      setAuthMessage(authView === "login" ? "Login realizado com sucesso." : "Conta criada com sucesso.");

      if (authView === "register") {
        pushNotification("Novo cliente cadastrado", `${nextUser.name} criou uma conta no app.`);
      }

      await refreshBookings(response.token);
      await refreshAdminUsers(response.token, nextUser.role);
      navigate(location.state?.from ?? (nextUser.role === "admin" ? "/admin" : "/conta"), { replace: true });
    } catch (error) {
      setAuthMessage(error.message || "Nao foi possivel concluir o acesso.");
    }
  }

  function handleLogout() {
    clearApiSession();
    setToken("");
    setCurrentUser(null);
    setBookings([]);
    setUsers([]);
    setAccountMessage("");
    setAuthMessage("");
    setIsMobileMenuOpen(false);
    navigate("/");
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    if (!token) {
      return;
    }

    try {
      const response = await serverApi.updateProfile(token, profileForm);
      const nextUser = mapUser(response.user);
      setCurrentUser(nextUser);
      saveApiSession({ token, user: nextUser });
      setAccountMessage("Perfil atualizado com sucesso.");
      await refreshAdminUsers(token, nextUser.role);
    } catch (error) {
      setAccountMessage(error.message || "Nao foi possivel atualizar o perfil.");
    }
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

  async function handleBookingSubmit(event) {
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

    if (!currentUser || !token) {
      setStatus("Entre na sua conta para confirmar o agendamento.");
      navigate("/login", { state: { from: "/agendar" } });
      return;
    }

    const slot = availableSlots.find((item) => item.time === hora);
    if (!slot?.available) {
      setStatus("Esse horario ja foi ocupado ou nao esta disponivel para o servico escolhido.");
      return;
    }

    try {
      const response = await serverApi.createBooking(token, {
        customerName: nome.trim(),
        customerPhone: currentUser.phone,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        serviceDuration: selectedService.duration,
        professionalName: selectedProfessional.name,
        bookingDate: data,
        bookingTime: hora
      });

      const booking = mapBooking(response.booking);
      await refreshBookings(token);
      const availabilityResponse = await serverApi.availability({
        date: booking.date,
        professional: booking.professional
      });
      setAvailabilityBookings(availabilityResponse.bookings.map(mapBooking));
      pushNotification(
        "Novo agendamento",
        `${booking.name} marcou ${booking.service} com ${booking.professional} para ${formatDate(booking.date)}.`
      );

      window.open(
        `${business.whatsapp}?text=${encodeURIComponent(buildWhatsappMessage(booking))}`,
        "_blank",
        "noopener,noreferrer"
      );

      setFormData((current) => ({
        ...current,
        data: "",
        hora: ""
      }));
      setStatus("Agendamento salvo na agenda da barbearia e WhatsApp aberto para confirmacao.");
      navigate("/meus-agendamentos");
    } catch (error) {
      setStatus(error.message || "Nao foi possivel confirmar o agendamento.");
    }
  }

  const bookingProps = {
    active: true,
    business,
    formData,
    status,
    today,
    services,
    professionals,
    selectedProfessional,
    selectedService,
    selectedDaySchedule,
    availableSlots,
    bookings: accountBookings.filter((booking) => booking.status === "scheduled"),
    onChange: handleFormChange,
    onSubmit: handleBookingSubmit,
    onSelectService: startServiceBooking,
    onSelectProfessional: startBooking,
    onSelectSlot: selectSlot,
    onCancelBooking: handleCancelBooking
  };

  const accountSectionElement = (
    <AccountSection
      active
      business={business}
      currentUser={currentUser}
      accountView={accountView}
      profileForm={profileForm}
      accountMessage={accountMessage}
      upcomingBookings={accountBookings.filter((booking) => booking.status === "scheduled")}
      allBookings={accountBookings}
      favoriteProfessionals={favoriteProfessionals}
      professionals={professionals}
      onTabChange={setAccountRoute}
      onProfileChange={handleProfileChange}
      onProfileSubmit={handleProfileSubmit}
      onCancelBooking={handleCancelBooking}
      onSelectProfessional={startBooking}
    />
  );

  const adminSectionElement = (
    <AdminSection
      active
      business={business}
      adminView={adminView}
      bookings={scheduledBookings}
      users={users}
      professionals={professionals}
      services={services}
      notifications={notifications}
      settings={settings}
      onTabChange={setAdminRoute}
      onSettingsChange={handleSettingsChange}
    />
  );

  return (
    <>
      <Header
        business={business}
        sections={navSections}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMenu={() => setIsMobileMenuOpen((current) => !current)}
        currentUser={currentUser}
        onCloseMenu={() => setIsMobileMenuOpen(false)}
        onLogout={handleLogout}
      />

      <main className="page">
        {isInstallBannerVisible && installPromptEvent ? (
          <section className="install-banner" aria-label="Instalar aplicativo">
            <div>
              <p className="install-banner-kicker">Atalho no celular</p>
              <strong>Instale a Barbearia do Foguinho como app</strong>
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

        {apiStatus === "offline" ? (
          <section className="card route-status-card route-status-alert" aria-live="polite">
            <strong>Estamos com dificuldade para falar com a agenda online agora.</strong>
            <p className="meta">
              Se voce estiver vendo uma versao antiga do app no celular, feche e abra de novo para forcar
              a atualizacao. Se continuar, limpe o cache do app instalado.
            </p>
          </section>
        ) : null}

        {isSessionLoading ? (
          <section className="section active" aria-live="polite">
            <div className="card route-status-card">
              <strong>Sincronizando sua conta...</strong>
              <p className="meta">Estamos conectando sua sessao com a API da barbearia.</p>
            </div>
          </section>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <HomeSection
                  active
                  professionals={professionals}
                  services={services}
                  onSelectProfessional={startBooking}
                  onSelectService={startServiceBooking}
                  onChangeSection={goToSection}
                />
              }
            />
            <Route
              path="/servicos"
              element={
                <ServicesSection
                  active
                  business={business}
                  services={services}
                  selectedServiceName={formData.servico}
                  onSelectService={startServiceBooking}
                />
              }
            />
            <Route
              path="/profissionais"
              element={
                <ProfessionalsSection
                  active
                  business={business}
                  professionals={professionals}
                  favorites={favoriteProfessionals}
                  onSelectProfessional={startBooking}
                  onToggleFavorite={toggleFavorite}
                />
              }
            />
            <Route path="/agendar" element={<BookingSection {...bookingProps} />} />
            <Route
              path="/contato"
              element={<ContactSection active business={business} weeklySchedule={weeklySchedule} />}
            />
            <Route
              path="/login"
              element={
                <AuthSection
                  active
                  business={business}
                  authView={authView}
                  authForm={authForm}
                  authMessage={authMessage}
                  onTabChange={setAuthRoute}
                  onChange={handleAuthChange}
                  onSubmit={handleAuthSubmit}
                />
              }
            />
            <Route
              path="/cadastro"
              element={
                <AuthSection
                  active
                  business={business}
                  authView={authView}
                  authForm={authForm}
                  authMessage={authMessage}
                  onTabChange={setAuthRoute}
                  onChange={handleAuthChange}
                  onSubmit={handleAuthSubmit}
                />
              }
            />
            <Route
              path="/recuperar-senha"
              element={
                <AuthSection
                  active
                  business={business}
                  authView={authView}
                  authForm={authForm}
                  authMessage={authMessage}
                  onTabChange={setAuthRoute}
                  onChange={handleAuthChange}
                  onSubmit={handleAuthSubmit}
                />
              }
            />
            {Object.values(accountRouteMap).map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute currentUser={currentUser}>{accountSectionElement}</ProtectedRoute>}
              />
            ))}
            {Object.values(adminRouteMap).map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute currentUser={currentUser} adminOnly>
                    {adminSectionElement}
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>

      {formData.profissional && pathname !== "/agendar" ? (
        <div className="booking-shortcut">
          <div>
            <strong>{formData.profissional}</strong>
            <span>
              {selectedService
                ? `${selectedService.name} por ${formatCurrency(selectedService.price)}`
                : "Selecao pronta para continuar"}
            </span>
          </div>
          <button className="btn booking-shortcut-button" type="button" onClick={() => navigate("/agendar")}>
            Continuar
          </button>
        </div>
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
