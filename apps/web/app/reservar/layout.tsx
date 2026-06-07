import { Navbar } from "@/components/layout/Navbar";

export default function ReservarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="pt-20">{children}</div>
    </>
  );
}
