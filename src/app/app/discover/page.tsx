import { DiscoverDeck } from "@/features/discover/DiscoverDeck";

export default function DiscoverPage() {
  return (
    <section>
      <h1 className="mb-4 hidden text-2xl font-bold md:block">Discover</h1>
      <DiscoverDeck />
    </section>
  );
}
