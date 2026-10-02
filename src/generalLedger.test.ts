import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateLedger, hasNegativeBalance, parseMoney, type GeneralLedgerEntry } from './generalLedger';

const entry = (sequence: number, incoming: string, outgoing: string): GeneralLedgerEntry => ({
  id: String(sequence), sequence, beneficiaryName: '', unitOrDepartment: '', incoming, outgoing, date: '2026-10-01', notes: '',
  attachmentName: '', attachmentDataUrl: '',
});

test('Arabic and Western amounts use exact two-decimal arithmetic', () => {
  assert.equal(parseMoney('١٬٠٠٠'), 100000);
  assert.equal(parseMoney('١,٠٠٠.٥٠'), 100050);
  assert.equal(parseMoney('78.88'), 7888);
  assert.equal(parseMoney('١٠٫٥'), 1050);
  assert.equal(parseMoney('1,5'), null);
  assert.equal(parseMoney('-1'), null);
  assert.equal(parseMoney('1.234'), null);
});

test('incoming stays fixed and expenses lower each later balance', () => {
  const rows = calculateLedger([entry(3, '', '20'), entry(1, '100', ''), entry(2, '', '30')]);
  assert.deepEqual(rows.map(({ balance }) => balance), [10000, 7000, 5000]);
});

test('editing or deleting an earlier credit cannot leave later overspending', () => {
  assert.equal(hasNegativeBalance([entry(1, '100', ''), entry(2, '', '80')]), false);
  assert.equal(hasNegativeBalance([entry(1, '50', ''), entry(2, '', '80')]), true);
  assert.equal(hasNegativeBalance([entry(2, '', '80')]), true);
});
