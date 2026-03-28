// Layout raíz de /admin — sin auth check.
// La protección está en app/admin/(protected)/layout.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
