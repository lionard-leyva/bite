import { useEffect, useState } from 'react';
import { getListMembers } from '../services/listService';
import type { ListMember } from '../utils/savedBy';

// Miembros de la lista compartida (vacio en modo sin cuenta o mientras carga). Un fallo de red deja la lista vacia: solo se pierde la etiqueta.
export function useListMembers(listId: string | null | undefined, enabled: boolean): ListMember[] {
  const [members, setMembers] = useState<ListMember[]>([]);
  useEffect(() => {
    if (!enabled || !listId) return;
    let cancelled = false;
    getListMembers(listId)
      .then((result) => {
        if (!cancelled) setMembers(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listId, enabled]);
  return members;
}
