import { useEffect } from "react";

const SUFFIX = "LegalDocReader";

/** Sets `document.title` for the lifetime of the page that calls it. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export default useDocumentTitle;
