#!/usr/bin/env node

/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/


const yargs = require('yargs');
const chalk = require('chalk');
const diff = require('./diff');
const sync = require('./sync');

yargs
.usage('Usage: $0 <command> [options]')
// TODO: Should I have both a "push" command and a "pull" command?
// sync (default)
.command(['sync', '$0'], 'Run a diff on the local file system and Adobe Launch and then sync.', async (argv) => {

  const args = argv.argv;

  await sync(args);
})
// diff
.command('diff', 'Diff what exists on the local file system with what exists in Adobe Launch.', async (argv) => {

  const args = argv.argv;
  
  const result = await diff(args);

  console.log(chalk.green.bold(`Added (${result.added.length}) ------------------------------------------------------------`));
  result.added.forEach((comparison) => {
    console.log(`  ${comparison.path} (${comparison.id})`);
  });

  console.log(chalk.yellow.bold(`Modified (${result.modified.length}) ---------------------------------------------------------`));
  result.modified.forEach((comparison) => {
    console.log(`  ${comparison.path} (${comparison.id})`);
    Object.keys(comparison.details.attributes).forEach((attribute) => {
      console.log(`    - attributes.${attribute}: ${chalk.greenBright(comparison.details.attributes[attribute].local)} => ${chalk.redBright(comparison.details.attributes[attribute].remote)}`);
    });
  });

  console.log(chalk.red.bold(`Deleted (${result.deleted.length}) ----------------------------------------------------------`));
  result.deleted.forEach((comparison) => {
    console.log(`  ${comparison.path} (${comparison.id})`);
  });

  console.log(chalk.blue.bold(`Behind (${result.behind.length}) -----------------------------------------------------------`));
  result.behind.forEach((comparison) => {
    console.log(`  ${comparison.path} (${comparison.id})`);
    if (
      comparison.details &&
      comparison.details.attributes
    ) {
      Object.keys(comparison.details.attributes).forEach((attribute) => {
        console.log(`    - attributes.${attribute}: ${chalk.greenBright(comparison.details.attributes[attribute].local)} => ${chalk.redBright(comparison.details.attributes[attribute].remote)}`);
      });
    }
  });

  console.log(chalk.blue.bold(`Unchanged (${result.unchanged.length}) --------------------------------------------------------`));
  // result.unchanged.forEach((comparison) => {
  //   console.log(`  ${comparison.path} (${comparison.id})`);
  // });

})
// options
.options({
  settings: {
    type: 'string',
    describe: 'The location of the settings file.'
  }
})
.options({
  modified: {
    type: 'boolean',
    describe: '(sync command only) Sync only "modified" changes up to Launch.'
  }
})
.options({
  behind: {
    type: 'boolean',
    describe: '(sync command only) Sync only "behind" changes down from Launch.'
  }
})
// TODO: finish this when ready and public
// .epilogue('For more information, see https://www.npmjs.com/package/@adobe/reactor-sync.')
.help('h')
.alias('h', 'help')
.argv;