#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const first = require('lodash/first')
const get = require('lodash/get')

/**
 * Initialize Local Storage if it has not been initialized before.
 */

if (typeof localStorage === 'undefined' || localStorage === null) {
  let LocalStorage = require('node-localstorage').LocalStorage
  localStorage = new LocalStorage('./bin/storage/tmp')
}

class Linear {
  constructor() {
    this.getKey() && this.setClient()
    this.setCommands()
  }

  setCommands = () => {
    this.commands = {
      'get-key': this.getKey,
      'set-key': this.setKey,
      'get-client': this.getClient
    }
  }

  getCommand = () => {
    return get(argv, '_[1]')
  }

  setKey = () => {
    const key_ = this.getCommand()

    if (key_) {
      localStorage.setItem('apiKey', key_)
      key = key_
      return `Message: API Key set to ${key_}`
    } else {
      return `Message: API Key is not provided`
    }
  }

  getKey = () => {
    return localStorage.getItem('apiKey')
  }

  setClient = () => {
    this.client = new LinearClient({
      apiKey: this.getKey()
    })
  }

  getClient = () => {
    return this.client
  }

  execute = async () => {
    const command = first(argv._)

    if (this.commands[command]) {
      console.log(await this.commands[command]())
    } else {
      console.error('Message: Command not found')
    }
  }
}

new Linear().execute()


