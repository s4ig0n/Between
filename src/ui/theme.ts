/**
 * Colors and type sizes taken from the product mockup. Text/background pairs
 * were picked to pass WCAG AA (most pass AAA) for older patients.
 */
export const colors = {
  blue: '#1F3B95', // page background, primary buttons
  blueDark: '#172C70', // pressed state
  navy: '#14213D', // main text on white
  yellow: '#F5B731', // accent: logo, done check
  white: '#FFFFFF',
  cardSoft: '#EEF2FB', // reminder card
  muted: '#4A5468', // secondary text on white (7.5:1)
  onBlueMuted: '#DCE3F7', // secondary text on blue (8:1)
  line: '#E1E6F0',
  ring: '#9AA3B5', // empty check circle
};

export const type = {
  title: 40,
  heading: 22,
  body: 19,
  small: 17,
};

/** Minimum touch target. Larger than the 44/48pt platform minimum on purpose. */
export const TAP = 56;

export const radius = { card: 24, button: 14 };
