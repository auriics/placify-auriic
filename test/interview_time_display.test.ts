import test from 'node:test';
import assert from 'node:assert/strict';
import { formatInterviewSlotRange } from '../src/lib/utils';

test('formatInterviewSlotRange: formats 5:30 PM to 6:00 PM EST with explicit booked_slot_end', () => {
  const result = formatInterviewSlotRange(
    '2026-11-04T17:30:00',
    '2026-11-04T18:00:00',
    30
  );

  assert.equal(result.dateStr, 'Nov 4, 2026');
  assert.equal(result.fromTime, '5:30 PM');
  assert.equal(result.toTime, '6:00 PM');
  assert.equal(result.timeRangeStr, '5:30 PM – 6:00 PM EST');
  assert.equal(result.durationMinutes, 30);
  assert.equal(result.fullStr, 'Nov 4, 2026, 5:30 PM – 6:00 PM EST');
  assert.equal(result.hasTime, true);
});

test('formatInterviewSlotRange: formats example 10:30 AM - 11:00 AM EST without explicit end (using duration)', () => {
  const result = formatInterviewSlotRange(
    '2026-11-04T10:30:00',
    null,
    30
  );

  assert.equal(result.dateStr, 'Nov 4, 2026');
  assert.equal(result.fromTime, '10:30 AM');
  assert.equal(result.toTime, '11:00 AM');
  assert.equal(result.timeRangeStr, '10:30 AM – 11:00 AM EST');
  assert.equal(result.durationMinutes, 30);
  assert.equal(result.fullStr, 'Nov 4, 2026, 10:30 AM – 11:00 AM EST');
  assert.equal(result.hasTime, true);
});

test('formatInterviewSlotRange: handles 45-minute and 60-minute durations accurately', () => {
  const result45 = formatInterviewSlotRange(
    '2026-11-04T14:15:00',
    null,
    45
  );
  assert.equal(result45.fromTime, '2:15 PM');
  assert.equal(result45.toTime, '3:00 PM');
  assert.equal(result45.timeRangeStr, '2:15 PM – 3:00 PM EST');
  assert.equal(result45.durationMinutes, 45);

  const result60 = formatInterviewSlotRange(
    '2026-11-04T09:00:00',
    '2026-11-04T10:00:00',
    60
  );
  assert.equal(result60.fromTime, '9:00 AM');
  assert.equal(result60.toTime, '10:00 AM');
  assert.equal(result60.timeRangeStr, '9:00 AM – 10:00 AM EST');
  assert.equal(result60.durationMinutes, 60);
});

test('formatInterviewSlotRange: handles AM to PM boundary crossing', () => {
  const result = formatInterviewSlotRange(
    '2026-11-04T11:45:00',
    '2026-11-04T12:15:00',
    30
  );

  assert.equal(result.fromTime, '11:45 AM');
  assert.equal(result.toTime, '12:15 PM');
  assert.equal(result.timeRangeStr, '11:45 AM – 12:15 PM EST');
});

test('formatInterviewSlotRange: handles date-only strings gracefully', () => {
  const result = formatInterviewSlotRange(
    '2026-11-04',
    null,
    30
  );

  assert.equal(result.dateStr, 'Nov 4, 2026');
  assert.equal(result.timeRangeStr, 'Time TBD');
  assert.equal(result.fullStr, 'Nov 4, 2026 (Time TBD)');
  assert.equal(result.hasTime, false);
});

test('formatInterviewSlotRange: handles null or empty input gracefully', () => {
  const resultNull = formatInterviewSlotRange(null);
  assert.equal(resultNull.dateStr, 'Not Scheduled');
  assert.equal(resultNull.timeRangeStr, 'Time TBD');
  assert.equal(resultNull.fullStr, 'Not Scheduled');
  assert.equal(resultNull.hasTime, false);

  const resultEmpty = formatInterviewSlotRange('');
  assert.equal(resultEmpty.dateStr, 'Not Scheduled');
  assert.equal(resultEmpty.hasTime, false);
});
