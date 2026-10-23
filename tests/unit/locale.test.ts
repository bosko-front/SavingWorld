import { separatorsForLocale } from '@/core/money';
import { parseAmount } from '@/core/money';
import { regionSeparators } from '@/shared/i18n/locale';

// Typed amounts follow the region's number format, which is what the iOS decimal keyboard offers
// (found on the simulator: English language, region Serbia, keyboard key ",").
describe('regionSeparators', () => {
  const english = separatorsForLocale('en-US');

  it('uses the region decimal and group separators over the language tag', () => {
    const serbia = regionSeparators(english, ',', '.');
    expect(serbia).toEqual({ decimal: ',', group: '.', grouping: 'thousands' });
    expect(parseAmount('12,345', 2, serbia)).toEqual({ ok: false, error: 'too_many_decimals' });
    expect(parseAmount('12,34', 2, serbia)).toEqual({ ok: true, value: 1_234 });
    expect(parseAmount('1.234,50', 2, serbia)).toEqual({ ok: true, value: 123_450 });
  });

  it('keeps the tag separators when the region gives none or something unusable', () => {
    expect(regionSeparators(english, null, null)).toEqual(english);
    expect(regionSeparators(english, '5', ',')).toEqual(english);
    expect(regionSeparators(english, ',', ',')).toEqual({ decimal: ',', group: '', grouping: 'thousands' });
  });

  it('keeps Indian grouping from the tag', () => {
    expect(regionSeparators(separatorsForLocale('en-IN'), '.', ',').grouping).toBe('indian');
  });
});
