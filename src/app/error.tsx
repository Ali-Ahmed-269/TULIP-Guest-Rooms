'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-shell section-padding">
      <div className="panel grid gap-4">
        <h1>Something went wrong</h1>
        <p className="text-muted">
          The page could not finish loading. You can try again, or return to the home page.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <a className="btn btn-outline" href="/">
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
