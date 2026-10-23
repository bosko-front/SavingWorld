import { fireEvent, screen } from '@testing-library/react-native';

// Home's ⋯ goal menu is a native SwiftUI Menu (@expo/ui). In Jest its items render as host views
// with a `label`; choosing one fires the native `buttonPress` event, as the menu does on iOS.
export function goalOptionLabels(): string[] {
  return screen.container
    .queryAll((node) => typeof node.type === 'string' && typeof node.props.onButtonPress === 'function')
    .map((node) => String(node.props.label));
}

export async function chooseGoalOption(label: string | RegExp): Promise<void> {
  const [item] = screen.container.queryAll(
    (node) =>
      typeof node.type === 'string' &&
      typeof node.props.onButtonPress === 'function' &&
      (typeof label === 'string' ? node.props.label === label : label.test(String(node.props.label))),
  );
  if (!item) {
    throw new Error(`no goal option ${String(label)}; have ${goalOptionLabels().join(', ')}`);
  }
  await fireEvent(item, 'buttonPress');
}
