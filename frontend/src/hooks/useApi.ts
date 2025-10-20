import { useState, useCallback } from 'react';

export interface ApiCallOptions<T> {
  onSuccess?: (data: T) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (error: any) => void;
  onFinally?: () => void;
}

export interface ApiCallState<T> {
  data: T | null;
  isLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
  isSuccess: boolean;
  isError: boolean;
}

export const useApi = <T>() => {
  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isSuccess: false,
    isError: false,
  });

  const callApi = useCallback(
    async (
      apiCall: () => Promise<T>,
      options: ApiCallOptions<T> = {}
    ): Promise<T> => {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        isSuccess: false,
        isError: false,
      }));

      try {
        const data = await apiCall();
        
        setState({
          data,
          isLoading: false,
          error: null,
          isSuccess: true,
          isError: false,
        });

        options.onSuccess?.(data);
        return data;
      } catch (error) {
        console.error('API Error:', error);
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error,
          isSuccess: false,
          isError: true,
        }));

        options.onError?.(error);
        throw error;
      } finally {
        options.onFinally?.();
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return {
    ...state,
    callApi,
    reset,
  };
};

export default useApi;