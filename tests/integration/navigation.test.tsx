import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import path from 'path';

// Renders the real route files under src/app. This proves route structure and navigation intent
// in Jest only; native tab/stack chrome is verified in the EAS development build. The Jest mock of
// NativeTabs mounts every tab, so tab switches are asserted by pathname, not by visible text.
const appDir = path.resolve(__dirname, '../../src/app');

async function goBack() {
  await act(async () => {
    router.back();
  });
}

describe('app navigation shell', () => {
  it('opens Home at the root route', async () => {
    await renderRouter(appDir, { initialUrl: '/' });
    expect(screen).toHavePathname('/');
    expect(screen.getByText('Your savings goal and world will appear here.')).toBeOnTheScreen();
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
    await userEvent.press(screen.getByText('Open sample form'));
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
});
