import Link from "next/link";

const links = [
  {
    href: "/recepcao",
    title: "Recepção",
    description: "Emitir senhas, chamar o próximo paciente e gerenciar as filas.",
  },
  {
    href: "/painel",
    title: "Painel de chamadas",
    description: "Tela para exibir em TV com a senha chamada em cada fila.",
  },
  {
    href: "/senha",
    title: "Consultar minha senha",
    description: "O paciente acompanha a posição na fila e o tempo estimado de espera.",
  },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Gestão de Filas da Clínica
        </h1>
        <p className="text-slate-500">Escolha o que você quer fazer</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 w-full max-w-4xl">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <h2 className="text-lg font-medium text-slate-900">{link.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
