import LoadingCard from "@/components/loading-card";
import ErrorCard from "@/components/error-card";

// loading
export function loadingGuard(mainClassName: string, message?: string) {
  return (
    <main className={mainClassName}>
      <LoadingCard message={message} />
    </main>
  );
}
// Error
export function errorGuard(
  mainClassName: string,
  title?: string,
  description?: string,
  onRetry?: () => void
) {
  return (
    <main className={mainClassName}>
      <ErrorCard title={title} description={description} onRetry={onRetry} />
    </main>
  );
}
