
// Room config will be loaded from backend
window.ROOMS_CONFIG = {};
function fetchRoomsConfig() {
    return fetch('php/get_rooms_config.php')
        .then(res => res.json())
        .then(data => {
            window.ROOMS_CONFIG = data || {};
        })
        .catch(err => {
            console.error('Failed to load room config:', err);
            window.ROOMS_CONFIG = {};
        });
}

document.addEventListener('DOMContentLoaded', async function() {
    let csrfToken = '';

    function refreshCsrfToken() {
        return fetch('php/get_csrf.php')
            .then(res => res.json())
            .then(data => {
                if (data.csrf_token) {
                    csrfToken = data.csrf_token;
                }
            })
            .catch(err => console.error('CSRF fetch error:', err));
    }


    // Fetch room config before anything else that depends on it
    await fetchRoomsConfig();
    refreshCsrfToken();

    // Load dynamic site settings (payment numbers, guesthouse info)
    window.siteSettings = {};
    fetch('php/get_site_settings.php')
        .then(r => r.json())
        .then(s => { window.siteSettings = s || {}; updatePaymentAccountDisplay(); })
        .catch(() => { window.siteSettings = {}; });

    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
       hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
});
    }

    // Sync Flatpickr pickers
    let topCheckInPicker, topCheckOutPicker;
    let bookingCheckInPicker, bookingCheckOutPicker;

    topCheckInPicker = flatpickr("#check_in", {
        minDate: "today",
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr, instance) {
            topCheckOutPicker.set('minDate', dateStr);
            bookingCheckInPicker.setDate(dateStr, false);
            bookingCheckOutPicker.set('minDate', dateStr);
            checkAvailability();
        }
    });

    topCheckOutPicker = flatpickr("#check_out", {
        minDate: "today",
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr, instance) {
            bookingCheckOutPicker.setDate(dateStr, false);
            checkAvailability();
        }
    });

    bookingCheckInPicker = flatpickr("#booking_check_in", {
        minDate: "today",
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr, instance) {
            bookingCheckOutPicker.set('minDate', dateStr);
            topCheckInPicker.setDate(dateStr, false);
            topCheckOutPicker.set('minDate', dateStr);
            checkAvailability();
        }
    });

    bookingCheckOutPicker = flatpickr("#booking_check_out", {
        minDate: "today",
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr, instance) {
            topCheckOutPicker.setDate(dateStr, false);
            checkAvailability();
        }
    });

    function checkAvailability() {
        let checkIn = document.getElementById('check_in').value;
        let checkOut = document.getElementById('check_out').value;
        
        // Sync fallback
        if (!checkIn) checkIn = document.getElementById('booking_check_in').value;
        if (!checkOut) checkOut = document.getElementById('booking_check_out').value;

        if (checkIn && checkOut) {
            const formData = new FormData();
            formData.append('check_in', checkIn);
            formData.append('check_out', checkOut);

            fetch('php/check_availability.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error(data.error);
                    return;
                }
                
                window.availabilityData = data;
                
                // Update room grid UI
                for (const [roomNumber, status] of Object.entries(data)) {
                    const card = document.querySelector(`.room-card[data-room="${roomNumber}"]`);
                    if (card) {
                        const badge = card.querySelector('.availability-badge');
                        const btn = card.querySelector('.book-now-btn');
                        
                        if (status === 'Maintenance') {
                            card.style.display = 'none';
                        } else {
                            card.style.display = 'flex'; 
                            badge.textContent = status;
                            
                            badge.classList.remove('badge-green', 'badge-red', 'badge-yellow');
                            if (status === 'Available') {
                                badge.classList.add('badge-green');
                                btn.disabled = false;
                                btn.textContent = 'Book Now';
                            } else {
                                badge.classList.add('badge-red'); // Booked / Reserved
                                btn.disabled = true;
                                btn.textContent = 'Unavailable';
                            }
                        }
                    }
                }
                
                // Re-populate room number options in form
                updateRoomNumberOptions();
                calculateTotal();
            })
            .catch(error => console.error('Error:', error));
        }
    }


    // Populate Room Numbers dynamically based on Room Type selection
    const roomTypeSelect = document.getElementById('room_type');
    if (roomTypeSelect) {
        roomTypeSelect.addEventListener('change', updateRoomNumberOptions);
    }

    function updateRoomNumberOptions() {
        const roomType = document.getElementById('room_type').value;
        const roomSelect = document.getElementById('booking_room');
        const ROOMS_CONFIG = window.ROOMS_CONFIG || {};
        roomSelect.innerHTML = '';
        if (!roomType) {
            roomSelect.disabled = true;
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Select Room Type First';
            roomSelect.appendChild(opt);
            return;
        }
        const roomsOfType = Object.entries(ROOMS_CONFIG).filter(([num, cfg]) => cfg.type === roomType);
        let hasAvailableRooms = false;
        roomsOfType.forEach(([num, cfg]) => {
            const availability = (window.availabilityData && window.availabilityData[num] !== undefined)
    ? window.availabilityData[num]
    : 'Available';
            if (availability === 'Maintenance') {
                return;
            }
            const opt = document.createElement('option');
            opt.value = num;
            if (availability === 'Available') {
                hasAvailableRooms = true;
                opt.textContent = `${num} - Available`;
            } else {
                opt.disabled = true;
                opt.textContent = `${num} - ${availability} (Unavailable)`;
            }
            roomSelect.appendChild(opt);
        });
        if (!hasAvailableRooms) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No Rooms Available';
            roomSelect.appendChild(opt);
            roomSelect.disabled = true;
        } else {
            roomSelect.disabled = false;
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select Room Number';
            placeholder.selected = true;
            roomSelect.insertBefore(placeholder, roomSelect.firstChild);
        }
        calculateTotal();
        updateGuestsOptions();
    }

    // Dynamic Total Calculation
    const roomSelect = document.getElementById('booking_room');
    const guestsSelect = document.getElementById('guests');
    if (roomSelect) {
        roomSelect.addEventListener('change', function() {
            calculateTotal();
            updateGuestsOptions();
        });
    }

    function updateGuestsOptions() {
        if (!guestsSelect) return;
        const ROOMS_CONFIG = window.ROOMS_CONFIG || {};
        const roomNum = document.getElementById('booking_room').value;
        const maxGuests = roomNum && ROOMS_CONFIG[roomNum] ? ROOMS_CONFIG[roomNum].maxGuests : 5;
        const current = parseInt(guestsSelect.value, 10) || 1;
        guestsSelect.innerHTML = '';
        for (let i = 1; i <= maxGuests; i++) {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = i === 1 ? '1 Guest' : `${i} Guests`;
            guestsSelect.appendChild(opt);
        }
        guestsSelect.value = String(Math.min(current, maxGuests));
    }

    function calculateTotal() {
        const ROOMS_CONFIG = window.ROOMS_CONFIG || {};
        const checkInVal = document.getElementById('booking_check_in').value;
        const checkOutVal = document.getElementById('booking_check_out').value;
        const roomNum = document.getElementById('booking_room').value;
        const totalNightsSpan = document.getElementById('total_nights');
        const pricePerNightSpan = document.getElementById('price_per_night');
        const totalPkrSpan = document.getElementById('total_pkr');
        if (!checkInVal || !checkOutVal) {
            totalNightsSpan.textContent = '0';
            pricePerNightSpan.textContent = 'PKR 0.00';
            totalPkrSpan.textContent = 'PKR 0.00';
            return;
        }
        const checkInDate = new Date(checkInVal);
        const checkOutDate = new Date(checkOutVal);
        const diffTime = checkOutDate - checkInDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) {
            totalNightsSpan.textContent = '0';
            pricePerNightSpan.textContent = 'PKR 0.00';
            totalPkrSpan.textContent = 'PKR 0.00';
            return;
        }
        totalNightsSpan.textContent = diffDays;
        let price = 0;
        if (roomNum && ROOMS_CONFIG[roomNum]) {
            price = ROOMS_CONFIG[roomNum].price;
        } else {
            // fallback: try to get price from first room of selected type
            const roomType = document.getElementById('room_type').value;
            const room = Object.values(ROOMS_CONFIG).find(cfg => cfg.type === roomType);
            price = room ? room.price : 0;
        }
        pricePerNightSpan.textContent = `PKR ${price.toFixed(2)}`;
        const total = diffDays * price;
        totalPkrSpan.textContent = `PKR ${total.toFixed(2)}`;
    }

    // Payment Info Toggle
    const paymentMethods = document.querySelectorAll('input[name="payment_method"]');
    const onlinePaymentInfo = document.getElementById('online_payment_info');
    const paymentProviderName = document.getElementById('payment_provider_name');
    const paymentAccountNum = document.getElementById('payment_account_num');
    const paymentProofInput = document.getElementById('payment_proof');

    function handlePaymentMethodChange() {
        const selectedEl = document.querySelector('input[name="payment_method"]:checked');
        if (!selectedEl) return;
        const selected = selectedEl.value;
        
        if (selected === 'pay_at_hotel') {
            onlinePaymentInfo.style.display = 'none';
            paymentProofInput.required = false;
        } else {
            onlinePaymentInfo.style.display = 'block';
            paymentProofInput.required = true;
            if (selected === 'jazzcash') {
                    paymentProviderName.textContent = 'JazzCash';
                    paymentAccountNum.textContent = window.siteSettings.jazzcash_number || '0300-1234567';
            } else if (selected === 'easypaisa') {
                    paymentProviderName.textContent = 'Easypaisa';
                    paymentAccountNum.textContent = window.siteSettings.easypaisa_number || '0311-7654321';
            }
        }
    }

    function updatePaymentAccountDisplay() {
        if (!onlinePaymentInfo) return;
        const selectedEl = document.querySelector('input[name="payment_method"]:checked');
        if (!selectedEl) return;
        const selected = selectedEl.value;
        if (selected === 'jazzcash') {
            paymentAccountNum.textContent = window.siteSettings.jazzcash_number || paymentAccountNum.textContent;
        } else if (selected === 'easypaisa') {
            paymentAccountNum.textContent = window.siteSettings.easypaisa_number || paymentAccountNum.textContent;
        }
        // Update provider display on page (if there are other placeholders)
        const providerEls = document.querySelectorAll('[data-site-setting]');
        providerEls.forEach(el => {
            const key = el.getAttribute('data-site-setting');
            if (window.siteSettings[key]) el.textContent = window.siteSettings[key];
        });
    }

    paymentMethods.forEach(method => {
        method.addEventListener('change', handlePaymentMethodChange);
    });
    handlePaymentMethodChange();

    // Auto-fill booking form when Book Now is clicked in Rooms section
    const bookButtons = document.querySelectorAll('.book-now-btn');
    bookButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if(this.disabled) return;
            
            const card = this.closest('.room-card');
            const roomNum = card.dataset.room;
            const ROOMS_CONFIG = window.ROOMS_CONFIG || {};
            const config = ROOMS_CONFIG[roomNum];
            const roomTypeSelect = document.getElementById('room_type');
            if (roomTypeSelect && config) {
                roomTypeSelect.value = config.type;
            }
            updateRoomNumberOptions();
            const roomSelect = document.getElementById('booking_room');
            if (roomSelect) {
                roomSelect.value = roomNum;
            }
            const checkIn = document.getElementById('check_in').value;
            const checkOut = document.getElementById('check_out').value;
            if (checkIn) bookingCheckInPicker.setDate(checkIn);
            if (checkOut) bookingCheckOutPicker.setDate(checkOut);
            calculateTotal();
            document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Form Submission and Client-Side Validation
    const bookingForm = document.getElementById('booking_form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Clear inline errors
            document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
            
            let isValid = true;
            
            function setError(id, msg) {
                const errSpan = document.getElementById(`err-${id}`);
                if (errSpan) {
                    errSpan.textContent = msg;
                }
                isValid = false;
            }
            
            const fullname = document.getElementById('fullname').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const cnic = document.getElementById('cnic').value.trim();
            const address = document.getElementById('address').value.trim();
            const checkIn = document.getElementById('booking_check_in').value;
            const checkOut = document.getElementById('booking_check_out').value;
            const roomType = document.getElementById('room_type').value;
            const roomNum = document.getElementById('booking_room').value;
            const guests = parseInt(document.getElementById('guests').value, 10);
            
            const paymentMethodEl = document.querySelector('input[name="payment_method"]:checked');
            const paymentMethod = paymentMethodEl ? paymentMethodEl.value : '';
            const paymentProof = document.getElementById('payment_proof');
            
            // Required Checks & Patterns
            if (!fullname) setError('fullname', 'Full Name is required');
            if (!address) setError('address', 'Address is required');
            
            if (!email) {
                setError('email', 'Email Address is required');
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setError('email', 'Please enter a valid email address');
            }
            
            if (!phone) {
                setError('phone', 'Phone number is required');
            } else if (!/^03\d{2}-\d{7}$/.test(phone)) {
                setError('phone', 'Phone must follow format: 03XX-XXXXXXX (e.g. 0300-1234567)');
            }
            
            if (!cnic) {
                setError('cnic', 'CNIC number is required');
            } else if (!/^\d{5}-\d{7}-\d$/.test(cnic)) {
                setError('cnic', 'CNIC must follow format: XXXXX-XXXXXXX-X (e.g. 12345-1234567-1)');
            }
            
            if (!checkIn) setError('check_in', 'Check-in date is required');
            if (!checkOut) setError('check_out', 'Check-out date is required');
            
            if (checkIn && checkOut) {
                const checkInDate = new Date(checkIn);
                const checkOutDate = new Date(checkOut);
                const diffTime = checkOutDate - checkInDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 0) {
                    setError('check_out', 'Check-out date must be after Check-in date (minimum 1 night)');
                }
            }
            
            if (!roomType) setError('room_type', 'Please select a room type');
            if (!roomNum) setError('room_id', 'Please select a room number');
            
            if (!guests || guests < 1) {
                setError('guests', 'Number of guests is required');
            }

            const ROOMS_CONFIG = window.ROOMS_CONFIG || {};
            if (roomNum && ROOMS_CONFIG[roomNum]) {
                const maxCap = ROOMS_CONFIG[roomNum].maxGuests;
                if (guests > maxCap) {
                    setError('guests', `This room capacity is maximum ${maxCap} guests`);
                }
            }
            
            // Payment screenshot validation
            if (paymentMethod !== 'pay_at_hotel') {
                const file = paymentProof.files[0];
                if (!file) {
                    setError('payment_proof', 'Payment screenshot is required for online payments');
                } else {
                    const validTypes = ['image/jpeg', 'image/png'];
                    if (!validTypes.includes(file.type)) {
                        setError('payment_proof', 'Only JPG or PNG images are allowed');
                    }
                    if (file.size > 2 * 1024 * 1024) {
                        setError('payment_proof', 'File size must not exceed 2MB');
                    }
                }
            }
            
            if (!isValid) {
                return; // Validation failed
            }
            
            // Disable button and show spinner
            const submitBtn = document.getElementById('submit_booking_btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');
            
            submitBtn.disabled = true;
            btnText.style.opacity = '0.5';
            btnSpinner.style.display = 'inline-block';
            
            // Send request via AJAX
            const formData = new FormData(bookingForm);
            if (csrfToken) {
                formData.append('csrf_token', csrfToken);
            }

            if (!csrfToken) {
                alert('Security token not loaded. Please refresh the page and try again.');
                return;
            }

            fetch('php/book.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.redirect_url) {
                        window.location.href = data.redirect_url;
                        return;
                    }
                    const ref = data.booking_reference || data.booking_id || '';
                    alert(ref
                        ? `Booking submitted successfully! Your reference is ${ref}.`
                        : 'Booking submitted successfully!');
                    bookingForm.reset();
                    calculateTotal();
                    updateRoomNumberOptions();
                    handlePaymentMethodChange();
                    refreshCsrfToken();
                    checkAvailability();
                } else {
                    alert('Error: ' + (data.message || 'Something went wrong. Please try again.'));
                }
            })
            .catch(error => {
                console.error('Submit Error:', error);
                alert('An unexpected error occurred during submission.');
            })
            .finally(() => {
                // Re-enable submit button
                submitBtn.disabled = false;
                btnText.style.opacity = '1';
                btnSpinner.style.display = 'none';
            });
        });
    }
});
