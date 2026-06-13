'use client';

import Link from 'next/link';
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
    <div className="panel grid gap-4">
      <h1>Admin area needs a retry</h1>
      <p className="text-muted">
        We could not load this admin section. Try again or return to the public site.
      </p>
      <div className="flex gap-3 flex-wrap">
        <button className="btn btn-primary" onClick={reset}>
          Retry
        </button>
        <Link className="btn btn-outline" href="/">
          Public site
        </Link>
      </div>
    </div>
  );
}
