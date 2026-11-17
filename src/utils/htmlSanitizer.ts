const ALLOWED_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'P',
  'BR',
  'UL',
  'OL',
  'LI',
  'SPAN',
  'DIV'
]);

/**
 * Sanitizes formatted HTML while preserving Bahasa Indonesia EYD V formatting
 * (bold, italic, underline, paragraphs, lists). Works in both DOM and Node environments.
 */
export function sanitizeFormattedHtml(rawHtml: unknown): string {
  if (rawHtml === null || rawHtml === undefined) return '';
  const str = String(rawHtml).trim();
  if (!str) return '';

  if (typeof document !== 'undefined') {
    const template = document.createElement('template');
    template.innerHTML = str;

    const cleanNode = (parent: ParentNode) => {
      const children = Array.from(parent.childNodes);
      for (const node of children) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          const tag = el.tagName.toUpperCase();
          if (!ALLOWED_TAGS.has(tag)) {
            if (tag === 'SCRIPT' || tag === 'STYLE') {
              el.remove();
            } else {
              const frag = document.createDocumentFragment();
              while (el.firstChild) {
                frag.appendChild(el.firstChild);
              }
              parent.replaceChild(frag, el);
              cleanNode(parent);
            }
          } else {
            Array.from(el.attributes).forEach((attr) => {
              el.removeAttribute(attr.name);
            });
            cleanNode(el);
          }
        }
      }
    };

    cleanNode(template.content);
    return template.innerHTML.trim();
  }

  // Pure Node fallback for server-side / unit tests
  const withoutScripts = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  return withoutScripts
    .replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?(\/?)>/g, (full, tagName: string, _attrs, selfClose) => {
      const upper = tagName.toUpperCase();
      if (!ALLOWED_TAGS.has(upper)) return '';
      const isClosing = full.startsWith('</');
      const lower = tagName.toLowerCase();
      if (isClosing) return `</${lower}>`;
      if (upper === 'BR' && selfClose) return '<br/>';
      return `<${lower}>`;
    })
    .trim();
}

export function stripHtmlToText(html: string | null | undefined): string {
  if (!html) return '';
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').trim();
  }
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim();
}

export function escapeHtmlText(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatDateIndo(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function generateRandomToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
