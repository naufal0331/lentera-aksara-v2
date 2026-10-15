import { createContext, useContext } from 'react';
export const AppCtx = createContext();
export const useApp = () => useContext(AppCtx);
