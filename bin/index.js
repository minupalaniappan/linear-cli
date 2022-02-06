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
  COMMAND_MAPPING = {
    'get-key': this.getKey,
    'set-key': this.setKey,
    'get-client': this.getClient
  }

  constructor() {
    this.getKey() && this.setClient()
  }

  setKey() {
    const key = get(argv, '_[1]')

    if (key) {
      localStorage.setItem('apiKey', key)
      return `Message: API Key set to ${key}`
    } else {
      return `Message: API Key is not provided`
    }
  }

  getKey() {
    return localStorage.getItem('apiKey')
  }

  setClient() {
    this.client = new LinearClient({
      apiKey: this.getKey()
    })
  }

  getClient() {
    return this.client
  }

  async execute() {
    const command = first(argv._)

    if (this.COMMAND_MAPPING[command]) {
      console.log(await this.COMMAND_MAPPING[command]())
    } else {
      console.error('Message: Command not found')
    }
  }
}

new Linear().execute()


