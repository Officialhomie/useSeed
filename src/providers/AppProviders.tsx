'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { PrivyProvider } from '@privy-io/react-auth';
import { BiconomyProvider } from './BiconomyProvider';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient())
 
  return (
    <PrivyProvider 
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: '/logo.png' // Update this with your actual logo path
        },
        embeddedWallets: {
          createOnLogin: 'all-users'         
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BiconomyProvider>
          {children}
        </BiconomyProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}