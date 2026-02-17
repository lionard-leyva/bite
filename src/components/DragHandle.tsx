import { View } from 'react-native';
import {
  DRAG_HANDLE_WIDTH,
  DRAG_HANDLE_HEIGHT,
  DRAG_HANDLE_COLOR,
  DRAG_HANDLE_BORDER_RADIUS,
} from '../config/constants';

export default function DragHandle() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
      <View
        style={{
          width: DRAG_HANDLE_WIDTH,
          height: DRAG_HANDLE_HEIGHT,
          backgroundColor: DRAG_HANDLE_COLOR,
          borderRadius: DRAG_HANDLE_BORDER_RADIUS,
        }}
      />
    </View>
  );
}
