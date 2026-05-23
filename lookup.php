<?php
declare(strict_types=1);

$pageTitle = 'Look Up My Bookings — Tulip Guest Rooms';
$activeNav = 'lookup';

require __DIR__ . '/includes/layout_start.php';
?>

<div class="public-card wide">
    <h1><i class="fa-solid fa-magnifying-glass"></i> Look Up My Bookings</h1>
    <p class="lead">Enter the phone number you used when booking to see all your reservations.</p>

    <form id="lookup_form" class="lookup-form" novalidate>
        <div style="flex:1; min-width:200px;">
            <label for="lookup_phone" class="sr-only">Phone number</label>
            <input type="text" id="lookup_phone" name="phone" placeholder="03XX-XXXXXXX" required
                   pattern="^03\d{2}-\d{7}$" autocomplete="tel">
            <span class="error-msg-inline" id="lookup_error"></span>
        </div>
        <button type="submit" class="btn btn-primary" id="lookup_btn">
            <span class="btn-text">Search</span>
            <span class="btn-spinner" id="lookup_spinner" style="display:none;">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
            </span>
        </button>
    </form>

    <div id="lookup_results" class="data-table-wrap" style="display:none;">
        <table class="data-table" id="lookup_table">
            <thead>
                <tr>
                    <th>Booking ID</th>
                    <th>Room</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Invoice</th>
                </tr>
            </thead>
            <tbody id="lookup_tbody"></tbody>
        </table>
    </div>

    <p id="lookup_empty" class="empty-msg" style="display:none;">
        <i class="fa-solid fa-inbox"></i><br>
        No bookings found for this phone number.
    </p>
</div>

<script>
(function () {
    const form = document.getElementById('lookup_form');
    const phoneInput = document.getElementById('lookup_phone');
    const errEl = document.getElementById('lookup_error');
    const resultsWrap = document.getElementById('lookup_results');
    const tbody = document.getElementById('lookup_tbody');
    const emptyEl = document.getElementById('lookup_empty');
    const btn = document.getElementById('lookup_btn');
    const spinner = document.getElementById('lookup_spinner');
    const btnText = btn.querySelector('.btn-text');

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        errEl.textContent = '';
        resultsWrap.style.display = 'none';
        emptyEl.style.display = 'none';
        tbody.innerHTML = '';

        const phone = phoneInput.value.trim();
        if (!/^03\d{2}-\d{7}$/.test(phone)) {
            errEl.textContent = 'Phone must follow format 03XX-XXXXXXX (e.g. 0300-1234567)';
            return;
        }

        btn.disabled = true;
        btnText.style.opacity = '0.5';
        spinner.style.display = 'inline-block';

        const fd = new FormData();
        fd.append('phone', phone);

        fetch('php/api_lookup.php', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
                if (!data.success) {
                    errEl.textContent = data.message || 'Search failed.';
                    return;
                }
                if (!data.bookings || data.bookings.length === 0) {
                    emptyEl.style.display = 'block';
                    return;
                }
                data.bookings.forEach(function (b) {
                    const tr = document.createElement('tr');
                    const ref = b.booking_reference || ('#' + b.id);
                    const dates = esc(b.check_in_date) + ' → ' + esc(b.check_out_date);
                    const room = esc(b.room_number) + ' (' + esc(b.room_type) + ')';
                    const canInvoice = b.booking_status === 'Confirmed';
                    const invoiceCell = canInvoice
                        ? '<a href="' + esc(b.invoice_url) + '" class="btn btn-primary" style="padding:6px 12px;font-size:0.85rem;" download>Download</a>'
                        : '<span style="color:#999;">—</span>';
                    tr.innerHTML =
                        '<td><a href="confirmation.php?booking_id=' + encodeURIComponent(ref) + '">' + esc(ref) + '</a></td>' +
                        '<td>' + room + '</td>' +
                        '<td>' + dates + '</td>' +
                        '<td>' + esc(b.booking_status) + '</td>' +
                        '<td>' + esc(b.payment_status) + '</td>' +
                        '<td>' + invoiceCell + '</td>';
                    tbody.appendChild(tr);
                });
                resultsWrap.style.display = 'block';
            })
            .catch(function () {
                errEl.textContent = 'Network error. Please try again.';
            })
            .finally(function () {
                btn.disabled = false;
                btnText.style.opacity = '1';
                spinner.style.display = 'none';
            });
    });
})();
</script>

<?php require __DIR__ . '/includes/layout_end.php'; ?>
