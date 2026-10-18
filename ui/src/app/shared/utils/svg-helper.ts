import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export const DEFAULT_FALLBACK_SVG = `<svg class="w-full h-full text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;

export function getSafeSvgUtil(sanitizer: DomSanitizer, svgString?: string): SafeHtml {
  if (!svgString || typeof svgString !== 'string' || !svgString.trim()) {
    return sanitizer.bypassSecurityTrustHtml(DEFAULT_FALLBACK_SVG);
  }

  const str = svgString.trim();

  // Handle remote/local image URLs safely with offline fallback
  if (str.startsWith('http://') || str.startsWith('https://') || str.endsWith('.png') || str.endsWith('.svg') || str.endsWith('.jpg') || str.endsWith('.jpeg') || str.endsWith('.webp')) {
    const safeUrl = str.replace(/"/g, '&quot;');
    const fallbackSvgEscaped = `<svg class=\\'w-full h-full text-blue-400\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><rect x=\\'2\\' y=\\'3\\' width=\\'20\\' height=\\'14\\' rx=\\'2\\' ry=\\'2\\'/><line x1=\\'8\\' y1=\\'21\\' x2=\\'16\\' y2=\\'21\\'/><line x1=\\'12\\' y1=\\'17\\' x2=\\'12\\' y2=\\'21\\'/></svg>`;
    const imgHtml = `<img src="${safeUrl}" class="w-full h-full object-contain" onerror="this.onerror=null; this.parentNode.innerHTML='${fallbackSvgEscaped}';" />`;
    return sanitizer.bypassSecurityTrustHtml(imgHtml);
  }

  // Handle emojis or short character representations
  if (!str.includes('<svg') && !str.includes('</svg>')) {
    const emojiHtml = `<div class="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-400">${str}</div>`;
    return sanitizer.bypassSecurityTrustHtml(emojiHtml);
  }

  // Handle SVG markup
  return sanitizer.bypassSecurityTrustHtml(str);
}
