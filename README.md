# Torre de Jardin — prototype

    npm install
    npm run dev      # http://localhost:3000   (admin demo: /admin)

- Copy, rooms, events, policies, phone numbers: `src/lib/data.ts`
- Rates are hidden ("PHP x,xxx"); set `SHOW_RATES = true` in `src/lib/bookings.ts` and add prices later.
- Bookings are demo-only (localStorage). Real version: Supabase + HitPay/PayMongo.
