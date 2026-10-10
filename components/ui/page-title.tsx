export default function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-4xl font-bold text-foreground">
      {children}
    </h1>
  );
}