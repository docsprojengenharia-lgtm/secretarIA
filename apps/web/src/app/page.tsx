import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SecretarIA — A IA que atende seu negocio enquanto voce descansa",
  description:
    "Atendimento inteligente via WhatsApp fora do horario comercial. Tira duvidas, responde audios, agenda servicos e fideliza clientes. 7 dias gratis.",
  openGraph: {
    title: "SecretarIA — Atendimento WhatsApp com IA",
    description:
      "Sua secretaria virtual por WhatsApp. Atende fora do horario, agenda servicos, envia lembretes. Para clinicas, saloes, barbearias e mais.",
    type: "website",
  },
};

/* ─────────────────────────── SVG Icons ─────────────────────────── */

function IconWhatsApp({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconBrain({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7l3 3 3-3c2-1.5 4-4 4-7a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  );
}

function IconCalendar({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconBell({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconMic({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconFileText({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconStar({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconLock({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconBarChart({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function IconTarget({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconCheck({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconQrCode({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
      <rect x="2" y="14" width="8" height="8" rx="1" />
      <rect x="14" y="14" width="4" height="4" rx="0.5" />
      <line x1="22" y1="14" x2="22" y2="18" />
      <line x1="18" y1="22" x2="22" y2="22" />
      <rect x="5" y="5" width="2" height="2" />
      <rect x="17" y="5" width="2" height="2" />
      <rect x="5" y="17" width="2" height="2" />
    </svg>
  );
}

function IconDashboard({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="4" rx="1" />
      <rect x="14" y="10" width="7" height="11" rx="1" />
      <rect x="3" y="13" width="7" height="8" rx="1" />
    </svg>
  );
}

/* ─────────────────────────── Components ─────────────────────────── */

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Secretar<span className="text-primary">IA</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#funcionalidades" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Recursos
            </a>
            <a href="#precos" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Precos
            </a>
            <a href="#como-funciona" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Como funciona
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors px-3 py-2"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-white bg-primary hover:bg-green-600 transition-colors px-4 py-2 rounded-lg"
            >
              Comecar gratis
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Atendendo agora mesmo, fora do horario comercial
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
          A IA que atende seu negocio{" "}
          <span className="text-primary">enquanto voce descansa</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Atendimento inteligente via WhatsApp fora do horario comercial.
          Tira duvidas, responde audios, agenda servicos e fideliza clientes.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary hover:bg-green-600 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-colors shadow-lg shadow-green-500/25"
          >
            Testar gratis por 7 dias
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <a
            href="#como-funciona"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium text-lg px-8 py-4 rounded-xl transition-colors border border-gray-200"
          >
            Ver demonstracao
          </a>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Sem cartao de credito. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}

function Problema() {
  const problems = [
    {
      stat: "33%",
      text: "dos agendamentos acontecem fora do horario comercial",
      detail: "Seu negocio fecha, mas a demanda nao para. Cada mensagem sem resposta e um cliente que vai pro concorrente.",
    },
    {
      stat: "R$ 144 mil",
      text: "perdidos por ano com no-show e falta de follow-up",
      detail: "Sem lembrete automatico, 20-30% dos clientes faltam. Sem reativacao, eles simplesmente esquecem de voce.",
    },
    {
      stat: "90%",
      text: "dos clientes preferem WhatsApp, mas ninguem responde a noite",
      detail: "Seu cliente manda mensagem as 22h. Voce responde as 9h. Ele ja agendou com outro.",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Voce perde clientes enquanto dorme
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Enquanto voce descansa, seus clientes estao procurando atendimento. E encontrando no concorrente.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="text-4xl font-extrabold text-red-500 mb-2">
                {problem.stat}
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-3">
                {problem.text}
              </div>
              <p className="text-gray-600 leading-relaxed">
                {problem.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  const steps = [
    {
      number: "01",
      icon: <IconQrCode className="w-10 h-10 text-primary" />,
      title: "Conecte seu WhatsApp",
      description:
        "Escaneie um QR code e pronto. Em menos de 5 minutos seu WhatsApp esta conectado. Sem instalacao, sem complicacao.",
    },
    {
      number: "02",
      icon: <IconBrain className="w-10 h-10 text-primary" />,
      title: "A IA atende por voce",
      description:
        "Fora do horario comercial, a SecretarIA responde seus clientes com naturalidade. Tira duvidas, agenda servicos, envia lembretes e faz follow-up.",
    },
    {
      number: "03",
      icon: <IconDashboard className="w-10 h-10 text-primary" />,
      title: "Voce gerencia pelo dashboard",
      description:
        "De manha, veja tudo que aconteceu a noite. Aprove agendamentos, revise conversas e acompanhe resultados em tempo real.",
    },
  ];

  return (
    <section id="como-funciona" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Como funciona
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Tres passos simples para nunca mais perder um cliente fora do horario.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-2xl mb-6">
                {step.icon}
              </div>
              <div className="text-xs font-bold text-primary tracking-widest uppercase mb-2">
                Passo {step.number}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>

              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 -right-6 w-12 text-gray-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Funcionalidades() {
  const features = [
    {
      icon: <IconWhatsApp className="w-6 h-6" />,
      title: "Atendimento WhatsApp com IA",
      description: "Respostas naturais e inteligentes via WhatsApp, como se fosse uma secretaria real.",
    },
    {
      icon: <IconMic className="w-6 h-6" />,
      title: "Responde audios (Whisper)",
      description: "Cliente mandou audio? A IA transcreve e responde normalmente, sem perder informacao.",
    },
    {
      icon: <IconCalendar className="w-6 h-6" />,
      title: "Agendamento automatico",
      description: "A IA consulta horarios disponiveis e agenda direto na sua agenda. Sem conflitos.",
    },
    {
      icon: <IconBell className="w-6 h-6" />,
      title: "Lembretes D-1 e no dia",
      description: "Reduz no-show em ate 70% com lembretes automaticos por WhatsApp.",
    },
    {
      icon: <IconFileText className="w-6 h-6" />,
      title: "Base de conhecimento (PDF)",
      description: "Envie tabelas de preco, protocolos e regras. A IA consulta e responde com precisao.",
    },
    {
      icon: <IconStar className="w-6 h-6" />,
      title: "NPS pos-atendimento",
      description: "Coleta feedback automatico 24h apos o servico. Saiba o que melhorar.",
    },
    {
      icon: <IconLock className="w-6 h-6" />,
      title: "Bloqueio de agenda",
      description: "Ferias, almoco, imprevistos? Bloqueie horarios e a IA ja sabe que nao pode agendar ali.",
    },
    {
      icon: <IconBarChart className="w-6 h-6" />,
      title: "Resumo diario pro dono",
      description: "Todo dia de manha voce recebe: quantos contatos, quantos agendamentos, o que ficou pendente.",
    },
    {
      icon: <IconTarget className="w-6 h-6" />,
      title: "Modo captura",
      description: "Ja tem sistema? A IA captura os pedidos e voce aprova manualmente. Sem substituir nada.",
    },
  ];

  return (
    <section id="funcionalidades" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Tudo que voce precisa, nada que voce nao precisa
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Cada funcionalidade foi pensada para resolver um problema real de negocios com agendamento.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 border border-gray-100 hover:border-green-200 hover:shadow-md transition-all"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 text-primary rounded-xl mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Essential",
      price: "99",
      audience: "MEI e microempresas (1-3 profissionais)",
      features: [
        "Bot WhatsApp com IA",
        "Transcricao de audios",
        "Agendamento automatico",
        "Lembretes D-1 e no dia",
        "500 conversas/mes",
        "3 PDFs na base de conhecimento",
        "CRM basico (contatos + historico)",
        "Resumo diario",
        "1 numero de WhatsApp",
      ],
      cta: "Comecar gratis",
      highlighted: false,
    },
    {
      name: "Professional",
      price: "249",
      audience: "Pequenas empresas (4-10 profissionais)",
      features: [
        "Tudo do Essential, mais:",
        "2.000 conversas/mes",
        "10 PDFs na base de conhecimento",
        "NPS pos-atendimento",
        "Programa de fidelidade",
        "Reativacao automatica de clientes",
        "Upsell inteligente",
        "Relatorios avancados",
        "Suporte por email prioritario",
      ],
      cta: "Comecar gratis",
      highlighted: true,
    },
    {
      name: "Business",
      price: "499",
      audience: "Medias empresas (10+ profissionais)",
      features: [
        "Tudo do Professional, mais:",
        "Conversas ilimitadas",
        "20 PDFs na base de conhecimento",
        "Multi-unidade (filiais)",
        "API para integracao",
        "Suporte prioritario por WhatsApp",
        "Onboarding dedicado",
        "Relatorios customizados",
        "SLA de resposta 4h",
      ],
      cta: "Comecar gratis",
      highlighted: false,
    },
  ];

  return (
    <section id="precos" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Planos simples, sem surpresas
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Sem taxa de setup. Sem fidelidade. 7 dias gratis para testar.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl p-8 border-2 transition-shadow ${
                plan.highlighted
                  ? "border-primary bg-white shadow-xl shadow-green-500/10 relative"
                  : "border-gray-100 bg-white hover:shadow-md"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full">
                  Mais popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.audience}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-500">R$</span>
                  <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">/mes</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <IconCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block w-full text-center font-semibold py-3 px-6 rounded-xl transition-colors ${
                  plan.highlighted
                    ? "bg-primary hover:bg-green-600 text-white shadow-lg shadow-green-500/25"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                }`}
              >
                {plan.cta}
              </Link>

              <p className="text-center text-xs text-gray-500 mt-3">
                7 dias gratis, sem cartao
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Depoimentos() {
  const testimonials = [
    {
      quote:
        "Antes eu perdia pelo menos 5 agendamentos por semana porque ninguem respondia a noite. Com a SecretarIA, acordo e ja tenho a agenda do dia preenchida.",
      name: "Dra. Camila Santos",
      role: "Dentista",
      business: "Clinica Odontologica Sorriso",
    },
    {
      quote:
        "Meus clientes adoram que agora tem resposta instantanea, mesmo de madrugada. O no-show caiu 40% so com os lembretes automaticos.",
      name: "Rafael Oliveira",
      role: "Proprietario",
      business: "Barbearia Black",
    },
    {
      quote:
        "Eu ja tinha um sistema de agendamento, entao usei o modo captura. A IA capta os pedidos e eu aprovo de manha. Simples e funciona.",
      name: "Ana Paula Mendes",
      role: "Gerente",
      business: "Studio Bella — Estetica",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Quem usa, recomenda
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Veja como negocios reais estao usando a SecretarIA.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <svg
                    key={j}
                    className="w-5 h-5 text-yellow-400 fill-yellow-400"
                    viewBox="0 0 24 24"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>

              <blockquote className="text-gray-700 leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div>
                <div className="font-semibold text-gray-900">{t.name}</div>
                <div className="text-sm text-gray-500">
                  {t.role} — {t.business}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaFinal() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
          Comece agora. 7 dias gratis.
        </h2>
        <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
          Configure em 5 minutos. Sem cartao. Sem fidelidade.
          Seu proximo cliente pode estar mandando mensagem agora mesmo.
        </p>
        <div className="mt-10">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-primary hover:bg-green-600 text-white font-semibold text-lg px-10 py-4 rounded-xl transition-colors shadow-lg shadow-green-500/25"
          >
            Testar gratis por 7 dias
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Sem cartao de credito. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Secretar<span className="text-primary">IA</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
              Feito com IA para negocios reais.
              Atendimento inteligente que funciona enquanto voce descansa.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Produto</h4>
            <ul className="space-y-2">
              <li>
                <a href="#funcionalidades" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#precos" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  Precos
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  Como funciona
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Segmentos</h4>
            <ul className="space-y-2">
              <li><span className="text-sm text-gray-500">Clinicas e consultorios</span></li>
              <li><span className="text-sm text-gray-500">Saloes e barbearias</span></li>
              <li><span className="text-sm text-gray-500">Academias e studios</span></li>
              <li><span className="text-sm text-gray-500">Petshops e veterinarias</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Contato</h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:contato@secretaria.app" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  contato@secretaria.app
                </a>
              </li>
              <li>
                <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  Area do cliente
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-12 pt-8 text-center">
          <p className="text-sm text-gray-400">
            {new Date().getFullYear()} SecretarIA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <Problema />
        <ComoFunciona />
        <Funcionalidades />
        <Pricing />
        <Depoimentos />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  );
}
