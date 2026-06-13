# Tulip Guest Rooms

This repository now uses the Next.js + Supabase app in `src/` as the active implementation.

## Current Structure

- `src/` - Active Next.js app
- `public/` - Public assets used by the Next.js app
- `.env.local` - Local secrets for development only
- `.env.example` - Required environment variable template

## Legacy Cleanup Status

The following folders and files are legacy or generated and should be removed after final validation:

- `legacy-php/`
- `.vs/`
- `.next/`

These folders are no longer required by the active Next.js + Supabase app.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Build

```bash
npm run build
npm run start
```

## Deploy on Vercel

1. Import the GitHub repository into Vercel.
2. Add your Supabase and Resend environment variables in the Vercel dashboard.
3. Use the default Next.js build settings.
4. Deploy the active app from `src/`.

## Notes

- Keep `.env.local` out of version control.
- Keep `legacy-php/` only until you are completely satisfied that no traffic or shared data still depends on it.
- After final validation, remove `legacy-php/`, `.vs/`, and any generated build artifacts from the repository.
