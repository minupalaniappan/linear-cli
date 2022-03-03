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
const inquirer = require('inquirer')

const argv = yargs(hideBin(process.argv)).argv

const LINEAR_APP_PATH = '/Applications/Linear.app/'
const WEB_RESOURCE = 'https://linear.app/'
const SLEEP_TIME = 5

if (typeof localStorage === 'undefined' || localStorage === null) {
  let LocalStorage = require('node-localstorage').LocalStorage
  localStorage = new LocalStorage('/tmp/linear-cli/storage')
}

const BRANCH_REQUIRED_COMMANDS = ['branch', 'open', 'team']

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
    new: () => this.createIssue().then(this.printAttributes),
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

  parseTeamsArray = (teams) => (
    get(teams, 'nodes').map((({ name, key, id } ) => ({ name, key, id })))
  )

  fetchAllTeam = async () => {
    let teams = await this.client.teams()



    let teamsArr = this.parseTeamsArray(teams)

    while (teams.pageInfo.hasNextPage) {
      teams = await teams.fetchNext()

      teamsArr = [
        ...teamsArr,
        ...this.parseTeamsArray(teams)
      ]
    }

    return teamsArr
  }

  setTicketTeam = async () => {
    const teams = await this.fetchAllTeam()

    return inquirer.prompt([
      {
        type: 'list',
        name: 'teamName',
        message: 'Which team owns this issue?',
        choices: teams.map(({ name, key }) => `${name} ${key}`)
      }
    ]).then(({ teamName }) => Promise.resolve(
      teams.find(({ key }) => teamName.split(' ')[1] === key).id
    ))
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

  createIssueAPI = (attributes) => {
    return this.client.issueCreate(attributes).then(async (issue) => {
      const newIssue = await issue.issue

      console.info('Info: Created new issue!')

      await exec(`git branch -m ${newIssue.branchName}`)

      console.info(`Info: Switched to new branch ${newIssue.branchName}`)
      console.info(`Info: Copied to clipboard!`)

      await exec(`echo ${newIssue.branchName} | pbcopy`)

      return pick(newIssue, ['title', 'branchName', 'createdAt'])
    })
  }

  createIssue = async () => {
    const { id: assigneeId } = await this.getOrSetUser()
    const { title, description } = await prompt.get(['title', 'description'])

    try {
      const { id: parentId } = await this.getTicketDetails()
      const { id: teamId } = await this.getTeam()

      console.info('Info: Creating issue...')

      return this.createIssueAPI({
        assigneeId,
        parentId,
        title,
        description,
        teamId
      })
    } catch {
      const teamId = await this.setTicketTeam()

      return this.createIssueAPI({
        assigneeId,
        title,
        description,
        teamId
      })
    }
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

  getTeam = async (teamName) => {
    return this.client
      .team(teamName || this.getTeamName())
      .then((e) => pick(e, ['id', 'key', 'name', 'cycleDuration', 'createdAt']))
  }

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
