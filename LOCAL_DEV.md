# Local Dev

Use the stable startup commands when working from this machine:

```bash
npm run dev:stable
```

This mode is tuned for a Windows + OneDrive workspace:

- forces `next dev --webpack`
- enables polling file watching
- binds to `127.0.0.1`
- checks whether port `3000` is already healthy before starting

If the browser stops responding but port `3000` still looks occupied, use:

```bash
npm run dev:restart
```

That command:

- finds the stuck listener on port `3000`
- stops it
- starts the stable dev server again

Recommended local URLs:

- `http://localhost:3000/landing`
- `http://localhost:3000/auth/signin`
- `http://localhost:3000/dashboard`

Notes:

- `npm run dev` still exists, but on this machine `npm run dev:stable` is the safer default.
- The most likely source of the earlier freezes is the `Windows + OneDrive + file watching + hot reload` combination, not your app routes themselves.
