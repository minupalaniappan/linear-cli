# Linear Command Line Interface

This tool is unofficial, and is not sponsored or recognized by the Linear team.

## Intro

LinearCLI is a command line interface to accompany the native and web Linear experience. At times, it can be hard to manage your [Linear](https://github.com/linear) issues through a user interface, especially when you have to chase down the application or browser window. When you're deep in development, you sometimes just want to update tasks from the comfort of your command line or IDE.

## Install

```
npm install -g @minupalaniappan/linear
```

[View on NPM](https://www.npmjs.com/package/@minupalaniappan/linear)

## Commands
`linear key`

```
> linear key
> prompt: apikey: 123
> Api Key: 123
```

```
> linear key
> Api Key: 123
```

Set the API key associated to your Linear Account. You can create your Linear API Key from `Linear` > `Settings` > `Account` > `Create Key`. 

ℹ️ The current build only supports one API key at a time.

`linear clear`

```
> linear clear
> Info: Storage has been cleared!
```

Clear your current API key.

`linear me`

```
> linear clear
> Info: Storage has been cleared!
```

Get topical information about your account.

`linear team`

```
> linear clear
> Info: Storage has been cleared!
```

Find information about the team associated to a current branch.

`linear branch`

```
> linear clear
> Info: Storage has been cleared!
```

Find ticket information about the current branch.

`linear open`

```
> linear clear
> Info: Storage has been cleared!
```

Open the current branch in Linear native or Linear web.

`linear new`

```
> linear clear
> Info: Storage has been cleared!
```

Create a sub issue from the current branch - you will be prompted for a title and description of the new sub issue.

## Potential Errors

`Unable to read current branch`

The current branch 

`Unable to identify branch`

The current branch is not formatted properly.

`Unable to find the ticket name in the branch`

LinearCLI was not able to identify the ticket identifier from the current branch.

`No command provided`

You have not provided a single argument for LinearCLI to execute as a command.

`Command not found`

The current command is not supported by LinearCLI.

## Roadmap

Coming soon.

## Troubleshooting

[File an issue here, or request a command here!](https://github.com/minupalaniappan/linear-cli/issues/new)