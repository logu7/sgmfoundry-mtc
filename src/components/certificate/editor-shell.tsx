import Link from "next/link";

export function EditorShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 bg-slate-50 flex flex-col">
      <div className="no-print mx-auto w-full max-w-[1500px] px-6 py-5 flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
            &larr; All certificates
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
