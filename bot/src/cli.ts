#!/usr/bin/env node

import process from 'node:process'
import { Command } from 'commander'
import { buildPlugins, checkPlugins } from './build.ts'

const program = new Command()

program.name('zbot').description('Zotero Plugin Registry Bot').version('0.0.0')

program
  .command('build [plugins...]')
  .alias('b')
  .description('Build plugin metadata (default command)')
  .option('-a, --all', 'Build all plugins')
  .action(async (plugins, options) => {
    const ids = options.all ? undefined : Array.isArray(plugins) ? plugins : []
    await buildPlugins(ids)
  })

program
  .command('check [plugins...]')
  .alias('c')
  .description('Check mode: validate changed plugins for PRs')
  .action(async (plugins) => {
    const ids = Array.isArray(plugins) ? plugins : []
    await checkPlugins(ids)
  })

// Default command is build
program.action(async () => {
  await buildPlugins()
})

program.parse(process.argv)
