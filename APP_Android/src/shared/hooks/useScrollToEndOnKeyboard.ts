import { useEffect } from 'react';
import { Keyboard, ScrollView } from 'react-native';

/**
 * Scrolls the given ScrollView to the end once the keyboard has actually
 * finished animating in. A fixed setTimeout on focus fires before Android's
 * keyboard animation completes, leaving the field the user is typing in
 * hidden behind the keyboard — this listens for the real 'keyboardDidShow'
 * event instead, so the field the user is typing in is always visible.
 */
export const useScrollToEndOnKeyboard = (
  scrollRef: React.RefObject<ScrollView | null>,
  active: boolean
) => {
  useEffect(() => {
    if (!active) return;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, [active, scrollRef]);
};
