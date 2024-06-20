import * as core from '@actions/core'
import * as github from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'
import * as fs from 'fs'

type copilotUsers = {
  total_seats?: number | undefined
  seats?:
    | {
        assignee: {
          [key: string]: unknown
        } & {
          name?: string | null | undefined
          email?: string | null | undefined
          login: string
          id: number
          node_id: string
          url: string
          type: string
        }
        updated_at?: string | undefined
        created_at?: string | undefined
        pending_cancellation_date?: string | undefined
        last_activity_at?: string | undefined
        last_activity_editor?: string | undefined
        assigning_team:
          | ({
              [key: string]: unknown
            } & {
              id: number
              node_id: string
              url: string
              name: string
              slug: string
              description: string
              privacy: string
              permission: string
            })
          | undefined
      }[]
    | undefined
}

export class Copilot {
  readonly outputFile: string = 'output.csv'
  private octokit: InstanceType<typeof GitHub>

  constructor(token: string) {
    this.octokit = github.getOctokit(token)
  }

  async checkUserActivity(
    org: string,
    maxInactiveDays: number
  ): Promise<copilotUsers[]> {
    const copilot_all_users = await this.fetchCopilotUsers(org)

    for (const page of copilot_all_users) {
      if (!page.seats) {
        core.info('No seats found in page, skipping')
        continue
      }

      for (const copilot_user of page.seats) {
        core.info('****************************************')
        core.info(`🔍 Looking into ${copilot_user.assignee.login}`)

        const pending_cancellation_date = copilot_user.pending_cancellation_date

        if (!pending_cancellation_date) {
          core.info('No pending cancellation date')
        } else {
          core.info(
            `User is already scheduled for deactivation, skipping, user license will be disabled: ${pending_cancellation_date}`
          )
          continue
        }

        const created_at_date = new Date(copilot_user.created_at ?? '')
        core.info(`Created at date: ${created_at_date}`)

        if (!copilot_user.last_activity_at) {
          core.info(
            `🔴 User ${copilot_user.assignee.login} has never been active`
          )

          const one_month_ago = new Date()
          one_month_ago.setMonth(one_month_ago.getMonth() - 1)

          if (created_at_date < one_month_ago) {
            core.info(
              `🔴 User ${copilot_user.assignee.login} is inactive and was created more than a month ago, disabling user`
            )
            // Call your function to remove user from copilot here
          } else {
            core.info(
              `🟢 User ${copilot_user.assignee.login} is not active yet, but was created in the last month. Leaving active.`
            )
          }

          continue
        }

        const last_active_date = copilot_user.last_activity_at
          ? new Date(copilot_user.last_activity_at)
          : null
        core.info(`Last activity date at: ${last_active_date}`)

        const days_ago = new Date()
        // go back maxInactiveDays days
        days_ago.setDate(days_ago.getDate() - maxInactiveDays)

        if (!last_active_date || last_active_date < days_ago) {
          core.info(
            `🔴 User ${copilot_user.assignee.login} is inactive for more than ${maxInactiveDays} days, disabling copilot for user`
          )
          // todo: Call your function to remove user from copilot here
          continue
        } else {
          core.info(
            `🟢 User ${copilot_user.assignee.login} is active in the last ${maxInactiveDays} days. Last activity was in ${copilot_user.last_activity_editor}`
          )
        }
      }
    }
    return copilot_all_users
  }

  async fetchCopilotUsers(org: string): Promise<copilotUsers[]> {
    try {
      // https://octokit.github.io/rest.js/v20#copilot
      // https://github.com/octokit/plugin-rest-endpoint-methods.js/blob/main/docs/copilot/listCopilotSeats.md
      const seatsResponse = await this.octokit.rest.copilot.listCopilotSeats({
        org
      })
      const copilot_seats_total_count = seatsResponse.data.total_seats ?? 0

      // Calculate number of pages needed to get all entries
      const entries_per_page = 100
      let pages_needed = Math.floor(
        copilot_seats_total_count / entries_per_page
      )
      if (copilot_seats_total_count % entries_per_page > 0) {
        pages_needed += 1
      }

      core.info(`Total seats: ${copilot_seats_total_count}`)
      core.info(`Total pages needed: ${pages_needed}`)

      const copilot_all_users = (await this.octokit.paginate(
        this.octokit.rest.copilot.listCopilotSeats,
        {
          org,
          per_page: 100
        }
      )) as copilotUsers[]

      //core.debug(JSON.stringify(copilot_all_users))

      const writeStream = fs.createWriteStream(this.outputFile)
      writeStream.write(
        'login,created_at,last_activity_at,last_activity_editor,pending_cancellation_date\n'
      )
      for (const page of copilot_all_users) {
        if (!page.seats) {
          core.info('No seats found in page, skipping')
          continue
        }
        for (const copilot_user of page.seats) {
          writeStream.write(
            `${copilot_user.assignee.login},${copilot_user.created_at},${copilot_user.last_activity_at || ''},${copilot_user.last_activity_editor || ''},${copilot_user.pending_cancellation_date || ''}\n`
          )
        }
      }
      writeStream.end()

      writeStream
        .on('finish', () => {
          console.log('File has been created')
        })
        .on('error', err => {
          console.error('Something went wrong:', err)
        })

      return copilot_all_users
    } catch (error) {
      core.error(`Error calling GitHub API: ${error}`)
      throw error
    }
  }
}
