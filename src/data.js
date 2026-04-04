export const assetBase = import.meta.env.BASE_URL;

export const sections = [
  { id: "home", label: "Inicio" },
  { id: "servicos", label: "Servicos" },
  { id: "profissionais", label: "Profissionais" },
  { id: "agendamento", label: "Agendar" },
  { id: "contato", label: "Contato" }
];

export const services = [
  {
    name: "Corte",
    price: 45,
    duration: 30,
    meta: "Corte classico ou moderno com acabamento na medida certa."
  },
  {
    name: "Barba",
    price: 40,
    duration: 30,
    meta: "Barba alinhada com desenho limpo e cuidado no acabamento."
  },
  {
    name: "Cabelo + Barba",
    price: 80,
    duration: 60,
    meta: "Pacote completo para sair pronto sem perder tempo."
  },
  {
    name: "Combo Completo",
    price: 90,
    duration: 75,
    meta: "Experiencia completa com mais tempo de cadeira e finalizacao."
  },
  {
    name: "Corte Feminino",
    price: 60,
    duration: 50,
    meta: "Corte com finalizacao pensada para valorizar o estilo."
  },
  {
    name: "Corte Infantil",
    price: 45,
    duration: 30,
    meta: "Atendimento com paciencia, cuidado e conforto para os pequenos."
  }
];

export const professionals = [
  {
    name: "Foguinho",
    role: "Barbeiro",
    image: `${assetBase}foguinho.jpeg`,
    highlight: "Presenca forte, estilo marcante e assinatura da casa.",
    spotlightTitle: "Identidade forte",
    spotlightMeta: "Visual limpo, contraste alto e foco total no que importa."
  },
  {
    name: "Miguel",
    role: "Barbeiro",
    image: `${assetBase}miguel.jpeg`,
    highlight: "Corte bem resolvido, atendimento leve e experiencia sem enrolacao.",
    spotlightTitle: "Barba, cabelo e resenha",
    spotlightMeta: "Atendimento que mistura tecnica, conforto e conversa boa na cadeira."
  },
  {
    name: "Pedro Lucas",
    role: "Barbeiro",
    image: `${assetBase}pedrolucas.jpeg`,
    highlight: "Leitura de estilo e execucao cuidadosa em cada detalhe.",
    spotlightTitle: "Agendamento rapido",
    spotlightMeta: "A foto do barbeiro ja leva voce para marcar sem perder tempo."
  },
  {
    name: "Henri",
    role: "Barbeiro",
    image: `${assetBase}henri.jpeg`,
    highlight: "Atendimento atento, visual alinhado e acabamento feito com capricho.",
    spotlightTitle: "Estilo com precisao",
    spotlightMeta: "Cortes bem definidos com foco no detalhe e na experiencia do cliente."
  },
  {
    name: "Anderson",
    role: "Barbeiro",
    image: `${assetBase}anderson.jpeg`,
    highlight: "Presenca leve, execucao consistente e corte pensado para o seu estilo.",
    spotlightTitle: "Presenca na medida",
    spotlightMeta: "Uma cadeira para quem quer praticidade sem abrir mao de qualidade."
  },
  {
    name: "Kevson",
    role: "Barbeiro",
    image: `${assetBase}kevson.jpeg`,
    highlight: "Cortes modernos, acabamento limpo e leitura rapida do que combina com voce.",
    spotlightTitle: "Visual atualizado",
    spotlightMeta: "Opcoes para quem quer renovar o visual e sair pronto para qualquer ocasiao."
  }
];

export const weeklySchedule = {
  0: null,
  1: { label: "Segunda-Feira", open: "08:00", close: "19:00" },
  2: { label: "Terca-Feira", open: "08:00", close: "19:00" },
  3: { label: "Quarta-Feira", open: "08:00", close: "19:00" },
  4: { label: "Quinta-Feira", open: "08:00", close: "19:00" },
  5: { label: "Sexta-Feira", open: "08:00", close: "20:00" },
  6: { label: "Sabado", open: "08:00", close: "18:00" }
};

export const business = {
  name: "Foguinho Barber",
  phone: "(24) 99874-7229",
  phoneLink: "tel:+5524998747229",
  whatsapp: "https://wa.me/5524998747229",
  address:
    "Avenida Paulino Mendes Lima, 232, Centro, Eunapolis/BA",
  mapsUrl:
    "https://maps.google.com/?q=Avenida%20Paulino%20Mendes%20Lima%20232%2C%20Centro%2C%20Eun%C3%A1polis%20BA",
  facadeImage: `${assetBase}faixada.png`,
  logo: `${assetBase}logo.png`
};

export const storageKeys = {
  bookings: "foguinho-barber-bookings",
  lastService: "foguinho-barber-last-service"
};
