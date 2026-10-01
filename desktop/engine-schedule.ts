import type { Routine } from '../shared/types';
const formatters = new Map<string, Intl.DateTimeFormat>();
export function validateRoutine(routine: Pick<Routine,'time'|'days'|'timezone'>) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(routine.time)) throw new Error('Routine time must be HH:MM in 24-hour format.');
  if (!Array.isArray(routine.days) || !routine.days.length || routine.days.some(d=>!Number.isInteger(d)||d<0||d>6)) throw new Error('Choose routine days (Sunday=0 through Saturday=6).');
  try { new Intl.DateTimeFormat('en-US', {timeZone:routine.timezone}).format(); } catch { throw new Error('Use a valid IANA timezone.'); }
}
export function routineSlot(routine: Routine, now: Date): string | undefined {
  let formatter=formatters.get(routine.timezone);
  if(!formatter){formatter=new Intl.DateTimeFormat('en-CA', {timeZone:routine.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'});formatters.set(routine.timezone,formatter);}
  const parts = formatter.formatToParts(now);
  const get = (type:string) => parts.find(p=>p.type===type)?.value || '';
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday'));
  if (!routine.enabled || !routine.days.includes(day) || `${get('hour')}:${get('minute')}` !== routine.time) return undefined;
  return `${get('year')}-${get('month')}-${get('day')}T${routine.time}`;
}
export function nextRoutineRun(routine: Routine, after: Date): string | undefined {
  if (!routine.enabled) return undefined;
  // Scan UTC minutes rather than doing offset arithmetic; this handles DST jumps and half-hour zones.
  const date = new Date(Math.floor(after.getTime()/60000)*60000+60000);
  for (let i=0;i<8*24*60;i++,date.setTime(date.getTime()+60000)) if (routineSlot(routine,date)) return date.toISOString();
  return undefined;
}
