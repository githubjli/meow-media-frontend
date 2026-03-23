import { history } from '@umijs/max';
import { useEffect } from 'react';

export default function EducationRedirectPage() {
  useEffect(() => {
    history.replace('/browse?category=education');
  }, []);

  return null;
}
