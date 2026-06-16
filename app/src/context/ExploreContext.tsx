import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { Image } from 'react-native';
import { exploreService, ExploreRecipe } from '../services/exploreService';

// Preload cache shared by Dashboard (warmer) and Explore (consumer).
// `ensure(session)` is idempotent — re-entering Explore after the first
// dashboard visit returns instantly with cards + pre-signed image URLs.
// URLs expire after 1h; `refresh()` forces a re-sign.

interface ExploreCache {
  cards: ExploreRecipe[];
  trending: ExploreRecipe[];
  images: Record<string, string | null>;
  cardsLoaded: boolean;   // deck arrived from DB — UI can render immediately
  imagesLoaded: boolean;  // bulk signed URLs resolved
  loaded: boolean;        // alias for cardsLoaded — kept for compat
  loading: boolean;
  ensure: (session: any) => Promise<void>;
  refresh: (session: any) => Promise<void>;
}

const Ctx = createContext<ExploreCache | null>(null);

export function ExploreProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<ExploreRecipe[]>([]);
  const [trending, setTrending] = useState<ExploreRecipe[]>([]);
  const [images, setImages] = useState<Record<string, string | null>>({});
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  // Tracks in-flight ensure() across re-renders so concurrent callers share one fetch.
  const inFlight = useRef<Promise<void> | null>(null);

  const load = useCallback(async (session: any) => {
    setLoading(true);
    try {
      // Phase 1 — deck/trending arrive first. UI can render cards now; the
      // signed image URLs stream in afterwards without blocking the swiper.
      const [deck, trend] = await Promise.all([
        exploreService.fetchSwipeDeck(session, { limit: 20 }),
        exploreService.fetchTrending(session),
      ]);
      setCards(deck.cards);
      setTrending(trend.items);
      setCardsLoaded(true);
      setLoading(false);

      // Phase 2 — bulk-sign known image_urls. Sign-only, no Pexels round trip.
      const ids = [
        ...deck.cards.map((c) => c.id),
        ...trend.items.map((t) => t.id),
      ];
      const map = await exploreService.fetchRecipeImagesBulk(session, ids);
      setImages(map);
      // Warm native image cache so first paint in the swiper is instant.
      Object.values(map).forEach((url) => {
        if (url) Image.prefetch(url).catch(() => {});
      });
      setImagesLoaded(true);
    } catch (err) {
      console.warn('[ExploreContext] preload failed:', (err as Error).message);
      setLoading(false);
    }
  }, []);

  const ensure = useCallback(
    async (session: any) => {
      if (!session?.access_token) return;
      if (cardsLoaded || inFlight.current) {
        if (inFlight.current) await inFlight.current;
        return;
      }
      inFlight.current = load(session).finally(() => {
        inFlight.current = null;
      });
      await inFlight.current;
    },
    [load, cardsLoaded],
  );

  const refresh = useCallback(
    async (session: any) => {
      if (!session?.access_token) return;
      inFlight.current = load(session).finally(() => {
        inFlight.current = null;
      });
      await inFlight.current;
    },
    [load],
  );

  return (
    <Ctx.Provider
      value={{
        cards,
        trending,
        images,
        cardsLoaded,
        imagesLoaded,
        loaded: cardsLoaded,
        loading,
        ensure,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useExplore(): ExploreCache {
  const v = useContext(Ctx);
  if (!v) throw new Error('useExplore must be used inside ExploreProvider');
  return v;
}
