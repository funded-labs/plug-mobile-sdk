import UniversalProvider from '@walletconnect/universal-provider'
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1'
import { DelegationChain, DelegationIdentity } from '@dfinity/identity'

import { WC_CHAIN_ID, WC_METHODS } from '../constants/walletConnect'
import {
  AgentOptions,
  MobileProviderOptions,
  TransferParams,
  TransferTokenParams,
} from './interfaces'
import { arrayBufferToBase64 } from '../utils/arrayBuffer'
import { HttpAgent } from '@dfinity/agent'
import { SessionTypes } from '@walletconnect/types'

const LOCAL_SESIONS_KEY = 'session'
const DELEGATION = 'delegation'

const ICP_WC_NAMESPACE = {
  icp: {
    methods: WC_METHODS,
    events: ['chainChanged", "accountsChanged'],
    chains: [WC_CHAIN_ID],
  },
}

class MobileProvider {
  private readonly walletConnectProjectId: string
  private readonly window: Window
  private readonly debug: boolean | undefined
  private readonly localIdentity: Secp256k1KeyIdentity

  private provider: UniversalProvider | null = null
  private isWallectConnectPaired = false
  private walletConnectSession: any = null
  private delegatedIdentity: DelegationIdentity | undefined
  private isFocused: boolean = true

  private wcPairUri: string | undefined
  private connectionPromise: (() => Promise<SessionTypes.Struct>) | undefined

  constructor(options: MobileProviderOptions) {
    this.walletConnectProjectId = options.walletConnectProjectId
    this.debug = options.debug
    this.window = options.window

    const backedUpSession = localStorage.getItem(LOCAL_SESIONS_KEY)
    if (backedUpSession) {
      this.localIdentity = Secp256k1KeyIdentity.fromJSON(backedUpSession)
    } else {
      this.localIdentity = Secp256k1KeyIdentity.generate()
      localStorage.setItem(
        LOCAL_SESIONS_KEY,
        JSON.stringify(this.localIdentity.toJSON())
      )
    }

    const backedUpDelegation = localStorage.getItem(DELEGATION)
    if (backedUpDelegation) {
      this.delegatedIdentity =
        this.createIdentityFromDelegation(backedUpDelegation)
    }
  }

  public async initialize() {
    const provider = await UniversalProvider.init({
      projectId: this.walletConnectProjectId,
    })
    this.provider = provider
    const sessions = provider.client.session.getAll()

    if (sessions.length > 0) {
      this.walletConnectSession = sessions[sessions.length - 1]
    } else {
      const { uri, approval } = await this.provider.client.connect({
        requiredNamespaces: ICP_WC_NAMESPACE,
      })

      // Due to iOS blocking deeplinks, that are async, have to preload it here
      this.wcPairUri = uri
      this.connectionPromise = approval
    }

    this.window.addEventListener('visibilitychange', (event) => {
      //@ts-ignore
      this.isFocused = event.target.visibilityState == 'visible'
    })
  }

  public static isMobileBrowser() {
    const ua = navigator.userAgent.toLowerCase()
    const isAndroid = ua.indexOf('android') > -1
    const isApple = ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1

    return isAndroid || isApple
  }

  private debugLog(...logItems: any[]) {
    this.debug && console.log(logItems)
  }

  public async pair() {
    if (!this.provider) return Promise.reject('Provider unavailable')
    if (this.isWallectConnectPaired) return Promise.reject('Already paired')
    if (!this.wcPairUri) return Promise.reject('URI not set')
    if (!this.connectionPromise)
      return Promise.reject('No session approval listener')

    const url = `https://plugwallet.ooo/wc?uri=${this.wcPairUri}`
    // @ts-ignore
    this.window.location = url

    const session = await this.connectionPromise()

    this.debugLog('Session approved')
    this.isWallectConnectPaired = true
    this.walletConnectSession = session

    return true
  }

  public async createAgent({ host, targets }: AgentOptions) {
    if (!this.delegatedIdentity) {
      this.delegatedIdentity = await this.createDelegatedIdentity(targets)
    }

    return new HttpAgent({ identity: this.delegatedIdentity, host })
  }

  public isPaired() {
    return !!this.walletConnectSession
  }

  public disconnect() {
    this.delegatedIdentity = undefined
    localStorage.removeItem(DELEGATION)

    return true
  }

  public requestTransfer(params: TransferParams) {
    return this.callViaWalletConnect('requestTransfer', params)
  }

  public requestTransferToken(params: TransferTokenParams) {
    return this.callViaWalletConnect('requestTransferToken', params)
  }

  private callViaWalletConnect(method: string, params: any) {
    this.debugLog('Calling via WC', { method, params })

    if (this.isFocused) {
      // @ts-ignore
      this.window.location = 'https://plugwallet.ooo/wc'
    }

    return this.provider?.client.request({
      chainId: WC_CHAIN_ID,
      topic: this.walletConnectSession.topic,
      request: {
        method,
        params,
      },
    })
  }

  private createIdentityFromDelegation(delegation: string) {
    const delegationChain = DelegationChain.fromJSON(delegation)

    localStorage.setItem(DELEGATION, delegation)

    return DelegationIdentity.fromDelegation(
      this.localIdentity,
      delegationChain
    )
  }

  private async createDelegatedIdentity(targets: string[]) {
    const publicKey = arrayBufferToBase64(
      this.localIdentity.getPublicKey().derKey
    )

    const delegation = await this.callViaWalletConnect('requestDelegation', {
      publicKey,
      targets,
    })

    this.debugLog('Delegation response', delegation)

    //@ts-ignore
    return this.createIdentityFromDelegation(delegation)
  }
}

export default MobileProvider
