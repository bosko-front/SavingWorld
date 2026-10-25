import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Alert, Dimensions, StyleSheet } from 'react-native';

import { SavingsPlanCards } from '@/features/goals/presentation/savings-plan-cards';
import type { SavingsPlanCopy } from '@/shared/i18n/deadline-messages';

// Home's savings plan cards (D84): what each state shows, the info button only when an amount is
// suggested, and the cards stacking at large text. The values come from the view model; Home's
// integration tests check them against the ledger.

const PLAN: SavingsPlanCopy = {
  kind: 'plan',
  date: 'Nov 21, 2026',
  timeLeft: '29 days left',
  passed: false,
  deadlineLabel: 'Deadline Nov 21, 2026, 29 days left',
  needed: { kind: 'saving', amount: '€1,170.00', pace: '€273.00 a week', note: null },
  explanation: 'How it is worked out.',
};

async function setFontScale(fontScale: number) {
  await act(async () => {
    Dimensions.set({ window: { width: 375, height: 667, scale: 2, fontScale }, screen: { width: 375, height: 667, scale: 2, fontScale } });
  });
}

function cardsDirection() {
  return StyleSheet.flatten(screen.getByTestId('home-plan-deadline').parent!.props.style).flexDirection;
}

afterEach(async () => {
  await setFontScale(1);
});

describe('SavingsPlanCards', () => {
  it('shows nothing without a deadline', async () => {
    await render(<SavingsPlanCards copy={{ kind: 'none' }} />);
    expect(screen.queryByTestId('home-plan')).toBeNull();
  });

  it('two cards side by side: deadline and time left; amount needed and one per-period amount, with the explanation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(<SavingsPlanCards copy={PLAN} />);
    expect(screen.getByText('Savings plan')).toBeOnTheScreen();
    expect(cardsDirection()).toBe('row');
    expect(screen.getByTestId('home-plan-deadline')).toHaveAccessibleName('Deadline Nov 21, 2026, 29 days left');
    expect(screen.getByTestId('home-plan-saving')).toHaveAccessibleName('Savings needed €1,170.00. €273.00 a week');
    await userEvent.press(screen.getByTestId('home-plan-info'));
    expect(alert).toHaveBeenCalledWith('How the amount is worked out', 'How it is worked out.');
    alert.mockRestore();
  });

  it('no suggested amount: no pace line and no info button', async () => {
    await render(<SavingsPlanCards copy={{ ...PLAN, timeLeft: 'Today', needed: { kind: 'saving', amount: '€75.00', pace: null, note: null }, explanation: null }} />);
    expect(screen.queryByTestId('home-plan-pace')).toBeNull();
    expect(screen.queryByTestId('home-plan-info')).toBeNull();
    expect(screen.getByTestId('home-plan-time-left')).toHaveTextContent('Today');
  });

  it('completed: target reached instead of an amount', async () => {
    await render(<SavingsPlanCards copy={{ ...PLAN, needed: { kind: 'complete' }, explanation: null }} />);
    expect(screen.getByTestId('home-plan-complete')).toHaveAccessibleName('Savings needed: none, target reached');
    expect(screen.queryByTestId('home-plan-amount')).toBeNull();
  });

  it('stacks the cards above text scale 1.35, so large amounts keep the full width', async () => {
    await setFontScale(1.35);
    await render(<SavingsPlanCards copy={PLAN} />);
    expect(cardsDirection()).toBe('row');
    await setFontScale(2);
    expect(cardsDirection()).toBe('column');
  });
});
