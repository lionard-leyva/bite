import { Keyboard, KeyboardAvoidingView, ScrollView, View, Platform, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useEffect, useRef, useState, type MutableRefObject, type ReactNode, type Ref } from 'react';
import { keyboardOverlap } from '../utils/keyboardOverlap';

interface KeyboardFormProps extends ScrollViewProps {
  children: ReactNode;
  avoid?: boolean;
  scrollRef?: Ref<ScrollView>;
  keyboardVerticalOffset?: number;
  containerClassName?: string;
  scrollClassName?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export default function KeyboardForm({
  children,
  avoid = true,
  scrollRef,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 80 : 20,
  containerClassName,
  scrollClassName,
  contentContainerStyle,
  ...scrollProps
}: KeyboardFormProps) {
  const contentStyle: StyleProp<ViewStyle> = [
    { flexGrow: 1, paddingBottom: 24 },
    contentContainerStyle,
  ];

  const innerScrollRef = useRef<ScrollView | null>(null);
  const scrollToEndOnResize = useRef(false);
  // Posicion antes de abrir el teclado: al cerrarlo se vuelve a ella para que los primeros campos no queden fuera de pantalla.
  const scrollOffset = useRef(0);
  const offsetBeforeKeyboard = useRef<number | null>(null);
  const [keyboardSpacer, setKeyboardSpacer] = useState(0);

  // Con edge-to-edge en Android <= 14 la ventana no se redimensiona al abrir el teclado y este tapa el final del
  // formulario. Se mide cuanto tapa y se anade ese alto al contenido para poder desplazarlo por encima.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      if (offsetBeforeKeyboard.current === null) offsetBeforeKeyboard.current = scrollOffset.current;
      innerScrollRef.current?.getNativeScrollRef?.()?.measureInWindow((_x, y, _width, height) => {
        const overlap = keyboardOverlap(y + height, e.endCoordinates.screenY);
        scrollToEndOnResize.current = overlap > 0;
        setKeyboardSpacer(overlap);
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardSpacer(0);
      if (offsetBeforeKeyboard.current !== null) {
        innerScrollRef.current?.scrollTo({ y: offsetBeforeKeyboard.current, animated: false });
        offsetBeforeKeyboard.current = null;
      }
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const setScrollRef = (node: ScrollView | null) => {
    innerScrollRef.current = node;
    if (typeof scrollRef === 'function') scrollRef(node);
    else if (scrollRef) (scrollRef as MutableRefObject<ScrollView | null>).current = node;
  };

  const scrollView = (
    <ScrollView
      ref={setScrollRef}
      className={scrollClassName}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...scrollProps}
      scrollEventThrottle={16}
      onScroll={(e) => {
        scrollOffset.current = e.nativeEvent.contentOffset.y;
        scrollProps.onScroll?.(e);
      }}
      onContentSizeChange={(width, height) => {
        if (scrollToEndOnResize.current) {
          scrollToEndOnResize.current = false;
          innerScrollRef.current?.scrollToEnd({ animated: true });
        }
        scrollProps.onContentSizeChange?.(width, height);
      }}
    >
      {children}
      {keyboardSpacer > 0 && <View style={{ height: keyboardSpacer }} />}
    </ScrollView>
  );

  if (!avoid) return scrollView;

  return (
    <KeyboardAvoidingView
      className={containerClassName ?? 'flex-1'}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {scrollView}
    </KeyboardAvoidingView>
  );
}
