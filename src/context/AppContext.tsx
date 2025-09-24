import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppContextType, ExtractedContent, ProcessingState, ExtractionMethod } from '../types';

const initialState: AppState = {
  extractedContents: [],
  processingState: {
    isProcessing: false,
    progress: 0,
    currentStep: '',
    error: null,
  },
  activeMethod: 'direct',
};

type AppAction =
  | { type: 'ADD_EXTRACTED_CONTENT'; payload: ExtractedContent }
  | { type: 'SET_PROCESSING_STATE'; payload: Partial<ProcessingState> }
  | { type: 'SET_ACTIVE_METHOD'; payload: ExtractionMethod }
  | { type: 'CLEAR_EXTRACTED_CONTENTS' }
  | { type: 'REMOVE_EXTRACTED_CONTENT'; payload: string };

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'ADD_EXTRACTED_CONTENT':
      return {
        ...state,
        extractedContents: [action.payload, ...state.extractedContents],
      };
    case 'SET_PROCESSING_STATE':
      return {
        ...state,
        processingState: { ...state.processingState, ...action.payload },
      };
    case 'SET_ACTIVE_METHOD':
      return {
        ...state,
        activeMethod: action.payload,
      };
    case 'CLEAR_EXTRACTED_CONTENTS':
      return {
        ...state,
        extractedContents: [],
      };
    case 'REMOVE_EXTRACTED_CONTENT':
      return {
        ...state,
        extractedContents: state.extractedContents.filter(
          (content) => content.id !== action.payload
        ),
      };
    default:
      return state;
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addExtractedContent = (content: ExtractedContent) => {
    dispatch({ type: 'ADD_EXTRACTED_CONTENT', payload: content });
  };

  const setProcessingState = (processingState: Partial<ProcessingState>) => {
    dispatch({ type: 'SET_PROCESSING_STATE', payload: processingState });
  };

  const setActiveMethod = (method: ExtractionMethod) => {
    dispatch({ type: 'SET_ACTIVE_METHOD', payload: method });
  };

  const clearExtractedContents = () => {
    dispatch({ type: 'CLEAR_EXTRACTED_CONTENTS' });
  };

  const removeExtractedContent = (id: string) => {
    dispatch({ type: 'REMOVE_EXTRACTED_CONTENT', payload: id });
  };

  const contextValue: AppContextType = {
    ...state,
    addExtractedContent,
    setProcessingState,
    setActiveMethod,
    clearExtractedContents,
    removeExtractedContent,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};