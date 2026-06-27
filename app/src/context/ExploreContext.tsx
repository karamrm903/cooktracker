import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { Image as ExpoImage } from 'expo-image';
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
        exploreService.fetchSwipeDeck(session, { limit: 30 }),
        exploreService.fetchTrending(session),
      ]);
      setCards(deck.cards);
      setTrending(trend.items);
      setCardsLoaded(true);
      setLoading(false);

      // Images now arrive signed inline with the deck/trending payload — no extra
      // round-trip. Seed the shared cache (so Explore reuses, never re-fetches)
      // and warm the expo-image disk cache so the carousel paints instantly.
      const map: Record<string, string | null> = {};
      [...deck.cards, ...trend.items].forEach((c) => {
        map[c.id] = c.imageUrl ?? null;
      });
      exploreService.seedImageCache(map);
      setImages(map);
      Object.values(map).forEach((url) => {
        if (url) ExpoImage.prefetch(url, { cachePolicy: 'memory-disk' }).catch(() => {});
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
