import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import path from 'path';

import { chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';

// Renders the real route files under src/app. This proves route structure and navigation intent
// in Jest only; native tab/stack chrome is verified in the EAS development build. The Jest mock of
// NativeTabs mounts every tab, so tab switches are asserted by pathname, not by visible text.
const appDir = path.resolve(__dirname, '../../src/app');

// The root layout renders the navigator only after the app database is open (DatabaseGate) and,
// past onboarding, only once a global currency exists. Open one database up front, through the same
// readiness store, on the Jest host-SQLite driver, and choose a currency.
// tests/integration/database-gate.test.tsx covers the gate; goal-ui.test.tsx covers onboarding.
beforeAll(async () => {
  await freshAppDatabase('navigation');
  await chooseCurrency('EUR');
});

afterAll(async () => {
  await resetApp();
});

async function goBack() {
  await act(async () => {
    router.back();
  });
}

describe('app navigation shell', () => {
  it('opens Home at the root route', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    expect(screen).toHavePathname('/');
    expect(screen.getByText('Start your first goal')).toBeOnTheScreen();
  });

  it('pushes a detail screen on the Home stack and returns with back', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    await userEvent.press(screen.getByText('Open details'));
    expect(screen).toHavePathname('/details');
    expect(screen.getByText('Detail screen')).toBeOnTheScreen();
    expect(screen.queryByText('Open details')).not.toBeOnTheScreen();

    await goBack();
    expect(screen).toHavePathname('/');
    expect(screen.getByText('Open details')).toBeOnTheScreen();
  });

  it('presents the sample form from the root stack and dismisses it', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    await userEvent.press(screen.getByText('Open sample form (development only)'));
    expect(screen).toHavePathname('/sample-form');
    expect(screen.getByText('Native form sheet')).toBeOnTheScreen();

    await userEvent.press(screen.getByText('Done'));
    expect(screen).toHavePathname('/');
  });

  it('reaches Settings from Home and shows delivery diagnostics', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    await userEvent.press(screen.getByText('Settings'));
    expect(screen).toHavePathname('/settings');
    expect(screen.getByText('Runtime')).toBeOnTheScreen();
    expect(screen.getByText('Channel')).toBeOnTheScreen();
  });

  it('switches between the three tabs', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    for (const pathname of ['/challenges', '/collection', '/'] as const) {
      await act(async () => {
        router.navigate(pathname);
      });
      expect(screen).toHavePathname(pathname);
    }
  });

  it('keeps Home as the back target when Settings is opened by deep link', async () => {
    await renderRouter(appDir, { initialUrl: '/settings' });
    expect(screen).toHavePathname('/settings');
    await goBack();
    expect(screen).toHavePathname('/');
  });

  it('opens the development component gallery from Settings', async () => {
    await renderRouter(appDir, { initialUrl: '/settings' });
    await userEvent.press(screen.getByRole('button', { name: 'Component gallery (development only)' }));
    expect(screen).toHavePathname('/dev-gallery');
    expect(screen.getByText('Text roles')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Saving' }).length).toBeGreaterThan(0);
  });

  it('opens the development layout lab from Settings', async () => {
    await renderRouter(appDir, { initialUrl: '/settings' });
    await userEvent.press(screen.getByRole('button', { name: 'Layout lab (development only)' }));
    expect(screen).toHavePathname('/dev-layout');
    expect(screen.getByText('Fallback composition')).toBeOnTheScreen();
  });

  it('keeps the layout lab draft and selection across a pushed screen, a tab switch and a sheet', async () => {
    await renderRouter(appDir, { initialUrl: '/dev-layout' });
    await userEvent.type(screen.getByTestId('layout-lab-draft'), 'keep me');
    await userEvent.press(screen.getByRole('button', { name: 'Lighthouse' }));

    await userEvent.press(screen.getByRole('button', { name: 'Push a detail screen' }));
    expect(screen).toHavePathname('/details');
    await goBack();
    expect(screen).toHavePathname('/dev-layout');

    for (const pathname of ['/challenges', '/dev-layout'] as const) {
      await act(async () => {
        router.navigate(pathname);
      });
    }
    expect(screen).toHavePathname('/dev-layout');

    await userEvent.press(screen.getByRole('button', { name: 'Open sample form sheet' }));
    expect(screen).toHavePathname('/sample-form');
    await goBack();

    expect(screen).toHavePathname('/dev-layout');
    expect(screen.getByTestId('layout-lab-draft')).toHaveDisplayValue('keep me');
    expect(screen.getByRole('button', { name: 'Lighthouse (selected)' })).toBeOnTheScreen();
    expect(screen.getByTestId('layout-lab-saves')).toHaveTextContent('Pretend saves: 0. Nothing is stored.');
  });
});

describe('release routes', () => {
  const globals = globalThis as { __DEV__?: boolean };
  const originalDev = globals.__DEV__;

  beforeEach(() => {
    globals.__DEV__ = false;
  });

  afterEach(() => {
    globals.__DEV__ = originalDev;
  });

  it('hides the gallery entry and redirects its deep link when __DEV__ is false', async () => {
    await renderRouter(appDir, { initialUrl: '/settings' });
    expect(screen.queryByText('Component gallery (development only)')).not.toBeOnTheScreen();

    await act(async () => {
      router.navigate('/dev-gallery');
    });
    expect(screen).not.toHavePathname('/dev-gallery');
    expect(screen.queryByText('Text roles')).not.toBeOnTheScreen();
  });

  it('hides the development layout lab and sample form sheet when __DEV__ is false', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    expect(screen.queryByText('Open sample form (development only)')).not.toBeOnTheScreen();
    await act(async () => {
      router.navigate('/settings');
    });
    expect(screen.queryByText('Layout lab (development only)')).not.toBeOnTheScreen();

    for (const pathname of ['/dev-layout', '/sample-form'] as const) {
      await act(async () => {
        router.navigate(pathname);
      });
      expect(screen).not.toHavePathname(pathname);
    }
    expect(screen.queryByText('Layout lab')).not.toBeOnTheScreen();
    expect(screen.queryByText('Native form sheet')).not.toBeOnTheScreen();
  });
});
