const field = (id: string, value: string) =>
  `${id}${String(new TextEncoder().encode(value).length).padStart(2, '0')}${value}`;

const cleanText = (value: string, maxLength: number) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 $%*+\-./:]/g, '')
    .trim()
    .slice(0, maxLength);

const normalizePixKey = (value: string): string | null => {
  const key = value.trim();
  if (key.startsWith('+')) {
    const phone = key.replace(/[\s().-]/g, '');
    return /^\+[1-9]\d{9,14}$/.test(phone) ? phone : null;
  }

  const digits = key.replace(/\D/g, '');
  const isCpf = /^\d{11}$/.test(key) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(key);
  const isCnpj = /^\d{14}$/.test(key)
    || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(key)
    || /^\d{8}\/\d{4}-\d{2}$/.test(key);
  if (isCpf || isCnpj) return digits;

  const email = key.toLowerCase();
  const [localPart, domain, ...extraEmailParts] = email.split('@');
  const domainLabels = domain?.split('.') ?? [];
  const isEmail = extraEmailParts.length === 0
    && Boolean(localPart && domain)
    && localPart.length <= 64
    && /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(localPart)
    && !localPart.startsWith('.')
    && !localPart.endsWith('.')
    && !localPart.includes('..')
    && domainLabels.length >= 2
    && domainLabels.every(label =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
    );
  const isEvp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);
  if (!isEmail && !isEvp) return null;
  const normalized = isEmail ? email : key.toLowerCase();
  return new TextEncoder().encode(normalized).length <= 77 ? normalized : null;
};

const crc16 = (value: string) => {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

export type PixBrCodeInput = {
  key: string;
  merchantName: string;
  merchantCity?: string;
  amountCents?: number;
  txid?: string;
};

export function createPixBrCode({
  key,
  merchantName,
  merchantCity,
  amountCents,
  txid = '***',
}: PixBrCodeInput) {
  const normalizedKey = normalizePixKey(key);
  if (!normalizedKey) return '';

  const merchantAccount = field('00', 'br.gov.bcb.pix') + field('01', normalizedKey);
  const validAmount = Number.isSafeInteger(amountCents) && amountCents! > 0;
  const amount = validAmount ? field('54', (amountCents! / 100).toFixed(2)) : '';
  const additionalData = field('05', cleanText(txid, 25) || '***');
  const payloadWithoutCrc = [
    field('00', '01'),
    field('01', '11'),
    field('26', merchantAccount),
    field('52', '0000'),
    field('53', '986'),
    amount,
    field('58', 'BR'),
    field('59', cleanText(merchantName, 25) || 'RECEBEDOR'),
    field('60', cleanText(merchantCity || 'BRASIL', 15) || 'BRASIL'),
    field('62', additionalData),
    '6304',
  ].join('');

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
}