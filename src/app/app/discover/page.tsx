import { DiscoverDeck } from "@/features/discover/DiscoverDeck";

export default function DiscoverPage() {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <h1 className="sr-only">Discover</h1>
      <DiscoverDeck />
    </section>
  );
}
