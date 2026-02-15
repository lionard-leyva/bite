const React = require('react');
const { Text } = require('react-native');

function MockIcon(props) {
  return React.createElement(Text, {
    testID: props.testID,
    accessibilityLabel: props.accessibilityLabel,
  }, props.name);
}

module.exports = {
  Ionicons: MockIcon,
  MaterialIcons: MockIcon,
  FontAwesome: MockIcon,
  createIconSet: () => MockIcon,
};
