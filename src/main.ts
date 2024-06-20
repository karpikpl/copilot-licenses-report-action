import * as core from '@actions/core'
import { Copilot } from './copilot'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const token = core.getInput('github-pat')
    const org = core.getInput('github-org')
    const maxInactiveDays = parseInt(core.getInput('max-inactive-days') ?? '30')
    const copilot = new Copilot(token)

    const result = await copilot.checkUserActivity(org, maxInactiveDays)
    core.info(`Found ${result.length} users`)

    // Set outputs for other workflow steps to use
    core.setOutput('file', copilot.outputFile)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
