import { buildXlsx, download, toCsv, type Cell } from "./xlsx";
import { nightsBetween, unitLabel, type Booking } from "./bookings";
import { getSettings } from "./settings";

const when = (s?: string) => (s ? new Date(s).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "");
const KIND: Record<string, string> = { stay: "Stay", event: "Event", block: "Closed dates" };
const STATUS: Record<string, string> = { pending: "Waiting", confirmed: "Confirmed", declined: "Declined" };

export const BOOKING_HEAD = [
  "Reference", "Type", "Status", "Guest", "Mobile", "Email", "Room / venue", "Check-in / event date", "Check-out",
  "Nights", "Time slot", "Guests", "Adults", "Children", "Occasion", "Payment", "Receipt file", "Estimated total (PHP)",
  "Guest notes", "Decline reason", "Owner's note", "Requested on", "Decided on",
];

export function bookingRows(list: Booking[]): Cell[][] {
  return list.map((b) => [
    b.ref, KIND[b.kind], STATUS[b.status], b.name, b.phone, b.email, unitLabel(b.unit), b.start,
    b.kind === "event" ? "" : b.end, b.kind === "event" ? "" : nightsBetween(b.start, b.end),
    b.slot ? ({ day: "Daytime", evening: "Evening", whole: "Whole day" } as any)[b.slot] : "",
    b.guests || "", b.adults, b.kids, b.eventType, b.pay === "online" ? "Online" : b.pay === "manual" ? "Bank / GCash" : "",
    b.proof, b.total, b.notes, b.declineReason, b.adminNote, when(b.createdAt), when(b.decidedAt),
  ]);
}

export function exportBookings(list: Booking[], format: "xlsx" | "csv", label = "bookings") {
  const guests = list.filter((b) => b.kind !== "block");
  const blocks = list.filter((b) => b.kind === "block");
  const stamp = new Date().toISOString().slice(0, 10);
  const st = getSettings();
  if (format === "csv") {
    download(new Blob([toCsv([BOOKING_HEAD, ...bookingRows(guests)])], { type: "text/csv;charset=utf-8" }), `torre-de-jardin-${label}-${stamp}.csv`);
    return guests.length;
  }
  const byStatus = (s: string) => guests.filter((b) => b.status === s).length;
  const sheets = [
    { name: "Bookings", rows: [BOOKING_HEAD, ...bookingRows(guests)] },
    {
      name: "Closed dates",
      rows: [["Room / venue", "From", "Until (exclusive)", "Nights", "Note"], ...blocks.map((b) => [unitLabel(b.unit), b.start, b.end, nightsBetween(b.start, b.end), b.name])],
    },
    {
      name: "Summary",
      rows: [
        ["Item", "Value"],
        ["Exported", new Date().toLocaleString("en-PH")],
        ["Total requests", guests.length],
        ["Waiting", byStatus("pending")],
        ["Confirmed", byStatus("confirmed")],
        ["Declined", byStatus("declined")],
        ["Estimated value of confirmed (PHP)", guests.filter((b) => b.status === "confirmed").reduce((a, b) => a + (b.total || 0), 0)],
        ["Check-in time", st.checkIn],
        ["Check-out time", st.checkOut],
      ],
      widths: [38, 30],
    },
  ];
  download(buildXlsx(sheets), `torre-de-jardin-${label}-${stamp}.xlsx`);
  return guests.length;
}
