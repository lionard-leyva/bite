import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RestaurantCard from '../components/RestaurantCard';
import type { Restaurant } from '../types';

const mockRestaurant: Restaurant = {
  id: '1',
  name: 'La Tagliatella',
  address: 'Calle Mayor 10, Madrid',
  latitude: 40.4168,
  longitude: -3.7038,
  rating: 4,
  note: 'Pasta buenisima',
  photoURL: null,
  photoURLs: [],
  visited: true,
  createdBy: 'user1',
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-15'),
  listId: 'list1',
};

describe('RestaurantCard', () => {
  it('renders restaurant name', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} onPress={() => {}} />,
    );
    expect(getByText('La Tagliatella')).toBeTruthy();
  });

  it('renders restaurant address', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} onPress={() => {}} />,
    );
    expect(getByText('Calle Mayor 10, Madrid')).toBeTruthy();
  });

  it('renders numeric rating', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} onPress={() => {}} />,
    );
    expect(getByText('4')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <RestaurantCard restaurant={mockRestaurant} onPress={onPress} />,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows visited indicator for visited restaurant', () => {
    const { getByText } = render(
      <RestaurantCard restaurant={mockRestaurant} onPress={() => {}} />,
    );
    expect(getByText('Visitado')).toBeTruthy();
  });

  it('shows pending indicator for unvisited restaurant', () => {
    const unvisited = { ...mockRestaurant, visited: false };
    const { getByText } = render(
      <RestaurantCard restaurant={unvisited} onPress={() => {}} />,
    );
    expect(getByText('Pendiente')).toBeTruthy();
  });

  it('shows placeholder when no photo', () => {
    const { getByTestId } = render(
      <RestaurantCard restaurant={mockRestaurant} onPress={() => {}} />,
    );
    expect(getByTestId('photo-placeholder')).toBeTruthy();
  });

  it('has accessibility label with restaurant info', () => {
    const { getByLabelText } = render(
      <RestaurantCard restaurant={mockRestaurant} onPress={() => {}} />,
    );
    expect(
      getByLabelText('La Tagliatella, 4 estrellas, visitado'),
    ).toBeTruthy();
  });
});
