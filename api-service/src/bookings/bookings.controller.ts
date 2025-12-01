import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    ParseIntPipe,
    Query,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking, BookingStatus } from './entities/booking.entity';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

@Controller('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) {}

    @Post()
    create(
        @Body() createBookingDto: CreateBookingDto,
    ): Observable<ApiResponse<Booking>> {
        return this.bookingsService.create(createBookingDto).pipe(
            map((booking) => ({
                success: true,
                data: booking,
                message: 'Booking created successfully. Checking availability...',
            })),
            catchError((error) =>
                of({
                    success: false,
                    error: error.message || 'Failed to create booking',
                }),
            ),
        );
    }

    @Get()
    findAll(
        @Query('status') status?: BookingStatus,
    ): Observable<ApiResponse<Booking[]>> {
        const source$ = status
            ? this.bookingsService.findByStatus(status)
            : this.bookingsService.findAll();

        return source$.pipe(
            map((bookings) => ({
                success: true,
                data: bookings,
            })),
            catchError((error) =>
                of({
                    success: false,
                    data: [],
                    error: error.message || 'Failed to fetch bookings',
                }),
            ),
        );
    }

    @Get('restaurant/:restaurantId')
    findByRestaurant(
        @Param('restaurantId', ParseIntPipe) restaurantId: number,
    ): Observable<ApiResponse<Booking[]>> {
        return this.bookingsService.findByRestaurant(restaurantId).pipe(
            map((bookings) => ({
                success: true,
                data: bookings,
            })),
            catchError((error) =>
                of({
                    success: false,
                    data: [],
                    error: error.message,
                }),
            ),
        );
    }

    @Get('restaurant/:restaurantId/stats')
    getRestaurantStats(
        @Param('restaurantId', ParseIntPipe) restaurantId: number,
    ): Observable<ApiResponse<any>> {
        return this.bookingsService.getRestaurantStats(restaurantId).pipe(
            map((stats) => ({
                success: true,
                data: stats,
            })),
            catchError((error) =>
                of({
                    success: false,
                    error: error.message,
                }),
            ),
        );
    }

    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
    ): Observable<ApiResponse<Booking>> {
        return this.bookingsService.findOne(id).pipe(
            map((booking) => ({
                success: true,
                data: booking,
            })),
            catchError((error) =>
                of({
                    success: false,
                    error: error.message || `Booking #${id} not found`,
                }),
            ),
        );
    }

    @Delete(':id')
    cancel(
        @Param('id', ParseIntPipe) id: number,
    ): Observable<ApiResponse<boolean>> {
        return this.bookingsService.cancel(id).pipe(
            map((result) => ({
                success: result,
                message: result
                    ? 'Booking cancelled successfully'
                    : 'Failed to cancel booking',
            })),
            catchError((error) =>
                of({
                    success: false,
                    error: error.message,
                }),
            ),
        );
    }
}