import {
  ethers
} from 'ethers'
import SimpleStoreJSON from '../truffle/build/contracts/SimpleStore.json'
import {
  NonceTxMiddleware,
  SignedEthTxMiddleware,
  CryptoUtils,
  Client,
  LoomProvider,
  Address,
  LocalAddress,
  Contracts,
  EthersSigner,
  createDefaultTxMiddleware
} from 'loom-js'

const Web3 = require('web3')

var sample = new Vue({
  el: '#increase-counter',
  data: {
    counter: 0,
    info: 'You will see a Metamask popup. Sign the transaction and wait a bit it gets initialized...',
    web3js: null,
    chainId: 'extdev-plasma-us1',
    writeUrl: 'wss://extdev-plasma-us1.dappchains.com/websocket',
    readUrl: 'wss://extdev-plasma-us1.dappchains.com/queryws',
    networkId: 9545242630824,
    callerChainId: 'eth',
    ethAddress: null,
    client: null,
    loomProvider: null,
    contract: null,
    publicKey: null
  },
  methods: {
    async init () {
      const privateKey = CryptoUtils.generatePrivateKey()
      this.publicKey = CryptoUtils.publicKeyFromPrivateKey(privateKey)
      this.client = new Client(
        this.chainId,
        this.writeUrl,
        this.readUrl
      )
      const ethersProvider = new ethers.providers.Web3Provider(this.web3js.currentProvider)
      const signer = ethersProvider.getSigner()
      this.ethAddress = await signer.getAddress()
      const to = new Address('eth', LocalAddress.fromHexString(this.ethAddress))
      const from = new Address(this.client.chainId, LocalAddress.fromPublicKey(this.publicKey))
      this.client.txMiddleware = createDefaultTxMiddleware(this.client, privateKey)
      const addressMapper = await Contracts.AddressMapper.createAsync(
        this.client,
        new Address(this.client.chainId, LocalAddress.fromPublicKey(this.publicKey))
      )
      if (await addressMapper.hasMappingAsync(to)) {
        console.log('Mapping already exists.')
      } else {
        console.log('Adding a new mapping.')
        const ethersSigner = new EthersSigner(signer)
        await addressMapper.addIdentityMappingAsync(from, to, ethersSigner)
      }
      this.loomProvider = new LoomProvider(this.client, privateKey)
      this.loomProvider.callerChainId = this.callerChainId
      this.loomProvider.setMiddlewaresForAddress(to.local.toString(), [
        new NonceTxMiddleware(
          new Address(this.callerChainId, LocalAddress.fromHexString(this.ethAddress)),
          this.client
        ),
        new SignedEthTxMiddleware(signer)
      ])
      return true
    },

    async getContract () {
      const web3 = new Web3(this.loomProvider)
      this.contract = new web3.eth.Contract(SimpleStoreJSON.abi, SimpleStoreJSON.networks[this.networkId].address)
    },

    async testEthSigning () {
      const value = parseInt(this.counter, 10)
      await this.contract.methods
        .set(value)
        .send({
          from: this.ethAddress
        })
    },

    async increment () {
      this.info = 'Please sign the transaction.'
      this.counter += 1
      await this.testEthSigning()
    },

    async decrement () {
      this.info = 'Please sign the transaction.'
      if (this.counter > 0) {
        this.counter -= 1
        await this.testEthSigning()
      } else {
        console.log('counter should be > 1.')
      }
    },

    async filterEvents () {
      this.contract.events.NewValueSet({ filter: { } }, (err, event) => {
        if (err) console.error('Error on event', err)
        else {
          if (event.returnValues._value.toString() === this.counter.toString()) {
            this.info = 'Looking good! Expected: ' + this.counter.toString() + ', Returned: ' + event.returnValues._value.toString()
          } else {
            this.info = 'An error occured! Expected: ' + this.counter.toString() + ', Returned: ' + event.returnValues._value.toString()
          }
        }
      })
    },

    async  ethSigningDemo () {
      if (await this.init()) {
        await this.getContract()
        await this.filterEvents()
        await this.testEthSigning()
      }
    },

    async loadWeb3 () {
      if (window.web3) {
        window.web3 = new Web3(window.web3.currentProvider)
        this.web3js = new Web3(window.web3.currentProvider)
      } else {
        alert('Metamask is not Enabled')
      }
    }
  },
  async mounted () {
    await this.loadWeb3()
    await this.ethSigningDemo()
  }
})
