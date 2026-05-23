<?php
declare(strict_types=1);

session_start();
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$pageTitle = 'Guest Reviews — Tulip Guest Rooms';
$activeNav = 'reviews';

require __DIR__ . '/includes/layout_start.php';
?>

<div class="container reviews-page">
    <div class="reviews-layout">
        <section class="public-card">
            <h1><i class="fa-solid fa-star"></i> Share Your Experience</h1>
            <p class="lead">Stayed with us? Verify your booking and leave a review.</p>

            <form id="review_form" novalidate>
                <input type="hidden" name="csrf_token" id="review_csrf" value="<?= htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8') ?>">

                <div class="form-group">
                    <label for="review_booking_id">Booking ID *</label>
                    <input type="text" id="review_booking_id" name="booking_id" required
                           placeholder="e.g. TGR-2026-0001">
                    <span class="error-msg-inline" id="err-booking_id"></span>
                </div>

                <div class="form-group">
                    <label for="review_phone">Phone number (on booking) *</label>
                    <input type="text" id="review_phone" name="phone" required placeholder="03XX-XXXXXXX">
                    <span class="error-msg-inline" id="err-phone"></span>
                </div>

                <div class="form-group">
                    <label>Your rating *</label>
                    <div class="star-input" id="star_input">
                        <?php for ($s = 5; $s >= 1; $s--): ?>
                        <input type="radio" name="rating" id="star<?= $s ?>" value="<?= $s ?>" required>
                        <label for="star<?= $s ?>" title="<?= $s ?> stars"><i class="fa-solid fa-star"></i></label>
                        <?php endfor; ?>
                    </div>
                    <span class="error-msg-inline" id="err-rating"></span>
                </div>

                <div class="form-group">
                    <label for="review_guest_name">Your name *</label>
                    <input type="text" id="review_guest_name" name="guest_name" required maxlength="100">
                    <span class="error-msg-inline" id="err-guest_name"></span>
                </div>

                <div class="form-group">
                    <label for="review_text">Your review *</label>
                    <textarea id="review_text" name="review_text" required maxlength="2000"
                              placeholder="Tell us about your stay..."></textarea>
                    <span class="error-msg-inline" id="err-review_text"></span>
                </div>

                <button type="submit" class="btn btn-primary" id="review_submit_btn">Submit Review</button>
                <p class="success-msg-inline" id="review_success" style="display:none;"></p>
            </form>
        </section>

        <section class="public-card">
            <h2>What Guests Say</h2>
            <p class="lead">Approved reviews from our guests.</p>
            <div id="reviews_list">
                <p class="empty-msg"><i class="fa-solid fa-spinner fa-spin"></i> Loading reviews...</p>
            </div>
        </section>
    </div>
</div>

<script>
(function () {
    const form = document.getElementById('review_form');
    const listEl = document.getElementById('reviews_list');
    const successEl = document.getElementById('review_success');

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s ?? '';
        return d.innerHTML;
    }

    function starsHtml(n) {
        let h = '';
        for (let i = 1; i <= 5; i++) {
            const style = i <= n ? '' : ' style="opacity:0.25"';
            h += '<i class="fa-solid fa-star"' + style + '></i>';
        }
        return h;
    }

    function loadReviews() {
        fetch('php/api_reviews.php')
            .then(r => r.json())
            .then(data => {
                if (!data.success || !data.reviews || data.reviews.length === 0) {
                    listEl.innerHTML = '<p class="empty-msg">No approved reviews yet. Be the first to share your experience!</p>';
                    return;
                }
                listEl.innerHTML = data.reviews.map(function (rev) {
                    const date = new Date(rev.created_at).toLocaleDateString('en-PK', {
                        year: 'numeric', month: 'short', day: 'numeric'
                    });
                    return '<article class="review-card">' +
                        '<div class="stars">' + starsHtml(rev.rating) + '</div>' +
                        '<p>' + esc(rev.review_text) + '</p>' +
                        '<p class="meta"><strong>' + esc(rev.guest_name) + '</strong> · ' + esc(date) + '</p>' +
                        '</article>';
                }).join('');
            })
            .catch(function () {
                listEl.innerHTML = '<p class="empty-msg">Could not load reviews.</p>';
            });
    }

    loadReviews();

    fetch('php/get_csrf.php')
        .then(r => r.json())
        .then(d => {
            if (d.csrf_token) {
                document.getElementById('review_csrf').value = d.csrf_token;
            }
        });

    function setErr(id, msg) {
        const el = document.getElementById('err-' + id);
        if (el) el.textContent = msg;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        ['booking_id', 'phone', 'rating', 'guest_name', 'review_text'].forEach(id => setErr(id, ''));
        successEl.style.display = 'none';

        let valid = true;
        const bookingId = document.getElementById('review_booking_id').value.trim();
        const phone = document.getElementById('review_phone').value.trim();
        const ratingEl = document.querySelector('input[name="rating"]:checked');
        const name = document.getElementById('review_guest_name').value.trim();
        const text = document.getElementById('review_text').value.trim();

        if (!bookingId) { setErr('booking_id', 'Booking ID is required'); valid = false; }
        if (!phone) { setErr('phone', 'Phone is required'); valid = false; }
        else if (!/^03\d{2}-\d{7}$/.test(phone)) { setErr('phone', 'Format: 03XX-XXXXXXX'); valid = false; }
        if (!ratingEl) { setErr('rating', 'Please select a star rating'); valid = false; }
        if (!name) { setErr('guest_name', 'Name is required'); valid = false; }
        if (!text) { setErr('review_text', 'Review text is required'); valid = false; }
        if (!valid) return;

        const fd = new FormData(form);
        const btn = document.getElementById('review_submit_btn');
        btn.disabled = true;

        fetch('php/api_reviews.php', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    successEl.textContent = data.message;
                    successEl.style.display = 'block';
                    form.reset();
                } else {
                    setErr('review_text', data.message || 'Submission failed.');
                }
            })
            .catch(function () {
                setErr('review_text', 'Network error. Please try again.');
            })
            .finally(function () {
                btn.disabled = false;
            });
    });
})();
</script>

<?php require __DIR__ . '/includes/layout_end.php'; ?>
