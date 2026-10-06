declare module 'react-dom/client' {
  export function createRoot(container: Element): { render(children: import('react').ReactNode): void; unmount(): void };
}
