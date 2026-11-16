# Torre de Jardin — prototype

    npm install
    npm run dev      # http://localhost:3000   (admin demo: /admin)

- Copy, rooms, events, policies, phone numbers: `src/lib/data.ts`
- Prices, deposit, room counts, check-in/out times and payment details are edited by the owners in **/admin → Rates & rooms / Settings** (stored in `src/lib/settings.ts`; prices stay "PHP x,xxx" until "Show prices" is switched on).
- Rooms (names, unit counts, capacity) are edited in code only (`src/lib/data.ts`). The admin edits prices, per-room deposits, vouchers, calendar closures/special guests, and records payments; everything is written to the audit log.
- Admin (`/admin`, demo PIN `1234`, changeable in Settings): overview + calendar, bookings with approve/decline and copy-ready Messenger/SMS replies, rates & rooms, payment details/QR, activity log, Excel (.xlsx) and CSV export (`src/lib/xlsx.ts`, no extra packages).
- Bookings are demo-only (localStorage). Real version: Supabase + HitPay/PayMongo.
