import { DateTime } from 'luxon'

import Device from '#models/device'
import Measurement from '#models/measurement'
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

/** Parameters reported together with CO2 by the SCD41 in one wake cycle */
const SCD41_COMPANION_PARAMETERS = [ParameterCode.SCD41_TEMPERATURE, ParameterCode.SCD41_HUMIDITY]

/**
 * Messages of one wake cycle arrive within seconds of each other.
 * The window must stay well below the shortest wake cycle.
 */
const FAILED_CYCLE_WINDOW_MS = 2 * 60 * 1000

export interface IncomingMeasurement {
  macAddress: string
  sensor: number
  parameter: number
  value: number
}

export type StoreResult = 'stored' | 'dropped'

export class MeasurementService {
  /** Device ID -> time of the last failed SCD41 reading (CO2 = 0) */
  private static failedScd41Cycles = new Map<string, number>()

  static isFailedCo2Reading(parameter: number, value: number) {
    return parameter === ParameterCode.CO2 && value === 0
  }

  async store(data: IncomingMeasurement, now = Date.now()): Promise<StoreResult> {
    const parameter = await Parameter.findByOrFail('code', data.parameter)
    const device = await Device.findByOrFail('mac_address', data.macAddress)

    if (MeasurementService.isFailedCo2Reading(data.parameter, data.value)) {
      MeasurementService.failedScd41Cycles.set(device.id, now)
      await this.dropScd41Companions(device, now)
      return 'dropped'
    }

    if (SCD41_COMPANION_PARAMETERS.includes(data.parameter)) {
      const failedAt = MeasurementService.failedScd41Cycles.get(device.id)
      if (failedAt !== undefined && now - failedAt <= FAILED_CYCLE_WINDOW_MS) {
        return 'dropped'
      }
    }

    if (data.parameter === ParameterCode.CO2) {
      MeasurementService.failedScd41Cycles.delete(device.id)
    }

    await parameter.related('measurements').create({
      deviceId: device.id,
      value: data.value,
    })

    return 'stored'
  }

  /**
   * Firmware sends CO2 before its companions, but delivery order is not
   * guaranteed, so remove companions of the same cycle stored before the failure
   */
  private async dropScd41Companions(device: Device, now: number) {
    const since = DateTime.fromMillis(now - FAILED_CYCLE_WINDOW_MS).toSQL()

    await Measurement.query()
      .where('device_id', device.id)
      .where('created_at', '>=', since!)
      .whereIn(
        'parameter_id',
        Parameter.query().select('id').whereIn('code', SCD41_COMPANION_PARAMETERS)
      )
      .delete()
  }
}
