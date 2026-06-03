export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            AutoClaw
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Automatización inteligente para tu negocio
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
