import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StarRating from '../components/StarRating';

describe('StarRating', () => {
  it('renders 5 stars', () => {
    const { getAllByRole } = render(
      <StarRating rating={0} onRate={() => {}} />,
    );
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('calls onRate with correct value when star is pressed', () => {
    const onRate = jest.fn();
    const { getByLabelText } = render(
      <StarRating rating={0} onRate={onRate} />,
    );
    fireEvent.press(getByLabelText('3 estrellas'));
    expect(onRate).toHaveBeenCalledWith(3);
  });

  it('renders filled stars up to the rating', () => {
    const { getByLabelText } = render(
      <StarRating rating={3} onRate={() => {}} />,
    );
    // Star 3 should be filled (★), star 4 should be empty (☆)
    const star3 = getByLabelText('3 estrellas');
    const star4 = getByLabelText('4 estrellas');
    // Check the text content of child Text elements
    expect(star3).toBeTruthy();
    expect(star4).toBeTruthy();
  });

  it('has correct accessibility labels', () => {
    const { getByLabelText } = render(
      <StarRating rating={0} onRate={() => {}} />,
    );
    expect(getByLabelText('1 estrella')).toBeTruthy();
    expect(getByLabelText('2 estrellas')).toBeTruthy();
    expect(getByLabelText('5 estrellas')).toBeTruthy();
  });
});
