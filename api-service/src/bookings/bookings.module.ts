// api-service/src/bookings/bookings.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Booking]),
        ClientsModule.register([
            {
                name: 'KAFKA_SERVICE',
                transport: Transport.KAFKA,
                options: {
                    client: {
                        clientId: 'api-service',
                        brokers: ['localhost:9092'],
                    },
                    producer: {
                        allowAutoTopicCreation: true,
                    },
                },
            },
        ]),
    ],
    controllers: [BookingsController],
    providers: [BookingsService],
})
export class BookingsModule {}