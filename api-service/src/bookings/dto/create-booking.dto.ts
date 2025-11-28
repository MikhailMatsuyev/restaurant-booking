import { IsNotEmpty, IsNumber, IsString, IsDateString, Matches, Min } from 'class-validator';

export class CreateBookingDto {
    @IsNumber()
    @IsNotEmpty()
    restaurantId: number;

    @IsString()
    @IsNotEmpty()
    guestName: string;

    @IsNumber()
    @Min(1)
    guestCount: number;

    @IsDateString()
    bookingDate: string; // YYYY-MM-DD

    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    bookingTime: string; // HH:MM
}