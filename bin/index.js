#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk')
const { exec } = require('child_process')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const first = require('lodash/first')
const last = require('lodash/last')
const pick = require('lodash/pick')
const get = require('lodash/get')
const fs = require('fs')
const prompt = require('prompt')
const { sleep } = require('sleep')
const startCase = require('lodash/startCase')

const argv = yargs(hideBin(process.argv)).argv

const LINEAR_APP_PATH = '/Applications/Linear.app/'
const WEB_RESOURCE = 'https://linear.app/'
const SLEEP_TIME = 5

if (typeof localStorage === 'undefined' || localStorage === null) {
  let LocalStorage = require('node-localstorage').LocalStorage
  localStorage = new LocalStorage('/tmp/linear-cli/storage')
}

const BRANCH_REQUIRED_COMMANDS = ['branch', 'open', 'new', 'team']

class Linear {
  constructor() {
    this.client = null
    this.apikey = null
    this.ticketName = null
    this.commands = this.getCommands()
    this.currentCommand = null

    prompt.start()
  }

  /* CLI HELPER FUNCTION IMPLEMENTATION */
  initialize = async () => {
    this.apikey = await this.getOrSetAPIKey()
    this.client = await this.setAPIClient()
    this.ticketName = await this.setTicketName()
  }

  getCommands = () => ({
    key: () =>
      this.getOrSetAPIKey().then((apiKey) => this.printAttributes({ apiKey })),
    branch: () => this.getTicketDetails().then(this.printAttributes),
    open: () =>
      this.openLinearTicket().then((info) => this.printAttributes({ info })),
    new: () => this.createSubIssue.then(this.printAttributes),
    clear: () =>
      this.deleteStorage().then((info) => this.printAttributes({ info })),
    me: () => this.getOrSetUser().then(this.printAttributes),
    team: () => this.getTeam().then(this.printAttributes)
  })

  getArgument = () => {
    return get(argv, '_[1]')
  }

  setAPIClient = () => {
    return new LinearClient({
      apiKey: this.apikey
    })
  }

  branchRequiredCommand = () =>
    BRANCH_REQUIRED_COMMANDS.includes(this.currentCommand)

  getBranchName = () => {
    return new Promise((resolve) => {
      return exec('git rev-parse --abbrev-ref HEAD', (err, stdout) => {
        if (err && this.branchRequiredCommand()) {
          throw 'Unable to read current branch'
        } else if (typeof stdout === 'string') {
          resolve(stdout.trim())
        } else if (this.branchRequiredCommand()) {
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

    if (this.branchRequiredCommand()) {
      throw 'Unable to find the ticket name in the branch'
    }
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

  deleteStorage = () => {
    localStorage.clear()

    return Promise.resolve('Storage has been cleared!')
  }

  getOrSetAPIKey = async () => {
    let key = localStorage.getItem('apikey')

    if (!key) {
      const { apikey } = await prompt.get(['apikey'])
      localStorage.setItem('apikey', apikey)

      key = apikey
    }

    return Promise.resolve(key)
  }

  getOrganization = async () => {
    const { url } = await this.getTicketDetails()

    return url.split('/').at(2)
  }

  getOrSetUser = async () => {
    let me = JSON.parse(localStorage.getItem('me'))

    if (!me) {
      me = await this.client.viewer
    }

    localStorage.setItem('me', JSON.stringify(me))

    return pick(me, ['displayName', 'email', 'name'])
  }

  createSubIssue = async () => {
    const { id: assigneeId } = await this.getOrSetUser()
    const { title, description } = await prompt.get(['title', 'description'])
    const { id: parentId } = await this.getTicketDetails()
    const { id: teamId } = await this.getTeam()

    return this.client
      .issueCreate({
        assigneeId,
        parentId,
        title,
        description,
        teamId
      })
      .then(async (issue) => {
        console.info('Info: Creating sub issue...')

        const newIssue = await issue.issue

        console.info('Info: Created new sub issue!')

        await exec(`git branch -m ${newIssue.branchName}`)

        console.info(`Info: Switched to new branch ${newIssue.branchName}`)

        return pick(newIssue, ['title', 'branchName', 'createdAt'])
      })
  }

  getAppLinearIssue = async () => {
    const organization = await this.getOrganization()

    return `linear://${organization}/issue/${this.ticketName}`
  }

  getWebLinearIssue = async () => {
    const organization = await this.getOrganization()

    return `${WEB_RESOURCE}${organization}/issue/${this.ticketName}`
  }

  openLinearTicket = async () => {
    const linearExists = fs.existsSync(LINEAR_APP_PATH)

    if (linearExists) {
      const appURL = await this.getAppLinearIssue()

      exec(`open ${appURL}`)
      await sleep(SLEEP_TIME)
      exec(`open ${appURL}`)
    } else {
      const webURL = await this.getWebLinearIssue()
      exec(`open ${webURL}`)
    }

    return Promise.resolve('Opened ticket!')
  }

  getTicketDetails = async () => {
    return this.client
      .issue(this.ticketName)
      .then((e) =>
        pick(e, [
          'title',
          'branchName',
          'identifier',
          'createdAt',
          'startedAt',
          'completedAt',
          'status',
          'url'
        ])
      )
  }

  getTeam = async () =>
    this.client
      .team(this.getTeamName())
      .then((e) => pick(e, ['id', 'key', 'name', 'cycleDuration', 'createdAt']))

  printAttributes = (item) => {
    return Object.keys(item)
      .map((e) => `${startCase(e)}: ${item[e]}`)
      .join('\n')
  }

  execute = async () => {
    const command = first(argv._)

    if (this.commands[command]) {
      this.currentCommand = command

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
