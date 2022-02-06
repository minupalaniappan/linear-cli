#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const first = require('lodash/first')

if (typeof localStorage === 'undefined' || localStorage === null) {
  let LocalStorage = require('node-localstorage').LocalStorage
  localStorage = new LocalStorage('./bin/storage/tmp')
}

class Linear {
  COMMAND_MAPPING = {
    key: this.getKey
  }

  constructor() {
    this.getKey() && this.setClient()
  }

  setKey() {
    argv.key && localStorage.setItem('apiKey', argv.key)
  }

  getKey() {
    localStorage.getItem('apiKey')
  }

  setClient() {
    this.client = new LinearClient({
      apiKey: this.getKey()
    })
  }

  async execute() {
    const command = first(argv._)

    if (this.COMMAND_MAPPING[command]) {
      await this.COMMAND_MAPPING[command]()
    } else {
      console.error('Command not found')
    }
  }
}

new Linear().execute()


