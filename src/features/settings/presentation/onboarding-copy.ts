// English copy for the three onboarding steps (owner redesign, D132).
export const ONBOARDING_COPY = {
  welcomeTitle: 'Welcome to Saving Worlds',
  welcomeSubtitle: 'Turn your savings goals into little worlds that grow with every step.',
  next: 'Next',
  howTitle: 'How it works',
  howBody: 'You keep your money wherever you like. Saving Worlds simply tracks what you set aside.',
  howSteps: ['Set a goal', 'Record savings', 'Watch it grow'],
  howPicture: 'An island that grows from empty to complete as you record your savings.',
  recordLine: 'A record, not a bank account.',
  recordTitle: 'A record, not a bank account',
  recordMessage:
    'Saving Worlds never holds, moves or checks your money. You record what you set aside yourself, and your records stay on this iPhone.',
  currencyTitle: 'Choose your currency',
  currencyLine: 'Every goal uses it. You can change it until your first savings entry.',
  getStarted: 'Get Started',
  back: 'Back',
  stepOf: (step: number, count: number) => `Step ${step} of ${count}`,
} as const;

// The strip of three small Islands is one spoken element: the picture, then its three captions.
export function howPictureLabel(): string {
  return `${ONBOARDING_COPY.howPicture} ${ONBOARDING_COPY.howSteps.join(', ')}.`;
}
