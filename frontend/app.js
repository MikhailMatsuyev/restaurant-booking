const {
    fromEvent,
    from,
    interval,
    timer,
    Subject,
    BehaviorSubject,
    merge,
} = rxjs;

const {
    map,
    switchMap,
    tap,
    catchError,
    retry,
    takeUntil,
    debounceTime,
    distinctUntilChanged,
    filter,
    share,
    startWith,
    take,
    mergeMap,
    finalize,
} = rxjs.operators;

const API_BASE_URL = 'http://localhost:3000';

const destroy$ = new Subject();
const bookingCreated$ = new Subject();
const refreshBookings$ = new BehaviorSubject(null);

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

const http$ = {
    get: (url) =>
        from(fetch(url)).pipe(
            switchMap((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }
                return from(response.json());
            }),
            retry({ count: 2, delay: 1000 }),
            catchError((error) => {
                console.error('HTTP GET Error:', error);
                throw error;
            }),
        ),

    post: (url, body) =>
        from(
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }),
        ).pipe(
            switchMap((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }
                return from(response.json());
            }),
            retry({ count: 2, delay: 1000 }),
            catchError((error) => {
                console.error('HTTP POST Error:', error);
                throw error;
            }),
        ),
};

const loadRestaurants$ = () => {
    return http$.get(`${API_BASE_URL}/restaurants`).pipe(
        map((result) => result.data || []),
        tap((restaurants) => {
            const select = document.getElementById('restaurant');
            select.innerHTML =
                '<option value="">Select a restaurant</option>' +
                restaurants
                    .map(
                        (r) =>
                            `<option value="${r.id}">${r.name} (${r.totalTables} tables)</option>`,
                    )
                    .join('');
            console.log(`✅ Loaded ${restaurants.length} restaurants`);
        }),
        catchError((error) => {
            console.error('Error loading restaurants:', error);
            showError('Failed to load restaurants');
            return from([]);
        }),
    );
};

const loadBookings$ = () => {
    return http$.get(`${API_BASE_URL}/bookings`).pipe(
        map((result) => result.data || []),
        tap((bookings) => {
            const bookingsList = document.getElementById('bookingsList');

            if (bookings.length === 0) {
                bookingsList.innerHTML = '<div class="loading">No bookings yet</div>';
                return;
            }

            bookingsList.innerHTML = bookings
                .map(
                    (booking) => `
            <div class="booking-card">
                <div class="booking-card-header">
                    <div class="booking-card-title">
                        Booking #${booking.id} - ${booking.guestName}
                    </div>
                    <span class="status-badge status-${booking.status}">
                        ${booking.status.replace(/_/g, ' ')}
                    </span>
                </div>
                <div class="booking-card-body">
                    <div class="booking-card-info">
                        📅 ${formatDate(booking.bookingDate)}
                    </div>
                    <div class="booking-card-info">
                        🕐 ${booking.bookingTime}
                    </div>
                    <div class="booking-card-info">
                        👥 ${booking.guestCount} guests
                    </div>
                    <div class="booking-card-info">
                        🍽️ Restaurant #${booking.restaurantId}
                    </div>
                </div>
            </div>
        `,
                )
                .join('');

            console.log(`✅ Loaded ${bookings.length} bookings`);
        }),
        catchError((error) => {
            console.error('Error loading bookings:', error);
            const bookingsList = document.getElementById('bookingsList');
            bookingsList.innerHTML =
                '<div class="error">Failed to load bookings</div>';
            return from([]);
        }),
    );
};

const createBooking$ = (formData) => {
    return http$.post(`${API_BASE_URL}/bookings`, formData).pipe(
        tap((result) => {
            if (result.success) {
                console.log(`✅ Booking created:`, result.data);
                showBookingResult(result.data);
                bookingCreated$.next(result.data);
            } else {
                throw new Error(result.error || 'Booking failed');
            }
        }),
        catchError((error) => {
            console.error('Error creating booking:', error);
            showError(error.message || 'Failed to create booking');
            throw error;
        }),
    );
};

const pollBookingStatus$ = (bookingId) => {
    console.log(`🔍 Starting to poll booking #${bookingId}`);

    return interval(2000).pipe(
        startWith(0),
        switchMap(() => http$.get(`${API_BASE_URL}/bookings/${bookingId}`)),
        map((result) => result.data),
        tap((booking) => {
            console.log(`📊 Booking #${bookingId} status: ${booking.status}`);
            updateBookingStatus(booking);
        }),
        takeUntil(
            timer(30000),
        ),
        filter((booking) => {
            const isFinal =
                booking.status === 'CONFIRMED' || booking.status === 'REJECTED';
            if (isFinal) {
                console.log(`🏁 Final status reached for booking #${bookingId}`);
                showBookingResult(booking);
                refreshBookings$.next(null);
            }
            return isFinal;
        }),
        take(1), // Берем только первый финальный статус
        catchError((error) => {
            console.error(`Error polling booking #${bookingId}:`, error);
            return from([]);
        }),
    );
};

const showBookingResult = (booking) => {
    const resultDiv = document.getElementById('bookingResult');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const bookingDetails = document.getElementById('bookingDetails');

    const statusConfig = {
        CREATED: {
            icon: '📝',
            title: 'Booking Created',
            message: 'Your booking request has been received and is being processed...',
        },
        CHECKING_AVAILABILITY: {
            icon: '🔍',
            title: 'Checking Availability',
            message: 'We are verifying table availability for your reservation...',
        },
        CONFIRMED: {
            icon: '✅',
            title: 'Booking Confirmed!',
            message: 'Great news! Your table has been reserved successfully.',
        },
        REJECTED: {
            icon: '❌',
            title: 'Booking Rejected',
            message: 'Sorry, no tables are available for the selected time.',
        },
    };

    const config = statusConfig[booking.status] || statusConfig.CREATED;

    resultIcon.textContent = config.icon;
    resultTitle.textContent = config.title;
    resultMessage.textContent = config.message;

    bookingDetails.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Booking ID:</span>
            <span class="detail-value">#${booking.id}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Guest Name:</span>
            <span class="detail-value">${booking.guestName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${formatDate(booking.bookingDate)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${booking.bookingTime}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Guests:</span>
            <span class="detail-value">${booking.guestCount}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="status-badge status-${booking.status}">
                ${booking.status.replace(/_/g, ' ')}
            </span>
        </div>
    `;

    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const updateBookingStatus = (booking) => {
    const statusBadges = document.querySelectorAll('.status-badge');
    statusBadges.forEach((badge) => {
        if (badge.closest('.booking-details')) {
            badge.className = `status-badge status-${booking.status}`;
            badge.textContent = booking.status.replace(/_/g, ' ');
        }
    });

    if (booking.status === 'CHECKING_AVAILABILITY') {
        document.getElementById('resultIcon').textContent = '🔍';
        document.getElementById('resultTitle').textContent = 'Checking Availability';
        document.getElementById('resultMessage').textContent =
            'We are verifying table availability for your reservation...';
    }
};

const showError = (message) => {
    const resultDiv = document.getElementById('bookingResult');
    resultDiv.innerHTML = `
        <div class="error">
            <strong>Error:</strong> ${message}
        </div>
    `;
    resultDiv.style.display = 'block';
};

const toggleSubmitButton = (isLoading) => {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    submitBtn.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline';
    btnLoader.style.display = isLoading ? 'inline' : 'none';
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Restaurant Booking System with RxJS');

    const dateInput = document.getElementById('bookingDate');
    dateInput.min = getTodayDate();
    dateInput.value = getTodayDate();

    loadRestaurants$().pipe(takeUntil(destroy$)).subscribe();

    merge(
        refreshBookings$,
        interval(10000),
    )
        .pipe(
            switchMap(() => loadBookings$()),
            takeUntil(destroy$),
        )
        .subscribe();


    const form = document.getElementById('bookingForm');
    fromEvent(form, 'submit')
        .pipe(
            tap((e) => e.preventDefault()),
            tap(() => toggleSubmitButton(true)),
            map(() => ({
                restaurantId: parseInt(document.getElementById('restaurant').value),
                guestName: document.getElementById('guestName').value,
                guestCount: parseInt(document.getElementById('guestCount').value),
                bookingDate: document.getElementById('bookingDate').value,
                bookingTime: document.getElementById('bookingTime').value,
            })),
            switchMap((formData) => createBooking$(formData)),
            finalize(() => toggleSubmitButton(false)),
            takeUntil(destroy$),
        )
        .subscribe({
            error: (err) => console.error('Form submission error:', err),
        });

    bookingCreated$
        .pipe(
            tap(() => {
                form.reset();
                dateInput.value = getTodayDate();
            }),
            takeUntil(destroy$),
        )
        .subscribe();

    bookingCreated$
        .pipe(
            switchMap((booking) => pollBookingStatus$(booking.id)),
            takeUntil(destroy$),
        )
        .subscribe();

    const refreshBtn = document.getElementById('refreshBtn');
    fromEvent(refreshBtn, 'click')
        .pipe(
            tap(() => console.log('🔄 Manual refresh triggered')),
            tap(() => refreshBookings$.next(null)),
            takeUntil(destroy$),
        )
        .subscribe();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        fromEvent(searchInput, 'input')
            .pipe(
                map((e) => e.target.value),
                debounceTime(500),
                distinctUntilChanged(),
                tap((query) => console.log(`🔍 Searching for: ${query}`)),
                // Здесь можно добавить фильтрацию
                takeUntil(destroy$),
            )
            .subscribe();
    }

    console.log('✅ Application initialized successfully');
});

window.addEventListener('beforeunload', () => {
    console.log('🧹 Cleaning up subscriptions');
    destroy$.next();
    destroy$.complete();
});