import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-8 rounded-3xl border border-amber-700/20 bg-amber-50 p-5 text-sm text-amber-900">
        Admin authentication is not enabled yet. This route is a scaffold for the v1
        control plane.
      </div>
      {children}
    </main>
  );
}

