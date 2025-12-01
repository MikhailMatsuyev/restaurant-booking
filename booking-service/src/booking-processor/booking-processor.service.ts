import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    Observable,
    from,
    of,
    switchMap,
    map,
    tap,
    delay,
    catchError,
    retry,
    timeout,
    mergeMap,
} from 'rxjs';
import { toArray } from 'rxjs/operators';
import { Booking, BookingStatus } from './entities/booking.entity';

interface BookingCreatedEvent {
    bookingId: number;
    restaurantId: number;
    bookingDate: string;
    bookingTime: string;
    guestCount: number;
}

@Injectable()
export class BookingProcessorService {
    constructor(
        @InjectRepository(Booking)
        private bookingsRepository: Repository<Booking>,
    ) {}

    processBooking(event: BookingCreatedEvent): Observable<void|unknown> {
        const { bookingId, restaurantId, bookingDate, bookingTime } = event;

        console.log(`📋 Processing booking #${bookingId}...`);

        return of(event).pipe(
            switchMap(() =>
                this.updateBookingStatus(bookingId, BookingStatus.CHECKING_AVAILABILITY),
            ),

            delay(3000),
            tap(() => console.log(`🔍 Checking availability for booking #${bookingId}...`)),

            switchMap(() =>
                this.checkAvailability(restaurantId, bookingDate, bookingTime, bookingId),
            ),

            map((isAvailable) => {
                const status = isAvailable
                    ? BookingStatus.CONFIRMED
                    : BookingStatus.REJECTED;
                console.log(
                    `${isAvailable ? '✅' : '❌'} Booking #${bookingId} ${status}`,
                );
                return status;
            }),

            switchMap((finalStatus) =>
                this.updateBookingStatus(bookingId, finalStatus),
            ),

            tap(() => console.log(`✨ Booking #${bookingId} processing completed`)),

            retry({
                count: 3,
                delay: 1000,
            }),
            catchError((error) => {
                console.error(`❌ Error processing booking #${bookingId}:`, error);
                return this.updateBookingStatus(bookingId, BookingStatus.REJECTED);
            }),

            // Возвращаем void
            map(() => undefined),
        );
    }

    private checkAvailability(
        restaurantId: number,
        bookingDate: string,
        bookingTime: string,
        currentBookingId: number,
    ): Observable<boolean> {
        return from(
            this.bookingsRepository
                .createQueryBuilder('booking')
                .where('booking.restaurant_id = :restaurantId', { restaurantId })
                .andWhere('booking.booking_date = :bookingDate', { bookingDate })
                .andWhere('booking.booking_time = :bookingTime', { bookingTime })
                .andWhere('booking.status = :status', {
                    status: BookingStatus.CONFIRMED,
                })
                .andWhere('booking.id != :currentBookingId', { currentBookingId })
                .getOne(),
        ).pipe(
            map((existingBooking) => {
                const isAvailable = !existingBooking;
                console.log(
                    `🔍 Availability check: ${isAvailable ? 'Available' : 'Not available'}`,
                );
                return isAvailable;
            }),
            timeout(5000), // Таймаут 5 секунд
            catchError((error) => {
                console.error('❌ Error checking availability:', error);
                return of(false); // При ошибке считаем недоступным
            }),
        );
    }

    private updateBookingStatus(
        bookingId: number,
        status: BookingStatus,
    ): Observable<void> {
        console.log(`🔄 Updating booking #${bookingId} status to ${status}`);

        return from(
            this.bookingsRepository.update(bookingId, { status }),
        ).pipe(
            tap(() =>
                console.log(`✅ Booking #${bookingId} status updated to ${status}`),
            ),
            map(() => undefined),
            catchError((error) => {
                console.error(
                    `❌ Error updating booking #${bookingId} status:`,
                    error,
                );
                throw error;
            }),
        );
    }

    processBatch(events: BookingCreatedEvent[]): Observable<void[]|unknown[]> {
        return from(events).pipe(
            mergeMap((event) => this.processBooking(event), 5),
            toArray(),
            tap((results) =>
                console.log(`✨ Processed ${results.length} bookings in batch`),
            ),
        );
    }
}
