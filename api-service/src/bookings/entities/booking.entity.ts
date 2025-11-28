import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BookingStatus {
    CREATED = 'CREATED',
    CHECKING_AVAILABILITY = 'CHECKING_AVAILABILITY',
    CONFIRMED = 'CONFIRMED',
    REJECTED = 'REJECTED'
}

@Entity('bookings')
export class Booking {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'restaurant_id' })
    restaurantId: number;

    @Column({ name: 'guest_name' })
    guestName: string;

    @Column({ name: 'guest_count' })
    guestCount: number;

    @Column({ type: 'date', name: 'booking_date' })
    bookingDate: string;

    @Column({ type: 'time', name: 'booking_time' })
    bookingTime: string;

    @Column({
        type: 'varchar',
        enum: BookingStatus,
        default: BookingStatus.CREATED
    })
    status: BookingStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}