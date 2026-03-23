import { history } from '@umijs/max';
import { useEffect } from 'react';

export default function NewsRedirectPage() {
  useEffect(() => {
    history.replace('/browse?category=news');
  }, []);

  return null;
}
