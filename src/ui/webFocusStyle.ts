import { Platform } from 'react-native';

import { colors } from './theme';

/**
 * Web only: a thick, two-tone focus ring for keyboard users. White inner ring
 * and navy outer ring stay visible on both the white cards and the blue page
 * (WCAG 2.4.7 and 1.4.11). Shown only for keyboard focus, not mouse clicks.
 */
export const FOCUS_CSS = `
:focus-visible {
  outline: none !important;
  box-shadow: 0 0 0 3px ${colors.white}, 0 0 0 6px ${colors.navy} !important;
}
`;

export function installWebFocusStyle(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('between-focus-style')) return;
  const style = document.createElement('style');
  style.id = 'between-focus-style';
  style.textContent = FOCUS_CSS;
  document.head.appendChild(style);
}
