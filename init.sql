CREATE TABLE IF NOT EXISTS restaurants (
                                           id SERIAL PRIMARY KEY,
                                           name VARCHAR(255) NOT NULL,
    total_tables INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS bookings (
                                        id SERIAL PRIMARY KEY,
                                        restaurant_id INTEGER REFERENCES restaurants(id),
    guest_name VARCHAR(255) NOT NULL,
    guest_count INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_time
    ON bookings(restaurant_id, booking_date, booking_time);

CREATE INDEX IF NOT EXISTS idx_bookings_status
    ON bookings(status);

INSERT INTO restaurants (name, total_tables) VALUES
                                                 ('La Trattoria', 10),
                                                 ('Sushi Paradise', 8),
                                                 ('Steakhouse Prime', 15),
                                                 ('Pizza House', 12),
                                                 ('The French Bistro', 6)
    ON CONFLICT DO NOTHING;

SELECT 'Database initialized successfully!' as status;
SELECT 'Total restaurants:' as info, COUNT(*) as count FROM restaurants;