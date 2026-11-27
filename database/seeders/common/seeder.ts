import { BaseSeeder } from '@adonisjs/lucid/seeders'

import Parameter from '#models/parameter'
import Sensor from '#models/sensor'

import { ParameterCode, SensorCode } from '#services/measurement_service'

export default class extends BaseSeeder {
  async run() {
    const uniqueKey = 'name'

    const [dht22, sds011, scd41] = await Sensor.updateOrCreateMany(uniqueKey, [
      { name: 'dht22', code: SensorCode.DHT22 },
      { name: 'sds011', code: SensorCode.SDS011 },
      { name: 'scd41', code: SensorCode.SCD41 },
    ])

    const [temperature, humidity, pm25, pm10, co2, scd41Temperature, scd41Humidity] =
      await Parameter.updateOrCreateMany(uniqueKey, [
        { name: 'temperature', code: ParameterCode.TEMPERATURE },
        { name: 'humidity', code: ParameterCode.HUMIDITY },
        { name: 'pm2.5', code: ParameterCode.PM25 },
        { name: 'pm10', code: ParameterCode.PM10 },
        { name: 'co2', code: ParameterCode.CO2 },
        { name: 'temperature (scd41)', code: ParameterCode.SCD41_TEMPERATURE },
        { name: 'humidity (scd41)', code: ParameterCode.SCD41_HUMIDITY },
      ])

    // sync without detaching keeps the seeder idempotent
    await dht22.related('parameters').sync([temperature.id, humidity.id], false)
    await sds011.related('parameters').sync([pm25.id, pm10.id], false)
    await scd41.related('parameters').sync([co2.id, scd41Temperature.id, scd41Humidity.id], false)
  }
}
