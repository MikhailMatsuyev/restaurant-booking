import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    Observable,
    from,
    map,
    tap,
    catchError,
    throwError,
    of,
} from 'rxjs';
import { Restaurant } from './entities/restaurant.entity';

@Injectable()
export class RestaurantsService {
    constructor(
        @InjectRepository(Restaurant)
        private restaurantsRepository: Repository<Restaurant>,
    ) {}

    /**
     * Получение всех ресторанов
     */
    findAll(): Observable<Restaurant[]> {
        return from(this.restaurantsRepository.find()).pipe(
            tap((restaurants) =>
                console.log(`🍽️ Found ${restaurants.length} restaurants`),
            ),
            catchError((error) => {
                console.error('❌ Error finding restaurants:', error);
                return of([]);
            }),
        );
    }

    /**
     * Получение одного ресторана
     */
    findOne(id: number): Observable<Restaurant> {
        return from(this.restaurantsRepository.findOne({ where: { id } })).pipe(
            map((restaurant) => {
                if (!restaurant) {
                    throw new NotFoundException(`Restaurant #${id} not found`);
                }
                return restaurant;
            }),
            tap((restaurant) => console.log(`🍽️ Found restaurant: ${restaurant.name}`)),
            catchError((error) => {
                console.error(`❌ Error finding restaurant #${id}:`, error);
                return throwError(() => error);
            }),
        );
    }

    /**
     * Проверка доступности столиков
     */
    checkAvailability(
        restaurantId: number,
        date: string,
        time: string,
    ): Observable<{ available: boolean; totalTables: number }> {
        return this.findOne(restaurantId).pipe(
            map((restaurant) => ({
                available: true, // Упрощенная логика
                totalTables: restaurant.totalTables,
            })),
            catchError(() =>
                of({
                    available: false,
                    totalTables: 0,
                }),
            ),
        );
    }
}
