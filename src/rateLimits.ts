import * as core from '@actions/core'
import * as github from '@actions/github'

export async function callGitHubAPI(token: string): Promise<void> {
  try {
    const octokit = github.getOctokit(token)

    // ignore eslint warning as we need to call the API in a loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // make a dummy request to get the rate limit
      const response = await octokit.request('GET /users/octocat')

      // parse the rate limit from the response headers
      const remaining = parseInt(
        response.headers['x-ratelimit-remaining'] as string,
        10
      )

      if (remaining < 100) {
        core.info('Rate limit approaching, waiting for 60 seconds...')
        await new Promise(resolve => setTimeout(resolve, 60000))
      } else {
        core.info(
          `💥 Rate limit checked. We have ${remaining} remaining, continuing...`
        )
        break
      }
    }
  } catch (error) {
    console.error(`Error calling GitHub API: ${error}`)
  }
}

export async function hold_until_rate_limit_success(): Promise<void> {
  try {
    const token: string = core.getInput('repo-token')
    await callGitHubAPI(token)
  } catch (error) {
    console.error(`Error calling GitHub API: ${error}`)
  }
}
