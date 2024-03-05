![](https://plug-cdn.s3.amazonaws.com/dab-collections/mobile-connect-banner.png)

# Plug Mobile SDK

## Introduction

Plug mobile SDK is a suite that allows you to have an authenticated session with you dApp withing mobile device browser, request token transfers or approve.

## Installation

`yarn add @funded-labs/plug-mobile-sdk`

## Integrating Plug Mobile with your dApp

As a secure exchange channel SDK uses WalletConnect, therefore you will have to create account and obtain Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/sign-in)

1. Check that your dApp is running in mobile environment - for that we provider helper method

```javascript
import { PlugMobileProvider } from '@funded-labs/plug-mobile-sdk'

const isMobile = PlugMobileProvider.isMobileBrowser()
```

2. Initialize provider if running in mobile environment

```javascript
if (isMobile) {
  const provider = new PlugMobileProvider({
    debug: true, // If you want to see debug logs in console
    walletConnectProjectId: '', // Project ID from WalletConnect console
    window: window,
  })
  provider.initialize().catch(console.log)
}
```

3. In order to esablish connection between dApp and Mobile app you need to pair.

```javascript
if (!mobileProvider.isPaired()) {
  mobileProvider.pair().catch(console.log)
}
```

## Creating agent

When creating actor using SDK, identity delegation request will be performed.

> :information_source: Note that for security reasons Plug will restrict identity delegations to token and NFT canisters. Those canisters will be filtered out from the target array, when delegating identity

```javascript
const createAgent = async () => {
  const agent = await mobileProvider.createAgent({
    host: 'https://icp0.io',
    targets: [], // List of canister you are planning to call
  })
  return agent
}
```

You can then use returned agent with delegated identity to create actors etc.

## Mobile Provider available methods

### Requesting ICP transfer

#### `requestTransfer`

| Key        | Type                   | Required | Notes                   |
| ---------- | ---------------------- | -------- | ----------------------- |
| to         | String                 | True     | Principal or account ID |
| amount     | number                 | True     | E8s                     |
| subaccount | Uint8Array or number[] | False    |                         |
| fee        | number                 | False    | E8s                     |

### Requesting Token transfer

#### `requestTokenTransfer`

| Key        | Type                   | Required | Notes                      |
| ---------- | ---------------------- | -------- | -------------------------- |
| canisterId | String                 | True     |                            |
| standard   | String                 | True     | ICRC1, ICRC2, DIP20, DRC20 |
| to         | String                 | True     | Principal                  |
| amount     | number                 | True     | E8s                        |
| subaccount | Uint8Array or number[] | False    |                            |
| fee        | number                 | False    | E8s                        |
