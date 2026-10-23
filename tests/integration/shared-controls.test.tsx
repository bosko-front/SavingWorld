import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';

import { AmountText } from '@/shared/ui/amount-text';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { TextField } from '@/shared/ui/text-field';

// Behavior of the shared controls as seen through the accessibility tree. Visual appearance,
// Dynamic Type and VoiceOver output are checked on the simulator (docs/evidence/PHASE_02.md).

describe('Button', () => {
  it('is an accessible button that runs its action', async () => {
    const onPress = jest.fn();
    await render(<Button label="Add savings" onPress={onPress} />);
    await userEvent.press(screen.getByRole('button', { name: 'Add savings' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses and reports disabled state when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Add savings" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Add savings' });
    expect(button).toBeDisabled();
    await userEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps its label, reports busy and ignores repeat presses while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Saving" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Saving' });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    expect(screen.getByText('Saving')).toBeOnTheScreen();
    await userEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('stops a second submission once the caller switches to loading', async () => {
    const save = jest.fn();
    function SaveForm() {
      const [loading, setLoading] = useState(false);
      return (
        <Button
          label="Save"
          loading={loading}
          onPress={() => {
            setLoading(true);
            save();
          }}
        />
      );
    }
    await render(<SaveForm />);
    const button = screen.getByRole('button', { name: 'Save' });
    await userEvent.press(button);
    await userEvent.press(button);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('TextField', () => {
  function Controlled(props: { error?: string; hint?: string; disabled?: boolean; onChange?: (text: string) => void }) {
    const [value, setValue] = useState('');
    return (
      <TextField
        label="Goal name"
        value={value}
        onChangeText={(text) => {
          setValue(text);
          props.onChange?.(text);
        }}
        hint={props.hint}
        error={props.error}
        disabled={props.disabled}
      />
    );
  }

  it('is reachable by its visible label and accepts typing', async () => {
    const onChange = jest.fn();
    await render(<Controlled onChange={onChange} hint="Any name you like." />);
    const input = screen.getByLabelText('Goal name');
    await userEvent.type(input, 'Trip');
    expect(input).toHaveDisplayValue('Trip');
    expect(onChange).toHaveBeenLastCalledWith('Trip');
    expect(input.props.accessibilityHint).toBe('Any name you like.');
    expect(screen.getByText('Any name you like.')).toBeOnTheScreen();
  });

  it('shows the error in words and links it to the input', async () => {
    await render(<Controlled hint="Any name you like." error="Enter a goal name." />);
    const input = screen.getByLabelText('Goal name');
    expect(input.props.accessibilityHint).toBe('Error: Enter a goal name.');
    expect(screen.getByLabelText('Error: Enter a goal name.')).toHaveTextContent(/Enter a goal name\./);
    // The error replaces the hint rather than stacking two helper lines.
    expect(screen.queryByText('Any name you like.')).not.toBeOnTheScreen();
  });

  it('cannot be edited when disabled', async () => {
    await render(<Controlled disabled />);
    const input = screen.getByLabelText('Goal name');
    expect(input).toBeDisabled();
    expect(input.props.editable).toBe(false);
  });
});

describe('Notice and AmountText', () => {
  it('announces an error notice with its title and message', async () => {
    await render(<Notice tone="error" title="Couldn’t save" message="Try again." />);
    expect(screen.getByRole('alert', { name: 'Couldn’t save. Try again.' })).toBeOnTheScreen();
  });

  it('renders the formatted amount text unchanged', async () => {
    await render(<AmountText formatted="− €20.00 withdrawal" kind="withdrawal" />);
    expect(screen.getByText('− €20.00 withdrawal')).toBeOnTheScreen();
  });
});
