import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import {
  DRAG_HANDLE_WIDTH,
  DRAG_HANDLE_HEIGHT,
  DRAG_HANDLE_BORDER_RADIUS,
} from '../config/constants';

export default function DragHandle() {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
      <View
        style={{
          width: DRAG_HANDLE_WIDTH,
          height: DRAG_HANDLE_HEIGHT,
          backgroundColor: colors.border,
          borderRadius: DRAG_HANDLE_BORDER_RADIUS,
        }}
      />
    </View>
  );
}
