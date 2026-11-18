import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export interface BulkLinkExportItem {
  url: string;
  isDuplicate: boolean;
  status?: 'ready' | 'duplicate_existing' | 'duplicate_batch' | 'invalid';
}

export interface BulkLinkExportOptions {
  candidateName?: string;
  allLinks: BulkLinkExportItem[];
  duplicateLinks: string[];
  fileName?: string;
}

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'refid',
  'trackingid',
  'trk',
  'fbclid',
  'gclid',
  'midtoken',
  'source',
  'src',
  'original_referer'
]);

/**
 * Normalizes a URL for robust duplicate detection across minor formatting differences:
 * - Protocol normalization (http vs https)
 * - Hostname normalization (strips www.)
 * - Trailing slash normalization (on pathname and values)
 * - Strips URL fragments (#hash)
 * - Strips marketing/analytics tracking parameters (utm_*, ref, trackingId, fbclid, etc.)
 * - Preserves specific job board identifiers (such as jk/vjk on Indeed)
 */
export const normalizeUrlForExport = (urlStr: string): string => {
  try {
    let clean = urlStr.trim().toLowerCase();

    // Strip hash fragment
    clean = clean.split('#')[0];

    // Add protocol if missing for URL parsing
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }

    const parsed = new URL(clean);

    // Get hostname and remove www.
    let host = parsed.hostname;
    if (host.startsWith('www.')) {
      host = host.substring(4);
    }

    let pathName = parsed.pathname.replace(/\/+$/, '');

    // Extract key variables for specific tracking query strings
    let searchPart = '';
    if (host.includes('indeed.com')) {
      const rawJk = parsed.searchParams.get('jk') || parsed.searchParams.get('vjk');
      if (rawJk) {
        const jk = rawJk.replace(/\/+$/, '');
        searchPart = `?jk=${jk}`;
      }
    } else {
      // Discard general tracking params, keep other functional query params
      const remaining: string[] = [];
      parsed.searchParams.forEach((val, key) => {
        const k = key.toLowerCase();
        if (!TRACKING_PARAMS.has(k) && !k.startsWith('utm_')) {
          const cleanVal = val.replace(/\/+$/, '');
          remaining.push(`${k}=${cleanVal}`);
        }
      });
      if (remaining.length > 0) {
        remaining.sort();
        searchPart = '?' + remaining.join('&');
      }
    }

    return `${host}${pathName}${searchPart}`;
  } catch (_) {
    return urlStr.trim().toLowerCase().replace(/\/+$/, '');
  }
};

/**
 * Injects yellow cell fill into styles.xml and applies it to specific rows in sheet1.xml
 */
export async function injectYellowHighlightToZip(
  zip: JSZip,
  sheetRelPath: string,
  duplicateRowNumbers: number[]
): Promise<void> {
  const stylesFile = zip.file('xl/styles.xml');
  const sheetFile = zip.file(sheetRelPath);

  if (!stylesFile || !sheetFile) return;

  let stylesXml = await stylesFile.async('string');
  let sheetXml = await sheetFile.async('string');

  // 1. Add yellow fill to <fills>
  const fillsMatch = stylesXml.match(/<fills count="(\d+)">([\s\S]*?)<\/fills>/);
  if (!fillsMatch) return;

  const currentFillCount = parseInt(fillsMatch[1], 10);
  const newFillCount = currentFillCount + 1;
  const yellowFillId = currentFillCount;
  // Standard bright yellow pattern fill in Excel OpenXML (ARGB = FFFFFF00)
  const yellowFillXml = '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill>';

  stylesXml = stylesXml.replace(
    /<fills count="\d+">([\s\S]*?)<\/fills>/,
    `<fills count="${newFillCount}">$1${yellowFillXml}</fills>`
  );

  // 2. Add xf with applyFill="1" to <cellXfs>
  const xfsMatch = stylesXml.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/);
  if (!xfsMatch) return;

  const currentXfCount = parseInt(xfsMatch[1], 10);
  const newXfCount = currentXfCount + 1;
  const yellowStyleIndex = currentXfCount;
  const yellowXfXml = `<xf numFmtId="0" fontId="0" fillId="${yellowFillId}" borderId="0" xfId="0" applyFill="1"/>`;

  stylesXml = stylesXml.replace(
    /<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/,
    `<cellXfs count="${newXfCount}">$1${yellowXfXml}</cellXfs>`
  );

  zip.file('xl/styles.xml', stylesXml);

  // 3. Mark duplicate cells in sheetXml (Column A)
  let modifiedSheetXml = sheetXml;
  for (const rowNum of duplicateRowNumbers) {
    const cellRegex = new RegExp(`(<c r="A${rowNum}"[^>]*)>`);
    modifiedSheetXml = modifiedSheetXml.replace(cellRegex, (_match, p1) => {
      if (/ s="\d+"/.test(p1)) {
        return p1.replace(/ s="\d+"/, ` s="${yellowStyleIndex}"`) + '>';
      }
      return `${p1} s="${yellowStyleIndex}">`;
    });
  }

  zip.file(sheetRelPath, modifiedSheetXml);
}

/**
 * Builds the two-tab Excel workbook buffer:
 * - Tab 1 ("All Links"): All imported job links in a single column, duplicates highlighted in yellow.
 * - Tab 2 ("Duplicate Links"): Only duplicate job links in a single column.
 */
export async function buildBulkLinksExcelBuffer(options: {
  allLinks: BulkLinkExportItem[];
  duplicateLinks: string[];
}): Promise<Uint8Array> {
  const { allLinks, duplicateLinks } = options;

  // Build Tab 1 data
  const tab1Data: { 'Job Link': string }[] = allLinks.map(item => ({
    'Job Link': item.url
  }));

  // Build Tab 2 data
  const tab2Data: { 'Job Link': string }[] = duplicateLinks.map(url => ({
    'Job Link': url
  }));

  // Create workbook with the 2 tabs
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(tab1Data);
  const ws2 = XLSX.utils.json_to_sheet(tab2Data.length > 0 ? tab2Data : [{ 'Job Link': '' }]);

  // Set column widths for readability
  ws1['!cols'] = [{ wch: 80 }];
  ws2['!cols'] = [{ wch: 80 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'All Links');
  XLSX.utils.book_append_sheet(wb, ws2, 'Duplicate Links');

  const rawZipBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const zip = await JSZip.loadAsync(rawZipBuffer);

  // Identify duplicate rows in Tab 1 (1-based: row 1 is header 'Job Link', row 2 is index 0)
  const duplicateRowNumbers: number[] = [];
  allLinks.forEach((item, index) => {
    if (item.isDuplicate) {
      duplicateRowNumbers.push(index + 2);
    }
  });

  if (duplicateRowNumbers.length > 0) {
    await injectYellowHighlightToZip(zip, 'xl/worksheets/sheet1.xml', duplicateRowNumbers);
  }

  const finalBuffer = await zip.generateAsync({ type: 'uint8array' });
  return finalBuffer;
}

/**
 * Exports and triggers download of the two-tab Excel workbook in a browser environment.
 */
export async function exportBulkLinksExcel(options: BulkLinkExportOptions): Promise<void> {
  const { candidateName, allLinks, duplicateLinks, fileName } = options;
  const safeName = candidateName ? candidateName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Candidate';
  const defaultFileName = fileName || `${safeName}_Bulk_Job_Links_${new Date().toISOString().split('T')[0]}.xlsx`;

  const buffer = await buildBulkLinksExcelBuffer({ allLinks, duplicateLinks });

  // Browser download trigger
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
