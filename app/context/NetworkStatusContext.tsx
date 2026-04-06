import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import * as Network from 'expo-network';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  isOffline: boolean;
  isInitialized: boolean;
}

const defaultStatus: NetworkStatus = {
  isConnected: true,
  isInternetReachable: true,
  isOffline: false,
  isInitialized: false,
};

const NetworkStatusContext = createContext<NetworkStatus>(defaultStatus);

interface NetworkStatusProviderProps {
  children: ReactNode;
}

export function NetworkStatusProvider({ children }: NetworkStatusProviderProps) {
  const [status, setStatus] = useState<NetworkStatus>(defaultStatus);

  useEffect(() => {
    const applyNetworkState = (networkState: Network.NetworkState) => {
      const isConnected = networkState.isConnected ?? true;
      const isInternetReachable = networkState.isInternetReachable ?? isConnected;
      const isOffline = !(isConnected && isInternetReachable);

      setStatus({
        isConnected,
        isInternetReachable,
        isOffline,
        isInitialized: true,
      });
    };

    const loadInitialState = async () => {
      try {
        const currentState = await Network.getNetworkStateAsync();
        applyNetworkState(currentState);
      } catch (error) {
        console.error('Error loading network state:', error);
        setStatus({
          ...defaultStatus,
          isInitialized: true,
        });
      }
    };

    void loadInitialState();

    const subscription = Network.addNetworkStateListener((networkState) => {
      applyNetworkState(networkState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const value = useMemo(() => status, [status]);

  return <NetworkStatusContext.Provider value={value}>{children}</NetworkStatusContext.Provider>;
}

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}
