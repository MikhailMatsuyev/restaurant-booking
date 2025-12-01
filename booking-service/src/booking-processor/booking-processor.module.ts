import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingProcessorController } from './booking-processor.controller';
import { BookingProcessorService } from './booking-processor.service';
import { Booking } from './entities/booking.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Booking])],
    controllers: [BookingProcessorController],
    providers: [BookingProcessorService],
})
export class BookingProcessorModule {}
