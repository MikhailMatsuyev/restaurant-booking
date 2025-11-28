import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        AppModule,
        {
            transport: Transport.KAFKA,
            options: {
                client: {
                    clientId: 'booking-service',
                    brokers: ['localhost:9092'],
                },
                consumer: {
                    groupId: 'booking-consumer-group',
                },
            },
        },
    );

    await app.listen();
    console.log('🚀 Booking Service is listening for Kafka events...');
}
bootstrap();