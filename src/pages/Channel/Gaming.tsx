import { history } from '@umijs/max';
import { useEffect } from 'react';

export default function GamingRedirectPage() {
  useEffect(() => {
    history.replace('/categories/entertainment');
  }, []);

  return null;
}
