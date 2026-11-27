import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import { IClientSubscribeOptions } from 'mqtt'

import { mqttMeasurementMessageValidator } from '#validators/measurement'
import MqttMessageEvent from '#events/mqtt_message_event'
import { MeasurementService } from '#services/measurement_service'

export interface MqttMessageTopic {
  topic: string
  qos: IClientSubscribeOptions['qos']
}

export interface MqttMessagePayload {
  topic: string
  message: string
}

@inject()
export default class MqttMessageListener {
  constructor(
    protected logger: Logger,
    protected measurementService: MeasurementService
  ) {}

  static TOPICS: MqttMessageTopic[] = [{ topic: 'vogonair/+/raw', qos: 1 }]

  async handle(event: MqttMessageEvent) {
    await this.handleMeasurement(event.payload)
  }

  private async handleMeasurement({ topic, message }: MqttMessagePayload) {
    const [, macAddress] = topic.split('/')

    const payload = JSON.parse(message)
    const data = await mqttMeasurementMessageValidator.validate(payload)

    try {
      const result = await this.measurementService.store({ macAddress, ...data })

      if (result === 'dropped') {
        this.logger.warn(
          `Dropped failed SCD41 reading from ${macAddress} (parameter ${data.parameter})`
        )
      }
    } catch {
      this.logger.error('Parameter or device not found for incoming measurement')
    }
  }
}
