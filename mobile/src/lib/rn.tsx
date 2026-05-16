// Wrappery komponentow react-native ktore akceptuja prop `className` i konwertuja
// go na inline `style` przez twrnc (Tailwind CSS for React Native).
//
// Dzieki temu dziala na obu platformach:
// - native: twrnc generuje natywny style object z klas Tailwind
// - web:    RN Web zamienia style object na CSS atomic classes -> przegladarka renderuje
//
// Zalozenie: tailwind.config.js w korzeniu projektu definiuje paleta brand + reszta motywu.

import { forwardRef } from 'react';
import type { ComponentType, ComponentPropsWithRef } from 'react';
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  TextInput as RNTextInput,
  ScrollView as RNScrollView,
  FlatList as RNFlatList,
  Image as RNImage,
  Modal as RNModal,
  ActivityIndicator as RNActivityIndicator,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  RefreshControl as RNRefreshControl,
} from 'react-native';
import { create } from 'twrnc';
import tailwindConfig from '../../tailwind.config.js';

const tw = create(tailwindConfig);

function withClassName<C extends ComponentType<any>>(Component: C) {
  const Styled = forwardRef<unknown, ComponentPropsWithRef<C> & { className?: string }>(
    (props, ref) => {
      const { className, style, ...rest } = props as { className?: string; style?: unknown };
      if (!className) {
        return <Component ref={ref as never} style={style} {...(rest as never)} />;
      }
      // tw.style() przyjmuje string i zwraca obiekt style.
      // Laczymy z user-provided style aby zachowac inline overrides.
      const twStyle = tw.style(className);
      return (
        <Component
          ref={ref as never}
          style={style ? [twStyle, style] : twStyle}
          {...(rest as never)}
        />
      );
    },
  );
  Styled.displayName = `WithClassName(${Component.displayName || Component.name || 'Component'})`;
  return Styled as unknown as C;
}

export const View = withClassName(RNView);
export const Text = withClassName(RNText);
export const Pressable = withClassName(RNPressable);
export const TextInput = withClassName(RNTextInput);
export const ScrollView = withClassName(RNScrollView);
export const FlatList = withClassName(RNFlatList) as unknown as typeof RNFlatList;
export const Image = withClassName(RNImage);
export const Modal = RNModal;                              // Modal nie potrzebuje stylowania
export const ActivityIndicator = withClassName(RNActivityIndicator);
export const KeyboardAvoidingView = withClassName(RNKeyboardAvoidingView);
export const RefreshControl = RNRefreshControl;

export { Platform, Alert, Linking } from 'react-native';
