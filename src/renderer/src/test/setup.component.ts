import { afterEach } from 'vitest';
import '../../assets/main.css';

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});
