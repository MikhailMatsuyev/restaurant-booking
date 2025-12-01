import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { RestaurantsService } from './restaurants.service';
import { Restaurant } from './entities/restaurant.entity';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

@Controller('restaurants')
export class RestaurantsController {
    constructor(private readonly restaurantsService: RestaurantsService) {}

    @Get()
    findAll(): Observable<ApiResponse<Restaurant[]>> {
        return this.restaurantsService.findAll().pipe(
            map((restaurants) => ({
                success: true,
                data: restaurants,
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

    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
    ): Observable<ApiResponse<Restaurant>> {
        return this.restaurantsService.findOne(id).pipe(
            map((restaurant) => ({
                success: true,
                data: restaurant,
            })),
            catchError((error) =>
                of({
                    success: false,
                    error: error.message || `Restaurant #${id} not found`,
                }),
            ),
        );
    }

    @Get(':id/availability')
    checkAvailability(
        @Param('id', ParseIntPipe) id: number,
        @Query('date') date: string,
        @Query('time') time: string,
    ): Observable<ApiResponse<any>> {
        return this.restaurantsService.checkAvailability(id, date, time).pipe(
            map((availability) => ({
                success: true,
                data: availability,
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