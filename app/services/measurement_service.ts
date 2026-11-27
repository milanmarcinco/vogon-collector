import Device from '#models/device'
import Parameter from '#models/parameter'

export enum SensorCode {
  DHT22 = 0x01,
  SDS011 = 0x02,
  SCD41 = 0x03,
}

export enum ParameterCode {
  TEMPERATURE = 0x01,
  HUMIDITY = 0x02,
  PM25 = 0x03,
  PM10 = 0x04,
  CO2 = 0x05,
  SCD41_TEMPERATURE = 0x06,
  SCD41_HUMIDITY = 0x07,
}

export interface IncomingMeasurement {
  macAddress: string
  sensor: number
  parameter: number
  value: number
}

export type StoreResult = 'stored' | 'dropped'

export class MeasurementService {
  /** Real CO2 never drops below ~400 ppm, so 0 means the sensor failed */
  static isFailedCo2Reading(parameter: number, value: number) {
    return parameter === ParameterCode.CO2 && value === 0
  }

  async store(data: IncomingMeasurement): Promise<StoreResult> {
    if (MeasurementService.isFailedCo2Reading(data.parameter, data.value)) {
      return 'dropped'
    }

    const parameter = await Parameter.findByOrFail('code', data.parameter)
    const device = await Device.findByOrFail('mac_address', data.macAddress)

    await parameter.related('measurements').create({
      deviceId: device.id,
      value: data.value,
    })

    return 'stored'
  }
}
