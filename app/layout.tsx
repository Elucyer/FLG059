import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TermiGrome - Monitoreo Ambiental",
  description: "Sistema de monitoreo de condiciones ambientales de laboratorio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
