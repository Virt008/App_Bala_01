/**
 * Utilitário de identificação de aparelho para registro seguro de sessões.
 *
 * Captura e normaliza o modelo do dispositivo (ex: Samsung Galaxy A35, Motorola Moto G85)
 * a partir do User-Agent (Android WebView/Browser) ou da API Client Hints (navigator.userAgentData).
 * Quando não for possível identificar com segurança, utiliza "Aparelho não identificado" como fallback.
 */

// Mapeamento de códigos de modelos conhecidos (famílias populares no Brasil e internacionalmente)
const MODEL_MAP: Record<string, string> = {
  // Samsung Galaxy A
  'SM-A356E': 'Samsung Galaxy A35',
  'SM-A356B': 'Samsung Galaxy A35',
  'SM-A3560': 'Samsung Galaxy A35',
  'SM-A356U': 'Samsung Galaxy A35',
  'SM-A556E': 'Samsung Galaxy A55',
  'SM-A556B': 'Samsung Galaxy A55',
  'SM-A546E': 'Samsung Galaxy A54',
  'SM-A546B': 'Samsung Galaxy A54',
  'SM-A346E': 'Samsung Galaxy A34',
  'SM-A346B': 'Samsung Galaxy A34',
  'SM-A256E': 'Samsung Galaxy A25',
  'SM-A256B': 'Samsung Galaxy A25',
  'SM-A155F': 'Samsung Galaxy A15',
  'SM-A155M': 'Samsung Galaxy A15',
  'SM-A156E': 'Samsung Galaxy A15 5G',
  'SM-A156M': 'Samsung Galaxy A15 5G',
  'SM-A145F': 'Samsung Galaxy A14',
  'SM-A145M': 'Samsung Galaxy A14',
  'SM-A146M': 'Samsung Galaxy A14 5G',
  'SM-A055M': 'Samsung Galaxy A05',
  'SM-A057M': 'Samsung Galaxy A05s',
  'SM-A045M': 'Samsung Galaxy A04',
  'SM-A042M': 'Samsung Galaxy A04e',
  'SM-A536E': 'Samsung Galaxy A53',
  'SM-A528B': 'Samsung Galaxy A52s',
  'SM-A525M': 'Samsung Galaxy A52',
  'SM-A325M': 'Samsung Galaxy A32',

  // Samsung Galaxy S
  'SM-S921B': 'Samsung Galaxy S24',
  'SM-S926B': 'Samsung Galaxy S24+',
  'SM-S928B': 'Samsung Galaxy S24 Ultra',
  'SM-S911B': 'Samsung Galaxy S23',
  'SM-S916B': 'Samsung Galaxy S23+',
  'SM-S918B': 'Samsung Galaxy S23 Ultra',
  'SM-S901E': 'Samsung Galaxy S22',
  'SM-S906E': 'Samsung Galaxy S22+',
  'SM-S908E': 'Samsung Galaxy S22 Ultra',
  'SM-G990E': 'Samsung Galaxy S21 FE',
  'SM-G991B': 'Samsung Galaxy S21',
  'SM-G996B': 'Samsung Galaxy S21+',
  'SM-G998B': 'Samsung Galaxy S21 Ultra',
  'SM-G780G': 'Samsung Galaxy S20 FE',
  'SM-G781B': 'Samsung Galaxy S20 FE 5G',

  // Motorola Moto G & Edge (por código de produto XT)
  'XT2427-1': 'Motorola Moto G85',
  'XT2427-2': 'Motorola Moto G85',
  'XT2427-3': 'Motorola Moto G85',
  'XT2347-1': 'Motorola Moto G84',
  'XT2347-2': 'Motorola Moto G84',
  'XT2343-1': 'Motorola Moto G54',
  'XT2343-2': 'Motorola Moto G54',
  'XT2335-1': 'Motorola Moto G53',
  'XT2423-1': 'Motorola Moto G24',
  'XT2425-1': 'Motorola Moto G04',
  'XT2341-1': 'Motorola Moto G14',
  'XT2231-1': 'Motorola Moto G22',
  'XT2169-1': 'Motorola Moto G71',
  'XT2167-1': 'Motorola Moto G60',
  'XT2083-1': 'Motorola Moto G9 Play',
  'XT2403-1': 'Motorola Edge 50 Pro',
  'XT2401-1': 'Motorola Edge 50 Ultra',
  'XT2303-1': 'Motorola Edge 40',
  'XT2301-1': 'Motorola Edge 40 Pro',

  // Xiaomi / Redmi / POCO comuns
  '2312DRA50G': 'Redmi Note 13 Pro 5G',
  '23124RA7EO': 'Redmi Note 13',
  '2201117TL': 'Redmi Note 11',
  '2201116SG': 'Redmi Note 11 Pro',
  '23049PCD8G': 'POCO F5',
  '2311DRK48G': 'POCO X6 Pro',
};

/**
 * Normaliza e formata o nome de um modelo bruto
 */
function formatarModeloBruto(rawModel: string): string {
  const limpo = rawModel.trim().replace(/^"(.*)"$/, '$1');

  // Verifica mapeamento exato
  const chaveExata = limpo.toUpperCase();
  if (MODEL_MAP[chaveExata]) {
    return MODEL_MAP[chaveExata];
  }

  // Verifica mapeamento por prefixo (ex: SM-A356 -> Samsung Galaxy A35)
  if (chaveExata.startsWith('SM-A356')) return 'Samsung Galaxy A35';
  if (chaveExata.startsWith('SM-A556')) return 'Samsung Galaxy A55';
  if (chaveExata.startsWith('SM-A546')) return 'Samsung Galaxy A54';
  if (chaveExata.startsWith('SM-A346')) return 'Samsung Galaxy A34';
  if (chaveExata.startsWith('SM-A256')) return 'Samsung Galaxy A25';
  if (chaveExata.startsWith('SM-A155') || chaveExata.startsWith('SM-A156')) return 'Samsung Galaxy A15';
  if (chaveExata.startsWith('SM-A145') || chaveExata.startsWith('SM-A146')) return 'Samsung Galaxy A14';
  if (chaveExata.startsWith('SM-A055') || chaveExata.startsWith('SM-A057')) return 'Samsung Galaxy A05';
  if (chaveExata.startsWith('SM-S92')) return 'Samsung Galaxy S24';
  if (chaveExata.startsWith('SM-S91')) return 'Samsung Galaxy S23';
  if (chaveExata.startsWith('SM-S90')) return 'Samsung Galaxy S22';
  if (chaveExata.startsWith('XT2427')) return 'Motorola Moto G85';
  if (chaveExata.startsWith('XT2347')) return 'Motorola Moto G84';
  if (chaveExata.startsWith('XT2343')) return 'Motorola Moto G54';

  // Casos onde o User-Agent já contém o nome amigável do modelo
  const lower = limpo.toLowerCase();

  // Motorola Moto G85 / Moto G
  if (lower.includes('moto g85') || lower.includes('motog85')) return 'Motorola Moto G85';
  if (lower.includes('moto g84') || lower.includes('motog84')) return 'Motorola Moto G84';
  if (lower.includes('moto g54') || lower.includes('motog54')) return 'Motorola Moto G54';
  if (lower.includes('moto g53') || lower.includes('motog53')) return 'Motorola Moto G53';
  if (lower.includes('moto g24') || lower.includes('motog24')) return 'Motorola Moto G24';
  if (lower.includes('moto g14') || lower.includes('motog14')) return 'Motorola Moto G14';

  if (lower.startsWith('moto g') || lower.startsWith('motorola moto g')) {
    const formatted = limpo
      .replace(/^motorola\s+/i, '')
      .replace(/^moto\s+/i, 'Moto ');
    return `Motorola ${formatted}`;
  }

  if (lower.startsWith('motorola ') || lower.startsWith('moto ')) {
    return limpo.charAt(0).toUpperCase() + limpo.slice(1);
  }

  // Samsung Galaxy
  if (lower.includes('galaxy a35')) return 'Samsung Galaxy A35';
  if (lower.includes('galaxy a55')) return 'Samsung Galaxy A55';
  if (lower.includes('galaxy a54')) return 'Samsung Galaxy A54';
  if (lower.includes('galaxy a15')) return 'Samsung Galaxy A15';
  if (lower.includes('galaxy a14')) return 'Samsung Galaxy A14';

  if (chaveExata.startsWith('SM-')) {
    return `Samsung ${limpo}`;
  }

  // Google Pixel
  if (/^pixel\s+\d+/i.test(limpo)) {
    return `Google ${limpo}`;
  }

  // Xiaomi / Redmi / POCO
  if (lower.startsWith('redmi') || lower.startsWith('poco') || lower.startsWith('xiaomi')) {
    return limpo;
  }

  // Formata o modelo capitalizando se for aceitável
  if (limpo.length >= 3 && !/^[0-9]+$/.test(limpo)) {
    return limpo;
  }

  return 'Aparelho não identificado';
}

/**
 * Tenta extrair o modelo a partir do User-Agent tradicional
 */
function extrairModeloDoUserAgent(ua: string): string {
  if (!ua || typeof ua !== 'string') return 'Aparelho não identificado';

  // 1. Android: padrão 'Android <versão>; <modelo> Build/<build>; wv' ou 'Android <versão>; <modelo>)'
  // Exemplo: 'Mozilla/5.0 (Linux; Android 14; SM-A356E Build/UP1A.231005.007; wv)...'
  const androidRegex = /Android\s+[^;)]+;\s*([^;)]+?)(?:\s+Build|\)|\s*;)/i;
  const matchAndroid = ua.match(androidRegex);
  if (matchAndroid && matchAndroid[1]) {
    const rawCandidate = matchAndroid[1].trim();
    // Descarta candidatos que sejam apenas a versão ou arquitetura
    if (
      rawCandidate &&
      !/^linux/i.test(rawCandidate) &&
      !/^arm/i.test(rawCandidate) &&
      !/^x86/i.test(rawCandidate) &&
      rawCandidate.length >= 2
    ) {
      const formatado = formatarModeloBruto(rawCandidate);
      if (formatado !== 'Aparelho não identificado') {
        return formatado;
      }
      return `Android (${rawCandidate})`;
    }
  }

  // 2. iOS (iPhone / iPad)
  if (/iPhone/i.test(ua)) return 'Apple iPhone';
  if (/iPad/i.test(ua)) return 'Apple iPad';

  // 3. Desktop / Navegadores Web normais
  if (/Windows NT/i.test(ua)) return 'Navegador Web (Windows)';
  if (/Macintosh/i.test(ua)) return 'Navegador Web (macOS)';
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'Navegador Web (Linux)';
  if (/CrOS/i.test(ua)) return 'Navegador Web (ChromeOS)';

  return 'Aparelho não identificado';
}

/**
 * Identifica o aparelho atual de forma assíncrona com alta precisão.
 * Consulta navigator.userAgentData (Client Hints) quando disponível e faz
 * fallback no User-Agent clássico.
 */
export async function detectDevice(): Promise<string> {
  try {
    // 1. Tenta API moderna navigator.userAgentData com Client Hints de alta entropia
    const navAny = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (navAny?.userAgentData?.getHighEntropyValues) {
      try {
        const hints = await navAny.userAgentData.getHighEntropyValues(['model', 'platform']);
        if (hints?.model && typeof hints.model === 'string' && hints.model.trim()) {
          const formatado = formatarModeloBruto(hints.model);
          if (formatado !== 'Aparelho não identificado') {
            return formatado;
          }
        }
      } catch {
        // Ignora erro e recorre ao userAgent padrão
      }
    }

    // 2. Extração via navigator.userAgent
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      const modelo = extrairModeloDoUserAgent(navigator.userAgent);
      if (modelo && modelo !== 'Aparelho não identificado') {
        return modelo;
      }
    }
  } catch {
    // Falha silenciosa com fallback seguro
  }

  return 'Aparelho não identificado';
}

/**
 * Versão síncrona imediata para uso em inicializadores
 */
export function detectDeviceSync(): string {
  try {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return extrairModeloDoUserAgent(navigator.userAgent);
    }
  } catch {
    // Ignora erro
  }
  return 'Aparelho não identificado';
}
