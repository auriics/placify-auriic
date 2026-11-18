import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { 
  normalizeUrlForExport, 
  buildBulkLinksExcelBuffer, 
  BulkLinkExportItem 
} from '../src/utils/bulkLinkExport';

test('1. normalizeUrlForExport: handles minor formatting differences, trailing slashes and tracking params', () => {
  // Trailing slash differences
  const u1 = normalizeUrlForExport('https://linkedin.com/jobs/view/12345/');
  const u2 = normalizeUrlForExport('https://www.linkedin.com/jobs/view/12345');
  assert.equal(u1, u2, 'Trailing slash and www should normalize to same string');

  // Protocol differences
  const u3 = normalizeUrlForExport('http://example.com/careers/engineer');
  const u4 = normalizeUrlForExport('https://example.com/careers/engineer/');
  assert.equal(u3, u4, 'http vs https and trailing slash should match');

  // Tracking query parameters stripped
  const u5 = normalizeUrlForExport('https://linkedin.com/jobs/view/9999?trackingId=abc&refId=xyz&utm_source=share');
  const u6 = normalizeUrlForExport('https://www.linkedin.com/jobs/view/9999/');
  assert.equal(u5, u6, 'Tracking parameters should be stripped for duplicate detection');

  // URL fragments stripped
  const u7 = normalizeUrlForExport('https://jobs.lever.co/company/abc-123#apply');
  const u8 = normalizeUrlForExport('https://jobs.lever.co/company/abc-123/');
  assert.equal(u7, u8, 'URL fragments and trailing slashes should match');

  // Indeed job keys preserved
  const u9 = normalizeUrlForExport('https://www.indeed.com/viewjob?jk=7890abcd&utm_campaign=job');
  const u10 = normalizeUrlForExport('https://indeed.com/viewjob?jk=7890abcd/');
  assert.equal(u9, u10, 'Indeed jk should be preserved while tracking params are removed');
});

test('2. buildBulkLinksExcelBuffer: generates workbook with exactly two tabs and single columns', async () => {
  const allLinks: BulkLinkExportItem[] = [
    { url: 'https://linkedin.com/jobs/view/111', isDuplicate: false, status: 'ready' },
    { url: 'https://indeed.com/viewjob?jk=222', isDuplicate: false, status: 'ready' },
    { url: 'https://linkedin.com/jobs/view/111', isDuplicate: true, status: 'duplicate_batch' },
    { url: 'https://wellfound.com/jobs/333', isDuplicate: true, status: 'duplicate_existing' },
    { url: 'https://greenhouse.io/company/jobs/444', isDuplicate: false, status: 'ready' }
  ];

  const duplicateLinks: string[] = [
    'https://linkedin.com/jobs/view/111',
    'https://wellfound.com/jobs/333'
  ];

  const buffer = await buildBulkLinksExcelBuffer({ allLinks, duplicateLinks });
  assert.ok(buffer && buffer.length > 0, 'Buffer must be non-empty');

  // Read back with XLSX
  const wb = XLSX.read(buffer, { type: 'buffer' });

  // 1. Exactly two tabs
  assert.deepEqual(wb.SheetNames, ['All Links', 'Duplicate Links']);

  // 2. Tab 1 - All Links (all 5 links accounted for in order, single column)
  const sheet1Data = XLSX.utils.sheet_to_json<{ 'Job Link': string }>(wb.Sheets['All Links']);
  assert.equal(sheet1Data.length, 5, 'All Links tab must contain all 5 imported links');
  assert.equal(sheet1Data[0]['Job Link'], 'https://linkedin.com/jobs/view/111');
  assert.equal(sheet1Data[1]['Job Link'], 'https://indeed.com/viewjob?jk=222');
  assert.equal(sheet1Data[2]['Job Link'], 'https://linkedin.com/jobs/view/111');
  assert.equal(sheet1Data[3]['Job Link'], 'https://wellfound.com/jobs/333');
  assert.equal(sheet1Data[4]['Job Link'], 'https://greenhouse.io/company/jobs/444');

  // 3. Tab 2 - Duplicate Links (only the 2 duplicates, single column)
  const sheet2Data = XLSX.utils.sheet_to_json<{ 'Job Link': string }>(wb.Sheets['Duplicate Links']);
  assert.equal(sheet2Data.length, 2, 'Duplicate Links tab must contain only the 2 duplicate links');
  assert.equal(sheet2Data[0]['Job Link'], 'https://linkedin.com/jobs/view/111');
  assert.equal(sheet2Data[1]['Job Link'], 'https://wellfound.com/jobs/333');
});

test('3. buildBulkLinksExcelBuffer: verifies yellow highlight injection in OpenXML structure', async () => {
  const allLinks: BulkLinkExportItem[] = [
    { url: 'https://site.com/job1', isDuplicate: false },
    { url: 'https://site.com/job2', isDuplicate: true },  // Row 3 (1-based header is Row 1)
    { url: 'https://site.com/job3', isDuplicate: false },
    { url: 'https://site.com/job4', isDuplicate: true }   // Row 5
  ];

  const duplicateLinks = [
    'https://site.com/job2',
    'https://site.com/job4'
  ];

  const buffer = await buildBulkLinksExcelBuffer({ allLinks, duplicateLinks });
  const zip = await JSZip.loadAsync(buffer);

  // Check styles.xml
  const stylesXml = await zip.file('xl/styles.xml')!.async('string');
  assert.ok(stylesXml.includes('FFFFFF00'), 'styles.xml must contain solid yellow fill ARGB FFFFFF00');
  assert.ok(stylesXml.includes('applyFill="1"'), 'styles.xml must contain cellXf with applyFill="1"');

  // Check sheet1.xml (All Links tab)
  const sheet1Xml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');

  // Row 2 (job1) is not duplicate -> should not have yellow style
  assert.ok(/<c r="A2"[^>]*>/.test(sheet1Xml), 'Cell A2 must exist');
  assert.ok(!/<c r="A2"[^>]*s="1"[^>]*>/.test(sheet1Xml), 'Cell A2 must NOT have yellow style');

  // Row 3 (job2) is duplicate -> must have yellow style s="1"
  assert.ok(/<c r="A3"[^>]*s="1"[^>]*>/.test(sheet1Xml), 'Cell A3 must have yellow style s="1"');

  // Row 4 (job3) is not duplicate
  assert.ok(!/<c r="A4"[^>]*s="1"[^>]*>/.test(sheet1Xml), 'Cell A4 must NOT have yellow style');

  // Row 5 (job4) is duplicate -> must have yellow style s="1"
  assert.ok(/<c r="A5"[^>]*s="1"[^>]*>/.test(sheet1Xml), 'Cell A5 must have yellow style s="1"');
});
