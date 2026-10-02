export interface GeneralLedgerEntry {
  id: string;
  sequence: number;
  beneficiaryName: string;
  unitOrDepartment: string;
  incoming: string;
  outgoing: string;
  date: string;
  notes: string;
  attachmentName: string;
  attachmentDataUrl: string;
}

export const parseMoney = (value: string): number | null => {
  const normalized = value.trim()
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/٫/g, '.');
  if (!normalized) return 0;
  if (!/^(?:\d+|\d{1,3}(?:[,٬]\d{3})+)(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.replace(/[,٬]/g, '').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
};

export const calculateLedger = (entries: GeneralLedgerEntry[]) => {
  let balance = 0;
  return [...entries].sort((a, b) => a.sequence - b.sequence).map((entry) => {
    balance += (parseMoney(entry.incoming) ?? 0) - (parseMoney(entry.outgoing) ?? 0);
    return { ...entry, balance };
  });
};

export const hasNegativeBalance = (entries: GeneralLedgerEntry[]) =>
  calculateLedger(entries).some((entry) => entry.balance < 0);
