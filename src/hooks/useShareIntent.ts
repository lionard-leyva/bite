import { useEffect } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { getInitialShare, addShareListener } from '../../modules/share-intent';
import type { RootStackParamList } from '../navigation/types';

// Opens SaveScreen with whatever was shared to Bite from another app.
// Mounted inside the tabs, so a share received on the Auth screen waits until the user is in.
export function useShareIntent() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    const open = (sharedText: string) => navigation.navigate('Save', { sharedText });

    const initial = getInitialShare();
    if (initial) open(initial);
    return addShareListener(open);
  }, [navigation]);
}
