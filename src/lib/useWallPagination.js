import { useEffect, useRef } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useWallPagination(token) {
  const result = usePaginatedQuery(
    api.posts.list,
    token ? { token } : "skip",
    { initialNumItems: 15 },
  );
  const sentinelRef = useRef(null);
  const { status, loadMore } = result;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (status !== "CanLoadMore") return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore(10);
    }, { rootMargin: "300px" });
    obs.observe(node);
    return () => obs.disconnect();
  }, [status, loadMore]);

  return { ...result, sentinelRef };
}
