import { KeyboardAvoidingView, ScrollView, Platform, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode, Ref } from 'react';

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

  const scrollView = (
    <ScrollView
      ref={scrollRef}
      className={scrollClassName}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...scrollProps}
    >
      {children}
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
