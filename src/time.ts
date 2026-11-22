/** Kenya (EAT, UTC+3) clock helpers — menu windows and happy hours run on bar time, not the phone's zone. */
export function kenyaNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')), minutes: Number(g('hour')) * 60 + Number(g('minute')) };
}
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export function inWindow(w?: { days: number[]; start: string; end: string }) {
  if (!w) return true;
  const { day, minutes } = kenyaNow();
  const a = toMin(w.start), b = toMin(w.end);
  if (a <= b) return w.days.includes(day) && minutes >= a && minutes < b;
  return (w.days.includes(day) && minutes >= a) || (w.days.includes((day + 6) % 7) && minutes < b);
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmt = (t: string) => { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; const hh = h % 12 || 12; return m ? `${hh}:${String(m).padStart(2, '0')} ${ap}` : `${hh} ${ap}`; };
export const windowLabel = (w: { days: number[]; start: string; end: string }) =>
  `${w.days.length === 7 ? 'Daily' : w.days.length === 1 ? `${DAYS[w.days[0]]}s` : w.days.map((d) => DAYS[d]).join(', ')} ${fmt(w.start)}–${fmt(w.end)}`;
