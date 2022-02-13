#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk')
const { exec } = require('child_process')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const first = require('lodash/first')
const last = require('lodash/last')
const pick = require('lodash/pick')
const get = require('lodash/get')
const MarkdownIt = require('markdown-it')
const { convert: toHTML } = require('html-to-text')
const prompt = require('prompt')

const argv = yargs(hideBin(process.argv)).argv

const LINEAR_ISSUE_URL = 'linear://middesk/issue/'
const LINEAR_WEB_URL = 'https://linear.app/middesk/issue/'

if (typeof localStorage === 'undefined' || localStorage === null) {
  let LocalStorage = require('node-localstorage').LocalStorage
  localStorage = new LocalStorage('/tmp/linear-cli/storage')
}

class Linear {
  constructor() {
    this.markdown = null
    this.client = null
    this.apikey = null
    this.ticketName = null
    this.commands = this.getCommands()

    prompt.start()
  }

  /* CLI HELPER FUNCTION IMPLEMENTATION */

  initialize = async () => {
    this.markdown = new MarkdownIt()
    this.apikey = await this.getOrSetAPIKey()
    this.client = await this.setAPIClient()
    this.ticketName = await this.setTicketName()
  }

  getCommands = () => ({
    key: this.getOrSetAPIKey,
    info: this.getTicketDetails,
    open: this.openLinearTicket,
    new: this.createSubIssue,
    clear: this.deleteStorage,
    me: this.getOrSetUser,
    team: this.getTeam
  })

  getArgument = () => {
    return get(argv, '_[1]')
  }

  setAPIClient = () => {
    return new LinearClient({
      apiKey: this.apikey
    })
  }

  getBranchName = () => {
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

  branchToTicketName = (branch) => {
    const tokens = last(branch.split('/')).split('-')

    if (tokens.length > 2) {
      return `${tokens[0].toUpperCase()}-${tokens[1].toUpperCase()}`
    }

    throw 'Unable to find the ticket name in the branch'
  }

  setTicketName = async () => {
    const branch = await this.getBranchName()
    const ticketName = this.branchToTicketName(branch)

    this.ticketName = ticketName

    return ticketName
  }

  getTeamName = () => {
    return first(this.ticketName.split('-'))
  }

  /* CLI FUNCTION IMPLEMENTATION */

  deleteStorage = () => localStorage.clear()

  getOrSetAPIKey = async () => {
    let key = localStorage.getItem('apikey')

    if (!key) {
      const { apikey } = await prompt.get(['apikey'])

      localStorage.setItem('apikey', apikey)

      return apikey
    }

    return key
  }

  getOrSetUser = async () => {
    let me = JSON.parse(localStorage.getItem('me'))

    if (!me) {
      me = await this.client.viewer
    }

    localStorage.setItem('me', JSON.stringify(me))

    return pick(me, ['displayName', 'email', 'id', 'name'])
  }

  createSubIssue = async () => {
    const { id: assigneeId } = await this.getUser()
    const { title, description } = await prompt.get(['title', 'description'])
    const { id: parentId } = await this.getTicketDetails()
    const { id: teamId } = await this.getTeam()

    return this.getClient()
      .issueCreate({
        assigneeId,
        parentId,
        title,
        description,
        teamId
      })
      .then((e) => e)
  }

  openLinearTicket = async () => {
    try {
      exec(`open ${LINEAR_ISSUE_URL}${this.ticketName}`)
    } catch {
      exec(`open ${LINEAR_WEB_URL}${this.ticketName}`)
    }
  }

  getTicketDetails = async () => {
    return this.client
      .issue(this.ticketName)
      .then((e) =>
        pick(e, ['title', 'description', 'branchName', 'completedAt'])
      )
  }

  getTeam = async () => {
    return this.client.team(this.getTeamName())
  }

  execute = async () => {
    const command = first(argv._)

    if (this.commands[command]) {
      try {
        await this.initialize()
        console.info(await this.commands[command]())
      } catch (e) {
        console.error(`Error: ${e}`)
      }
    } else {
      if (!command) {
        console.error('Error: No command provided')
      } else {
        console.error('Error: Command not found')
      }
    }
  }
}

new Linear().execute()


