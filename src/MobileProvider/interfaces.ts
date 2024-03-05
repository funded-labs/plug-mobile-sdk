export interface MobileProviderOptions {
  debug?: boolean
  walletConnectProjectId: string
  window: any
}

export interface AgentOptions {
  targets: string[]
  host?: string
}

export interface TransferParams {
  to: string
  amount: number
  subaccount?: Uint8Array | number[]
  fee?: number
}

export interface TransferTokenParams extends TransferParams {
  canisterId: string
  standard: string
}
