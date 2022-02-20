# Linear Command Line Interface

⚠️ This tool is unofficial, and is not sponsored or recognized by the Linear team.

## Intro

LinearCLI is a command line interface to accompany the native and web Linear experience. At times, it can be hard to manage your Linear issues through the UI, especially when you have to chase down the application or web window. When you're deep in development, you sometimes just want to update tasks from the comfort of your command line.

## Install

```
npm install -g linearcli
```

## Commands
`linear key`

Set the API key associated to your Linear Account. You can create your Linear API Key from Linear > Settings > Account > Create Key. 

`linear clear`

Clear your current API key.

`linear me`

Get topical information about your account.

`linear team`

Find information about the team associated to a current branch.

`linear branch`

Find ticket information about the current branch.

`linear open`

Open the current branch in Linear native or Linear web.

`linear new`

Create a sub issue from the current branch - you will be prompted for a title and description of the new sub issue.