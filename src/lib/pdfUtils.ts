function oklchToRgba(lStr: string, cStr: string, hStr: string, aStr?: string): string {
  let L = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
  let C = parseFloat(cStr);
  let H = parseFloat(hStr);
  
  if (hStr.endsWith('rad')) {
    H = parseFloat(hStr) * (180 / Math.PI);
  } else if (hStr.endsWith('turn')) {
    H = parseFloat(hStr) * 360;
  } else if (hStr.endsWith('grad')) {
    H = parseFloat(hStr) * 0.9;
  }
  
  let A = 1.0;
  if (aStr) {
    A = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
  }

  // Convert to OKLAB a & b
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLAB to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // LMS cubed
  const l = Math.pow(Math.max(0, l_), 3);
  const m = Math.pow(Math.max(0, m_), 3);
  const s = Math.pow(Math.max(0, s_), 3);

  // LMS to Linear RGB
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b_rgb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Linear sRGB to sRGB (gamma correction)
  const gamma = (c: number) => {
    if (c <= 0.0031308) {
      return 12.92 * c;
    }
    return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const R = Math.round(Math.min(255, Math.max(0, gamma(r) * 255)));
  const G = Math.round(Math.min(255, Math.max(0, gamma(g) * 255)));
  const B = Math.round(Math.min(255, Math.max(0, gamma(b_rgb) * 255)));

  if (A === 1.0) {
    const hex = ((R << 16) | (G << 8) | B).toString(16).padStart(6, '0');
    return `#${hex}`;
  } else {
    return `rgba(${R}, ${G}, ${B}, ${A})`;
  }
}

function oklabToRgba(lStr: string, aStrVal: string, bStrVal: string, aStr?: string): string {
  let L = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
  let a = parseFloat(aStrVal);
  let b = parseFloat(bStrVal);
  
  let A = 1.0;
  if (aStr) {
    A = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
  }

  // OKLAB to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // LMS cubed
  const l = Math.pow(Math.max(0, l_), 3);
  const m = Math.pow(Math.max(0, m_), 3);
  const s = Math.pow(Math.max(0, s_), 3);

  // LMS to Linear RGB
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b_rgb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Linear sRGB to sRGB (gamma correction)
  const gamma = (c: number) => {
    if (c <= 0.0031308) {
      return 12.92 * c;
    }
    return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const R = Math.round(Math.min(255, Math.max(0, gamma(r) * 255)));
  const G = Math.round(Math.min(255, Math.max(0, gamma(g) * 255)));
  const B = Math.round(Math.min(255, Math.max(0, gamma(b_rgb) * 255)));

  if (A === 1.0) {
    const hex = ((R << 16) | (G << 8) | B).toString(16).padStart(6, '0');
    return `#${hex}`;
  } else {
    return `rgba(${R}, ${G}, ${B}, ${A})`;
  }
}

/**
 * Converts any oklch(...) or oklab(...) color strings into standard hex/rgb/rgba strings
 * using high-precision mathematical formulas.
 */
export function convertUnsupportedColorsInString(str: string): string {
  if (!str || !/oklch|oklab/i.test(str)) return str;

  let result = str;

  // Replace oklch
  result = result.replace(/oklch\(\s*([^,\s)]+)(?:[\s,]+)([^,\s)]+)(?:[\s,]+)([^,\s)/]+)(?:\s*(?:\/|,)\s*([^,\s)]+))?\s*\)/gi, (match, l, c, h, a) => {
    try {
      return oklchToRgba(l, c, h, a);
    } catch (e) {
      return match;
    }
  });

  // Replace oklab
  result = result.replace(/oklab\(\s*([^,\s)]+)(?:[\s,]+)([^,\s)]+)(?:[\s,]+)([^,\s)/]+)(?:\s*(?:\/|,)\s*([^,\s)]+))?\s*\)/gi, (match, l, aVal, bVal, a) => {
    try {
      return oklabToRgba(l, aVal, bVal, a);
    } catch (e) {
      return match;
    }
  });

  return result;
}

/**
 * Sanitizes a cloned document for html2canvas to prevent "unsupported color function oklch/oklab" errors.
 */
export function sanitizeClonedDocForHtml2Canvas(clonedDoc: Document): void {
  // 1. Sanitize all <style> tags
  clonedDoc.querySelectorAll('style').forEach((styleEl) => {
    if (styleEl.textContent && /oklch|oklab/i.test(styleEl.textContent)) {
      styleEl.textContent = convertUnsupportedColorsInString(styleEl.textContent);
    }
  });

  // 2. Sanitize all elements (including documentElement & body)
  const allNodes = Array.from(clonedDoc.querySelectorAll('*'));
  allNodes.push(clonedDoc.documentElement, clonedDoc.body);

  const colorProps = [
    'color',
    'background-color',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    'box-shadow',
    'fill',
    'stroke',
  ];

  const cssVars = [
    '--tw-ring-color',
    '--tw-ring-offset-color',
    '--tw-shadow-color',
    '--tw-shadow',
    '--tw-border-spacing-x',
    '--tw-border-spacing-y',
  ];

  allNodes.forEach((node) => {
    if (!node) return;
    const el = node as HTMLElement;

    // Sanitize inline style text if present
    if (el.style && el.style.cssText && /oklch|oklab/i.test(el.style.cssText)) {
      el.style.cssText = convertUnsupportedColorsInString(el.style.cssText);
    }

    // Get computed style in cloned doc window or current window
    try {
      const win = clonedDoc.defaultView || window;
      const comp = win.getComputedStyle(el);
      if (comp) {
        colorProps.forEach((prop) => {
          const val = comp.getPropertyValue(prop);
          if (val && /oklch|oklab/i.test(val)) {
            el.style.setProperty(prop, convertUnsupportedColorsInString(val));
          }
        });
        cssVars.forEach((varName) => {
          const val = comp.getPropertyValue(varName);
          if (val && /oklch|oklab/i.test(val)) {
            el.style.setProperty(varName, convertUnsupportedColorsInString(val));
          }
        });
      }
    } catch (e) {
      // Ignore element if getComputedStyle fails
    }
  });
}

/**
 * Helper to generate PDF using html2pdf.js with full oklch & oklab sanitization
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc: Document) => {
        sanitizeClonedDocForHtml2Canvas(clonedDoc);
      },
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  const html2pdf = (await import('html2pdf.js')).default;
  await html2pdf().set(opt).from(element).save();
}
