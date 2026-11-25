import test from 'node:test';
import assert from 'node:assert';
import { getHolidayTheme, HOLIDAY_THEMES } from '../src/utils/holidayThemes';

test('Holiday Theming - Christmas resolution', () => {
  const theme1 = getHolidayTheme('Christmas Day');
  assert.strictEqual(theme1.key, 'christmas');
  assert.strictEqual(theme1.festiveTag.includes('Christmas'), true);

  const theme2 = getHolidayTheme('Christmas Eve Closure');
  assert.strictEqual(theme2.key, 'christmas');

  const theme3 = getHolidayTheme('Office Closed for Xmas');
  assert.strictEqual(theme3.key, 'christmas');
});

test('Holiday Theming - New Year resolution', () => {
  const theme = getHolidayTheme("New Year's Day Celebration");
  assert.strictEqual(theme.key, 'new_year');
  assert.strictEqual(theme.iconName, 'PartyPopper');
});

test('Holiday Theming - Diwali resolution', () => {
  const theme = getHolidayTheme('Diwali Deepavali Holiday');
  assert.strictEqual(theme.key, 'diwali');
  assert.strictEqual(theme.iconName, 'Flame');
});

test('Holiday Theming - Eid resolution', () => {
  const theme = getHolidayTheme('Eid al-Fitr Holiday');
  assert.strictEqual(theme.key, 'eid');
  assert.strictEqual(theme.iconName, 'Moon');
});

test('Holiday Theming - Thanksgiving resolution', () => {
  const theme = getHolidayTheme('Thanksgiving Day Closure');
  assert.strictEqual(theme.key, 'thanksgiving');
});

test('Holiday Theming - Patriotic / National holidays resolution', () => {
  const theme1 = getHolidayTheme('Independence Day 4th of July');
  assert.strictEqual(theme1.key, 'patriotic');
  assert.strictEqual(theme1.iconName, 'Flag');

  const theme2 = getHolidayTheme('Labor Day');
  assert.strictEqual(theme2.key, 'patriotic');

  const theme3 = getHolidayTheme('Memorial Day');
  assert.strictEqual(theme3.key, 'patriotic');
});

test('Holiday Theming - Halloween resolution', () => {
  const theme = getHolidayTheme('Halloween Office Celebration');
  assert.strictEqual(theme.key, 'halloween');
});

test('Holiday Theming - Holi resolution', () => {
  const theme = getHolidayTheme('Holi Festival of Colors');
  assert.strictEqual(theme.key, 'holi');
  assert.strictEqual(theme.iconName, 'Palette');
});

test('Holiday Theming - Special Working Day Override resolution', () => {
  const theme = getHolidayTheme('Any Title', undefined, true);
  assert.strictEqual(theme.key, 'override');
  assert.strictEqual(theme.festiveTag.includes('Working Day'), true);
});

test('Holiday Theming - Fallback company holiday', () => {
  const theme = getHolidayTheme('Annual Team Retreat 2026');
  assert.strictEqual(theme.key, 'company');
  assert.strictEqual(theme.iconName, 'Building2');
});
