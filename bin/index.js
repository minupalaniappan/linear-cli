#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk')
const { exec } = require('child_process')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const first = require('lodash/first')
const last = require('lodash/last')
const get = require('lodash/get')
const MarkdownIt = require('markdown-it')
const { convert: toHTML } = require('html-to-text')

const LINEAR_ISSUE_URL = 'linear://middesk/issue/'
const LINEAR_WEB_URL = 'https://linear.app/middesk/issue/'

/**
 * Initialize Local Storage if it has not been initialized before.
 */

if (typeof localStorage === 'undefined' || localStorage === null) {
  let LocalStorage = require('node-localstorage').LocalStorage
  localStorage = new LocalStorage('/tmp/linear-cli/storage')
}

class Linear {
  constructor() {
    this.getKey() && this.setClient()
    this.setCommands()
    this.setMD()
  }

  setMD = () => {
    this.md = new MarkdownIt()
  }

  setCommands = () => {
    this.commands = {
      'get-key': this.getKey,
      'set-key': this.setKey,
      'get-client': this.getClient,
      info: this.describeCurrentTicket,
      'get-id': this.getBranchId,
      open: this.openLinearTicket
    }
  }

  getCommand = () => {
    return get(argv, '_[1]')
  }

  setKey = () => {
    const key_ = this.getCommand()

    if (key_) {
      localStorage.setItem('apiKey', key_)
      return `Info: API Key set to ${key_}`
    } else {
      throw `API Key is not provided`
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
    if (!this.client) {
      throw `Unable to get client`
    }

    return this.client
  }

  getBranch = () => {
    return new Promise((resolve) => {
      return exec('git rev-parse --abbrev-ref HEAD', (err, stdout) => {
        if (err) {
          throw 'Unable to read current branch'
        } else if (typeof stdout === 'string') {
          resolve(stdout.trim())
        } else {
          throw 'Unable to identify branch'
        }
      })
    })
  }

  branchToId = (branch) => {
    const tokens = last(branch.split('/')).split('-')

    if (tokens.length > 2) {
      return `${tokens[0].toUpperCase()}-${tokens[1].toUpperCase()}`
    } else {
      throw `Unable to parse branch from ID`
    }
  }

  openLinearTicket = async () => {
    const id = await this.getBranchId()

    if (id) {
      try {
        exec(`open ${LINEAR_ISSUE_URL}${id}`)
      } catch {
        exec(`open ${LINEAR_WEB_URL}${id}`)
      }
    } else {
      throw `Error: Unable to find ticket with id ${id}`
    }

    return 'Info: Ticket opened!'
  }

  findAssociatedLinearTicket = async (ticketId) => {
    const item = await this.client.client.rawRequest(
      `
      query issue($id: String!) {
        issue(id: $id) {
          id
          title
          completedAt
          description
        }
      }`,
      { id: ticketId }
    )

    return item
  }

  describeCurrentTicket = async () => {
    const id = await this.getBranchId()

    let ticketPayload = null

    if (id) {
      ticketPayload = await this.findAssociatedLinearTicket(id)
    } else {
      throw `Error: Unable to find ticket with id ${id}`
    }

    if (ticketPayload.status === 200) {
      const {
        data: { issue }
      } = ticketPayload

      return `Title: ${issue.title} \n${
        issue.completedAt ? `Completed At: ${issue.completedAt} \n` : ''
      }${
        issue.description
          ? `${toHTML(
              this.md.render(issue.description, {
                wordwrap: 80
              })
            ).replace('DESCRIPTION', 'Description:')}`
          : ''
      }
      `
    } else {
      throw `Unable to get valid response from Linear API`
    }
  }

  getBranchId = async () => {
    const branch = await this.getBranch()
    const id = this.branchToId(branch)

    return id
  }

  execute = async () => {
    const command = first(argv._)

    if (this.commands[command]) {
      try {
        console.log(await this.commands[command]())
      } catch (e) {
        console.error(`Error: ${e}`)
      }
    } else {
      console.error('Error: Command not found')
    }
  }
}

new Linear().execute()


