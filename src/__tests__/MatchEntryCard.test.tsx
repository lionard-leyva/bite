import { render, fireEvent, screen } from '@testing-library/react-native';
import MatchEntryCard from '../components/MatchEntryCard';

describe('MatchEntryCard', () => {
  it('renders the call to action', () => {
    render(<MatchEntryCard pendingCount={3} onPress={jest.fn()} />);
    expect(screen.getByText('¿Dónde cenamos hoy?')).toBeTruthy();
    expect(screen.getByText('3 pendientes · votad sin ver lo del otro')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<MatchEntryCard pendingCount={3} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces the pending count for screen readers', () => {
    render(<MatchEntryCard pendingCount={5} onPress={jest.fn()} />);
    expect(screen.getByLabelText('¿Dónde cenamos hoy? 5 pendientes')).toBeTruthy();
  });
});
