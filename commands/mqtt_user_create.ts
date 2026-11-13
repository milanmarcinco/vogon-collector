import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { createHash, randomBytes } from 'node:crypto'

export default class MqttUserCreate extends BaseCommand {
  static commandName = 'mqtt:user:create'
  static description = 'Create an MQTT user for EMQX PostgreSQL authentication'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'MQTT username' })
  declare username: string

  async run() {
    const { default: db } = await import('@adonisjs/lucid/services/db')

    if (!this.username.trim() || this.username.length > 255) {
      this.logger.error('Username must contain between 1 and 255 characters.')
      this.exitCode = 1
      return
    }

    const password = await this.prompt.secure('MQTT password', {
      validate: (value) => (value.length > 0 ? true : 'Password cannot be empty.'),
    })

    const salt = randomBytes(32).toString('hex')

    const passwordHash = createHash('sha256')
      .update(password + salt, 'utf8')
      .digest('hex')

    const now = new Date()

    await db
      .table<{ id: string }>('mqtt_users')
      .insert({
        username: this.username,
        password_hash: passwordHash,
        salt,
        is_superuser: false,
        created_at: now,
        updated_at: now,
      })
      .returning('id')

    this.logger.success(`MQTT user "${this.username}" created.`)
  }
}
