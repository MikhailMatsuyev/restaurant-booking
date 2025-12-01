import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingProcessorService } from './booking-processor.service';

@Controller()
export class BookingProcessorController {
    constructor(
        private readonly bookingProcessorService: BookingProcessorService,
    ) {}

    @MessagePattern('booking.created')
    handleBookingCreated(@Payload() data: any): void {
        console.log('🔔 Received booking.created event:', data);

        // Подписываемся на Observable и обрабатываем
        this.bookingProcessorService.processBooking(data).subscribe({
            next: () => {
                console.log('✅ Booking processing completed successfully');
            },
            error: (err) => {
                console.error('❌ Error processing booking:', err);
            },
            complete: () => {
                console.log('🏁 Booking processing stream completed');
            },
        });
    }

    @MessagePattern('booking.batch')
    handleBookingBatch(@Payload() data: any[]): void {
        console.log(`🔔 Received batch of ${data.length} bookings`);

        this.bookingProcessorService.processBatch(data).subscribe({
            next: (results) => {
                console.log(`✅ Processed ${results.length} bookings successfully`);
            },
            error: (err) => {
                console.error('❌ Error processing batch:', err);
            },
        });
    }
}
