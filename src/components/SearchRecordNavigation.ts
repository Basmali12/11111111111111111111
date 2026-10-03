import { createContext, useContext } from 'react';

export interface SearchRecordTarget {
  category: string;
  record: any;
  folderId?: string;
  source?: string;
}

export const SearchRecordNavigation = createContext<{
  target: SearchRecordTarget | null;
  open: (target: SearchRecordTarget) => void;
}>({ target: null, open: () => {} });

export const useSearchRecordTarget = () => useContext(SearchRecordNavigation).target;
