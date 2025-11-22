import { useEffect, useRef, useState } from "react";

export default function useRerender(interval = 1000, enabled = true) {
  const rerender = useState({})[1];
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalId.current) clearInterval(intervalId.current);
      return;
    }
    intervalId.current = setInterval(() => {
      rerender({});
    }, interval);
    return () => {
      if (intervalId.current) clearInterval(intervalId.current);
    };
  }, [interval, enabled]);

  return rerender;
}
