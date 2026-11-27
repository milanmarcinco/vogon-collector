import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import Measurement from '#models/measurement'
import Sensor from '#models/sensor'

export default class Parameter extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare code: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Measurement)
  declare measurements: HasMany<typeof Measurement>

  @manyToMany(() => Sensor)
  declare sensors: ManyToMany<typeof Sensor>
}
