import { useState, useLayoutEffect } from "react";
import type { ReactNode } from "react";

import type { Dimensions } from "../types";

export const AutoSizer = ({
  children,
}: {
  children: (d: Dimensions) => ReactNode;
}) => {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);

  useLayoutEffect(() => {
    if (!ref) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const [
        {
          contentRect: { width, height },
        },
      ] = entries;

      setDimensions({ width, height });
    });

    resizeObserver.observe(ref);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return (
    <div style={{ width: "100%", height: "100%" }} ref={setRef}>
      {dimensions && children(dimensions)}
    </div>
  );
};
