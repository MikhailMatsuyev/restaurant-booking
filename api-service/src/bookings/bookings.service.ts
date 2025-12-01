import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import {
    Observable,
    from,
    map,
    tap,
    catchError,
    throwError,
    of,
    switchMap,
    timer,
    mergeMap,
} from 'rxjs';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
    constructor(
        @InjectRepository(Booking)
        private bookingsRepository: Repository<Booking>,
        @Inject('KAFKA_SERVICE')
        private kafkaClient: ClientKafka,
    ) {}

    create(createBookingDto: CreateBookingDto): Observable<Booking> {
        const booking = this.bookingsRepository.create({
            ...createBookingDto,
            status: BookingStatus.CREATED,
        });

        return from(this.bookingsRepository.save(booking)).pipe(
            tap((savedBooking) => {
                console.log(`✨ Booking #${savedBooking.id} created`);

                // Публикуем событие в Kafka
                this.kafkaClient.emit('booking.created', {
                    bookingId: savedBooking.id,
                    restaurantId: savedBooking.restaurantId,
                    bookingDate: savedBooking.bookingDate,
                    bookingTime: savedBooking.bookingTime,
                    guestCount: savedBooking.guestCount,
                });
            }),
            catchError((error) => {
                console.error('Error creating booking:', error);
                return throwError(() => new Error('Failed to create booking'));
            }),
        );
    }

    findOne(id: number): Observable<Booking> {
        return from(this.bookingsRepository.findOne({ where: { id } })).pipe(
            map((booking) => {
                if (!booking) {
                    throw new NotFoundException(`Booking #${id} not found`);
                }
                return booking;
            }),
            catchError((error) => {
                console.error(`Error finding booking #${id}:`, error);
                return throwError(() => error);
            }),
        );
    }

    findAll(): Observable<Booking[]> {
        return from(
            this.bookingsRepository.find({
                order: { createdAt: 'DESC' },
            }),
        ).pipe(
            tap((bookings) => console.log(`📋 Found ${bookings.length} bookings`)),
            catchError((error) => {
                console.error('Error finding bookings:', error);
                return throwError(() => new Error('Failed to fetch bookings'));
            }),
        );
    }

    findByRestaurant(restaurantId: number): Observable<Booking[]> {
        return from(
            this.bookingsRepository.find({
                where: { restaurantId },
                order: { bookingDate: 'DESC', bookingTime: 'DESC' },
            }),
        ).pipe(
            tap((bookings) =>
                console.log(
                    `🍽️ Found ${bookings.length} bookings for restaurant #${restaurantId}`,
                ),
            ),
            catchError((error) => {
                console.error(
                    `Error finding bookings for restaurant #${restaurantId}:`,
                    error,
                );
                return of([]);
            }),
        );
    }

    findByStatus(status: BookingStatus): Observable<Booking[]> {
        return from(
            this.bookingsRepository.find({
                where: { status },
                order: { createdAt: 'DESC' },
            }),
        ).pipe(
            tap((bookings) =>
                console.log(`📊 Found ${bookings.length} bookings with status ${status}`),
            ),
            catchError(() => of([])),
        );
    }

    updateStatus(id: number, status: BookingStatus): Observable<Booking> {
        return from(this.bookingsRepository.update(id, { status })).pipe(
            switchMap(() => this.findOne(id)),
            tap((booking) =>
                console.log(`🔄 Booking #${id} status updated to ${status}`),
            ),
            catchError((error) => {
                console.error(`Error updating booking #${id}:`, error);
                return throwError(() => error);
            }),
        );
    }

    cancel(id: number): Observable<boolean> {
        return this.findOne(id).pipe(
            switchMap((booking) => {
                if (booking.status === BookingStatus.CONFIRMED) {
                    return this.updateStatus(id, BookingStatus.REJECTED).pipe(
                        map(() => true),
                    );
                }
                return from(this.bookingsRepository.delete(id)).pipe(map(() => true));
            }),
            catchError((error) => {
                console.error(`Error canceling booking #${id}:`, error);
                return of(false);
            }),
        );
    }

    getRestaurantStats(restaurantId: number): Observable<{
        total: number;
        confirmed: number;
        pending: number;
        rejected: number;
    }> {
        return this.findByRestaurant(restaurantId).pipe(
            map((bookings) => ({
                total: bookings.length,
                confirmed: bookings.filter((b) => b.status === BookingStatus.CONFIRMED)
                    .length,
                pending: bookings.filter(
                    (b) =>
                        b.status === BookingStatus.CREATED ||
                        b.status === BookingStatus.CHECKING_AVAILABILITY,
                ).length,
                rejected: bookings.filter((b) => b.status === BookingStatus.REJECTED)
                    .length,
            })),
        );
    }
}