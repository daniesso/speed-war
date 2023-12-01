import { useRevalidator } from "@remix-run/react";
import { useEffect, useRef } from "react";

export function useRefreshInterval(seconds: number) {
  const revalidator = useRevalidator();
  const ref = useRef<NodeJS.Timeout>();

  useEffect(() => {
    ref.current = setInterval(() => {
      revalidator.revalidate();
    }, seconds * 1000);

    return () => {
      if (ref.current) {
        clearInterval(ref.current);
      }
    };
  });
}
