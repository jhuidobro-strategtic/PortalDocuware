import { useEffect, useState } from 'react';
import { buildApiUrl } from '../../../helpers/api-url';

export function useDocumentDeletionPolicy() {
  const [protectedCategories, setProtectedCategories] = useState<string[] | null>(null);
  useEffect(() => {
    let controller: AbortController | undefined;
    const load = () => {
      controller?.abort(); controller = new AbortController(); const signal = controller.signal;
      void fetch(buildApiUrl('document-order-standard/'), { signal, cache: 'no-store' }).then(async (response) => {
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.protected_categories)) throw new Error('Protección no disponible');
        if (!signal.aborted) setProtectedCategories(result.protected_categories);
      }).catch(() => { if (!signal.aborted) setProtectedCategories(null); });
    };
    load(); window.addEventListener('focus', load);
    return () => { controller?.abort(); window.removeEventListener('focus', load); };
  }, []);
  return (category: string) => protectedCategories !== null && !protectedCategories.includes(category);
}
