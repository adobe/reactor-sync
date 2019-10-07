# reactor-sync

Command line tool for syncing data to and from Adobe Launch to a local directory.

## Usage

Before running the sync tool, you must first have [Node.js](https://nodejs.org/en/) installed on your computer. Your npm version (npm comes bundled with Node.js) will need to be at least 10.15.0. You can check the installed version by running the following command from a command line:
                                                                                                      
```
npm -v
```

You will also need to be authorized to use the Launch APIs. This is done by first creating an integration through Adobe I/O. Please see the [Access Tokens Guide](https://developer.adobelaunch.com/api/guides/access_tokens/) for detailed steps on creating an integration and procuring api access rights.

Finally, you must first have created a property in Adobe Launch to sync with and have a settings file that has all of your integration and environment settings. 

Once you have a property ready to sync, have a settings file, and have an integraton created through Adobe I/O that can access the Adobe Launch APIs, you can use the bootstrapper tool in either a question-answer format or by passing information through command line arguments.

### Command Line commands

There are 2 different commands that this tool comes with:

#### sync

The first command is `sync`.  You can use it as follows:

```
npx @adobe/reactor-sync sync
```

This is the default command so you can also run this tool without specifying the sync command:

```
npx @adobe/reactor-sync
```

This command will first run a diff of what you have on your local machine and then what is in Launch.  It will calculate what it needs to push and what it needs to pull to your local machine.  Then it will performs those operations on your behalf and get them in sync.  

#### diff

The second command is `diff`.  You can use it as follows:

```
npx @adobe/reactor-sync diff
```

This command will only run the diff and give you an output of what is different between your local machine and what is in Launch.  It will also give you a better idea of what will happen if you run `sync` before you do so.  

### Command Line Arguments

The named parameters are as follows:

##### --settings-path

The location to save the settings.  The file name should end in ".json".  (defaults to ./reactor-settings.json)

## Suggested Uses

This tool can be used in many ways, but here are a few suggested uses:

- If you are already storing the code that goes into Launch in repositories, this tool will be your best friend.  
  - Set up a git hook whenever you commit or push code to run reactor-sync.
  - Set up a git app that keeps thins in sync both to and from your repo using this tool.
- Setup a workflow of pushing code into Launch without having to copy and past manually
- Run automated tests to ensure that your code doesn't have any obvious errors.
- Run transpiles on your code automatically and then automatically sync it into Launch.
- Run linters or code style enforcement tools to ensure that your code is always clean and you can always point to who is writing code in Launch that doesn't stay to standards. 

If you have other use cases, let me know and I can update this list.

### Contributing

Contributions are welcomed! Read the [Contributing Guide](CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE.md) for more information.