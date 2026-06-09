export default function SignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {children}
    </div>
  );
}
