import {
  findLocalDialect,
  getActiveDialect,
  getActiveDialectSlug,
  readLocalDialects,
  setActiveDialectSlug,
  useDialectsContext,
  useStandaloneDialects,
  writeLocalDialects,
  type DialectsContextValue,
} from '@/contexts/DialectsContext';

export {
  findLocalDialect,
  getActiveDialect,
  getActiveDialectSlug,
  readLocalDialects,
  setActiveDialectSlug,
  writeLocalDialects,
};

export function useDialects(): DialectsContextValue {
  const ctx = useDialectsContext();
  const standalone = useStandaloneDialects(ctx === null);
  return ctx ?? standalone;
}
