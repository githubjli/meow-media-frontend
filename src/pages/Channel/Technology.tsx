import { history } from '@umijs/max';
import { useEffect } from 'react';

export default function TechnologyRedirectPage() {
  useEffect(() => {
    history.replace('/categories/tech');
  }, []);

  return null;
}
