import type { Restaurant } from '../types';

const mockRestaurants: Restaurant[] = [
  {
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
    createdAt: new Date(),
    updatedAt: new Date(),
    listId: 'list1',
  },
  {
    id: '2',
    name: 'Sushi Go',
    address: 'Gran Via 25, Madrid',
    latitude: 40.42,
    longitude: -3.71,
    rating: 5,
    note: '',
    photoURL: null,
    photoURLs: [],
    visited: false,
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    listId: 'list1',
  },
  {
    id: '3',
    name: 'Burger King',
    address: 'Calle Alcala 50, Madrid',
    latitude: 40.418,
    longitude: -3.695,
    rating: 2,
    note: '',
    photoURL: null,
    photoURLs: [],
    visited: true,
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    listId: 'list1',
  },
];

type FilterValue = 'all' | 'visited' | 'pending';

function filterRestaurants(
  restaurants: Restaurant[],
  filter: FilterValue,
  search: string,
): Restaurant[] {
  let list = restaurants;

  if (filter === 'visited') list = list.filter((r) => r.visited);
  else if (filter === 'pending') list = list.filter((r) => !r.visited);

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q),
    );
  }

  return list;
}

describe('searchFilter', () => {
  it('returns all restaurants with no filter and no search', () => {
    const result = filterRestaurants(mockRestaurants, 'all', '');
    expect(result).toHaveLength(3);
  });

  it('filters visited restaurants', () => {
    const result = filterRestaurants(mockRestaurants, 'visited', '');
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.visited)).toBe(true);
  });

  it('filters pending restaurants', () => {
    const result = filterRestaurants(mockRestaurants, 'pending', '');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sushi Go');
  });

  it('searches by name (case-insensitive)', () => {
    const result = filterRestaurants(mockRestaurants, 'all', 'sushi');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sushi Go');
  });

  it('searches by address', () => {
    const result = filterRestaurants(mockRestaurants, 'all', 'gran via');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sushi Go');
  });

  it('combines filter and search', () => {
    const result = filterRestaurants(mockRestaurants, 'visited', 'madrid');
    expect(result).toHaveLength(2);
  });

  it('returns empty for no matches', () => {
    const result = filterRestaurants(mockRestaurants, 'all', 'pizzeria');
    expect(result).toHaveLength(0);
  });

  it('trims search whitespace', () => {
    const result = filterRestaurants(mockRestaurants, 'all', '  sushi  ');
    expect(result).toHaveLength(1);
  });
});
