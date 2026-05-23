<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
adminRequireLogin();

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/includes/dashboard_data.php';

// CSRF Protection token initialization
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// ── ACTION HANDLERS (POST) ──────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $csrf)) {
        $_SESSION['flash_error'] = 'Invalid CSRF security token.';
        header('Location: bookings.php');
        exit;
    }

    $action    = $_POST['action'] ?? '';
    $bookingId = (int) ($_POST['booking_id'] ?? 0);

    if ($bookingId > 0) {
        // Load the booking and associated room
        $bStmt = $pdo->prepare('SELECT b.*, r.room_number FROM bookings b INNER JOIN rooms r ON b.room_id = r.id WHERE b.id = ? LIMIT 1');
        $bStmt->execute([$bookingId]);
        $booking = $bStmt->fetch();

        if ($booking) {
            require_once __DIR__ . '/../php/send_email.php';

            if ($action === 'verify') {
                // Verify action
                // payment_status='Paid', booking_status='Confirmed', room status='Booked', send confirmation email
                $pdo->prepare("UPDATE bookings SET payment_status = 'Paid', booking_status = 'Confirmed' WHERE id = ?")->execute([$bookingId]);
                $pdo->prepare("UPDATE rooms SET status = 'Booked' WHERE id = ?")->execute([$booking['room_id']]);
                
                // Send guest confirmation email + admin alert
                sendBookingEmailTriggers($pdo, $bookingId, ['payment_verified','admin_alert']);
                $_SESSION['flash_success'] = 'Booking #' . $bookingId . ' (' . ($booking['booking_reference'] ?? '') . ') verified. Confirmation email sent.';

            } elseif ($action === 'reject') {
                // Reject action
                // payment_status='Unpaid', room='Available', send rejection email
                $pdo->prepare("UPDATE bookings SET payment_status = 'Unpaid' WHERE id = ?")->execute([$bookingId]);
                $pdo->prepare("UPDATE rooms SET status = 'Available' WHERE id = ?")->execute([$booking['room_id']]);
                
                sendBookingEmailTriggers($pdo, $bookingId, ['payment_rejected']);
                $_SESSION['flash_success'] = 'Payment rejected for Booking #' . $bookingId . '. Resubmission request email sent.';

            } elseif ($action === 'cancel') {
                // Cancel action
                // booking_status='Cancelled', room='Available', send cancellation email
                $pdo->prepare("UPDATE bookings SET booking_status = 'Cancelled' WHERE id = ?")->execute([$bookingId]);
                $pdo->prepare("UPDATE rooms SET status = 'Available' WHERE id = ?")->execute([$booking['room_id']]);
                
                sendBookingEmailTriggers($pdo, $bookingId, ['booking_cancelled']);
                $_SESSION['flash_success'] = 'Booking #' . $bookingId . ' cancelled. Cancellation email sent.';

            } elseif ($action === 'noshow') {
                // No-Show action
                // booking_status='Cancelled', room='Available'
                $pdo->prepare("UPDATE bookings SET booking_status = 'Cancelled' WHERE id = ?")->execute([$bookingId]);
                $pdo->prepare("UPDATE rooms SET status = 'Available' WHERE id = ?")->execute([$booking['room_id']]);
                
                $_SESSION['flash_success'] = 'Booking #' . $bookingId . ' marked as No-Show. Room release successful.';

            } elseif ($action === 'edit') {
                // Edit form processing
                $guestName      = trim((string) ($_POST['guest_name'] ?? ''));
                $guestPhone     = trim((string) ($_POST['guest_phone'] ?? ''));
                $guestEmail     = trim((string) ($_POST['guest_email'] ?? ''));
                $guestCnic      = trim((string) ($_POST['guest_cnic'] ?? ''));
                $guestAddress   = trim((string) ($_POST['guest_address'] ?? ''));
                $checkInDate    = trim((string) ($_POST['check_in_date'] ?? ''));
                $checkOutDate   = trim((string) ($_POST['check_out_date'] ?? ''));
                $guestsCount    = (int) ($_POST['guests_count'] ?? 1);
                $roomId         = (int) ($_POST['room_id'] ?? 0);
                $paymentStatus  = trim((string) ($_POST['payment_status'] ?? 'Unpaid'));
                $bookingStatus  = trim((string) ($_POST['booking_status'] ?? 'Pending'));
                $specialRequests = trim((string) ($_POST['special_requests'] ?? ''));

                // Basic validation
                if ($guestName === '' || $guestPhone === '' || $guestEmail === '' || $roomId <= 0 || $checkInDate === '' || $checkOutDate === '') {
                    $_SESSION['flash_error'] = 'Please fill in all required fields.';
                } else {
                    // Fetch new room details to calculate pricing
                    $rStmt = $pdo->prepare('SELECT price_per_night FROM rooms WHERE id = ? LIMIT 1');
                    $rStmt->execute([$roomId]);
                    $pricePerNight = (float) $rStmt->fetchColumn();

                    // Compute nights & amount
                    $inDate  = new DateTime($checkInDate);
                    $outDate = new DateTime($checkOutDate);
                    $nights  = max(1, (int) $inDate->diff($outDate)->days);
                    $totalAmount = $nights * $pricePerNight;

                    // Update database
                    $stmt = $pdo->prepare("
                        UPDATE bookings SET
                            room_id = ?, guest_name = ?, guest_email = ?, guest_phone = ?, guest_cnic = ?, guest_address = ?,
                            check_in_date = ?, check_out_date = ?, guests_count = ?, total_amount = ?,
                            payment_status = ?, booking_status = ?, special_requests = ?
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $roomId, $guestName, $guestEmail, $guestPhone, $guestCnic, $guestAddress,
                        $checkInDate, $checkOutDate, $guestsCount, $totalAmount,
                        $paymentStatus, $bookingStatus, $specialRequests, $bookingId
                    ]);

                    // Release old room or reserve new one depending on status
                    if ($bookingStatus === 'Cancelled' || $bookingStatus === 'Completed') {
                        $pdo->prepare('UPDATE rooms SET status = "Available" WHERE id = ?')->execute([$roomId]);
                    } elseif ($bookingStatus === 'Confirmed') {
                        $pdo->prepare('UPDATE rooms SET status = "Booked" WHERE id = ?')->execute([$roomId]);
                    } elseif ($bookingStatus === 'Pending' && $paymentStatus === 'Pending Verification') {
                        $pdo->prepare('UPDATE rooms SET status = "Reserved" WHERE id = ?')->execute([$roomId]);
                    }

                    $_SESSION['flash_success'] = 'Booking #' . $bookingId . ' updated successfully.';
                }
            }
        } else {
            $_SESSION['flash_error'] = 'Booking not found.';
        }
    }
    header('Location: bookings.php?' . http_build_query(array_filter($_GET)));
    exit;
}

// ── GET FILTERS & QUERIES ───────────────────────────────────────────
$search        = trim((string) ($_GET['search'] ?? ''));
$roomType      = trim((string) ($_GET['room_type'] ?? ''));
$bookingStatus = trim((string) ($_GET['booking_status'] ?? ''));
$paymentStatus = trim((string) ($_GET['payment_status'] ?? ''));
$source        = trim((string) ($_GET['source'] ?? ''));
$startDate     = trim((string) ($_GET['start_date'] ?? ''));
$endDate       = trim((string) ($_GET['end_date'] ?? ''));

// Sorting rules
$sortBy        = trim((string) ($_GET['sort_by'] ?? 'date'));
$sortOrder     = strtolower(trim((string) ($_GET['sort_order'] ?? 'desc'))) === 'asc' ? 'asc' : 'desc';

$allowedSort = [
    'id'        => 'b.id',
    'reference' => 'b.booking_reference',
    'name'      => 'b.guest_name',
    'phone'     => 'b.guest_phone',
    'room'      => 'r.room_number',
    'type'      => 'r.room_type',
    'check_in'  => 'b.check_in_date',
    'check_out' => 'b.check_out_date',
    'guests'    => 'b.guests_count',
    'source'    => 'b.payment_method',
    'payment'   => 'b.payment_status',
    'status'    => 'b.booking_status',
    'date'      => 'b.created_at',
];

$orderByColumn = $allowedSort[$sortBy] ?? 'b.created_at';

// Dynamic query construction
$where = [];
$params = [];

if ($search !== '') {
    $where[] = '(b.guest_name LIKE :search OR b.guest_phone LIKE :search OR r.room_number LIKE :search)';
    $params['search'] = '%' . $search . '%';
}
if ($roomType !== '') {
    $where[] = 'r.room_type = :room_type';
    $params['room_type'] = $roomType;
}
if ($bookingStatus !== '') {
    $where[] = 'b.booking_status = :booking_status';
    $params['booking_status'] = $bookingStatus;
}
if ($paymentStatus !== '') {
    $where[] = 'b.payment_status = :payment_status';
    $params['payment_status'] = $paymentStatus;
}
if ($source !== '') {
    $where[] = 'b.payment_method = :source';
    $params['source'] = $source;
}
if ($startDate !== '') {
    $where[] = 'b.check_in_date >= :start_date';
    $params['start_date'] = $startDate;
}
if ($endDate !== '') {
    $where[] = 'b.check_in_date <= :end_date';
    $params['end_date'] = $endDate;
}

$whereSql = '';
if (count($where) > 0) {
    $whereSql = 'WHERE ' . implode(' AND ', $where);
}

// ── CSV EXPORT TRIGGER ──────────────────────────────────────────────
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    if (ob_get_level()) {
        ob_end_clean();
    }

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="bookings_export_' . date('Ymd_His') . '.csv"');

    $output = fopen('php://output', 'w');
    fwrite($output, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel compatibility

    fputcsv($output, [
        'ID', 'Reference', 'Guest Name', 'Email', 'Phone', 'CNIC', 'Address',
        'Room Number', 'Room Type', 'Check-In', 'Check-Out', 'Guests Count',
        'Total Amount (PKR)', 'Payment Method', 'Payment Status', 'Booking Status',
        'Created At'
    ]);

    $csvSql = "
        SELECT b.*, r.room_number, r.room_type
        FROM bookings b
        INNER JOIN rooms r ON b.room_id = r.id
        $whereSql
        ORDER BY $orderByColumn $sortOrder
    ";
    $csvStmt = $pdo->prepare($csvSql);
    $csvStmt->execute($params);

    while ($row = $csvStmt->fetch()) {
        fputcsv($output, [
            $row['id'],
            $row['booking_reference'] ?? '',
            $row['guest_name'],
            $row['guest_email'],
            $row['guest_phone'],
            $row['guest_cnic'],
            $row['guest_address'],
            $row['room_number'],
            $row['room_type'],
            $row['check_in_date'],
            $row['check_out_date'],
            $row['guests_count'],
            $row['total_amount'],
            formatPaymentMethodLabel((string) $row['payment_method']),
            $row['payment_status'],
            $row['booking_status'],
            $row['created_at']
        ]);
    }

    fclose($output);
    exit;
}

// ── PAGINATION & DB LOAD ───────────────────────────────────────────
$page = max(1, (int) ($_GET['page'] ?? 1));
$limit = 20;
$offset = ($page - 1) * $limit;

// Count total items
$countSql = "
    SELECT COUNT(*) 
    FROM bookings b
    INNER JOIN rooms r ON b.room_id = r.id
    $whereSql
";
$countStmt = $pdo->prepare($countSql);
$countStmt->execute($params);
$totalRows = (int) $countStmt->fetchColumn();
$totalPages = (int) ceil($totalRows / $limit);

// Fetch page rows
$mainSql = "
    SELECT b.*, r.room_number, r.room_type
    FROM bookings b
    INNER JOIN rooms r ON b.room_id = r.id
    $whereSql
    ORDER BY $orderByColumn $sortOrder
    LIMIT :limit OFFSET :offset
";
$mainStmt = $pdo->prepare($mainSql);

// Bind variables for LIMIT/OFFSET as integers
foreach ($params as $key => $val) {
    $mainStmt->bindValue($key, $val);
}
$mainStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$mainStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$mainStmt->execute();
$bookings = $mainStmt->fetchAll();

// Fetch Pending Verification bookings separately for top section
$pendingStmt = $pdo->query("
    SELECT b.*, r.room_number, r.room_type
    FROM bookings b
    INNER JOIN rooms r ON b.room_id = r.id
    WHERE b.payment_status = 'Pending Verification'
    ORDER BY b.created_at DESC
");
$pendingBookings = $pendingStmt->fetchAll();

// Load all rooms for edit selector
$roomsStmt = $pdo->query('SELECT id, room_number, room_type, price_per_night, max_guests FROM rooms ORDER BY CAST(room_number AS UNSIGNED)');
$allRooms = $roomsStmt->fetchAll();

$activePage = 'bookings';
$pageTitle  = 'Bookings Manager';

// Helper for clickable sort header URL building
function sortLink(string $col, string $currBy, string $currOrder): string {
    $params = $_GET;
    $params['sort_by'] = $col;
    $params['sort_order'] = ($currBy === $col && $currOrder === 'asc') ? 'desc' : 'asc';
    $params['page'] = 1;
    return '?' . http_build_query($params);
}

// Helper for pagination link building
function paginationLink(int $p): string {
    $params = $_GET;
    $params['page'] = $p;
    return '?' . http_build_query($params);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= adminH($pageTitle) ?> — Tulip Admin</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-body">
<div class="admin-layout">
    <?php require __DIR__ . '/includes/sidebar.php'; ?>

    <main class="admin-main">
        <div class="admin-page-header">
            <h1>All Bookings</h1>
            <div style="display:flex;gap:12px;">
                <a href="?export=csv<?= count($params) > 0 ? '&' . http_build_query(array_filter($_GET, fn($k) => $k !== 'export', ARRAY_FILTER_USE_KEY)) : '' ?>" class="admin-btn admin-btn-outline admin-btn-sm">
                    <i class="fa-solid fa-file-csv"></i> Export to CSV
                </a>
                <a href="walkin.php" class="admin-btn admin-btn-gold admin-btn-sm">
                    <i class="fa-solid fa-plus"></i> Walk-in
                </a>
            </div>
        </div>

        <?php if (!empty($_SESSION['flash_success'])): ?>
            <div class="admin-alert admin-alert-info">
                <i class="fa-solid fa-circle-check"></i> <?= adminH($_SESSION['flash_success']) ?>
                <?php unset($_SESSION['flash_success']); ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($_SESSION['flash_error'])): ?>
            <div class="admin-alert admin-alert-error">
                <i class="fa-solid fa-circle-exclamation"></i> <?= adminH($_SESSION['flash_error']) ?>
                <?php unset($_SESSION['flash_error']); ?>
            </div>
        <?php endif; ?>

        <!-- ── HIGHLIGHTED PENDING VERIFICATION BLOCK (TOP) ────────────────── -->
        <?php if (count($pendingBookings) > 0): ?>
            <div class="highlight-panel">
                <h2><i class="fa-solid fa-triangle-exclamation"></i> Awaiting verification (<?= count($pendingBookings) ?>)</h2>
                <div class="admin-table-wrap">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Ref</th>
                                <th>Guest</th>
                                <th>Phone</th>
                                <th>Room</th>
                                <th>Dates</th>
                                <th>Amount</th>
                                <th>Source</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($pendingBookings as $pb): ?>
                                <tr class="row-pending-verification">
                                    <td><strong><?= adminH((string) ($pb['booking_reference'] ?? '#' . $pb['id'])) ?></strong></td>
                                    <td><?= adminH((string) $pb['guest_name']) ?></td>
                                    <td><?= adminH((string) $pb['guest_phone']) ?></td>
                                    <td><?= adminH((string) $pb['room_number']) ?> <small style="color:#666;">(<?= adminH((string) $pb['room_type']) ?>)</small></td>
                                    <td><?= adminH((string) $pb['check_in_date']) ?> → <?= adminH((string) $pb['check_out_date']) ?></td>
                                    <td><?= adminH(adminFormatPkr((float) $pb['total_amount'])) ?></td>
                                    <td><?= adminH(formatPaymentMethodLabel((string) $pb['payment_method'])) ?></td>
                                    <td><?= adminH(date('d M H:i', strtotime((string) $pb['created_at']))) ?></td>
                                    <td>
                                        <div class="actions-group">
                                            <?php if (!empty($pb['payment_proof'])): ?>
                                                <button class="btn-action btn-action-view" onclick="openScreenshot('view_proof.php?booking_id=<?= $pb['id'] ?>', '<?= adminH($pb['guest_name']) ?> — Proof')">
                                                    <i class="fa-solid fa-image"></i> View Screenshot
                                                </button>
                                            <?php endif; ?>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Verify this payment? Check-in room status will be updated to Booked and confirmation email will be sent.');">
                                                <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                                                <input type="hidden" name="booking_id" value="<?= $pb['id'] ?>">
                                                <input type="hidden" name="action" value="verify">
                                                <button type="submit" class="btn-action btn-action-success"><i class="fa-solid fa-check"></i> Verify</button>
                                            </form>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Reject this payment proof? An email request to upload a valid screenshot will be sent.');">
                                                <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                                                <input type="hidden" name="booking_id" value="<?= $pb['id'] ?>">
                                                <input type="hidden" name="action" value="reject">
                                                <button type="submit" class="btn-action btn-action-cancel"><i class="fa-solid fa-xmark"></i> Reject</button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php endif; ?>

        <!-- ── SEARCH & FILTERS DASHBOARD ──────────────────────────────────── -->
        <section class="admin-panel filter-panel">
            <h2><i class="fa-solid fa-filter"></i> Search & Filters</h2>
            <form method="GET" action="bookings.php">
                <!-- Preserve sorting parameters -->
                <?php if (isset($_GET['sort_by'])): ?>
                    <input type="hidden" name="sort_by" value="<?= adminH($_GET['sort_by']) ?>">
                <?php endif; ?>
                <?php if (isset($_GET['sort_order'])): ?>
                    <input type="hidden" name="sort_order" value="<?= adminH($_GET['sort_order']) ?>">
                <?php endif; ?>

                <div class="filter-grid">
                    <div>
                        <label style="font-weight:600;font-size:0.85rem;margin-bottom:4px;display:block;">Search Query</label>
                        <input type="text" name="search" id="search_input" class="form-control" placeholder="Name, phone, room..." value="<?= adminH($search) ?>">
                    </div>
                    <div>
                        <label style="font-weight:600;font-size:0.85rem;margin-bottom:4px;display:block;">Room Type</label>
                        <select name="room_type" class="form-control">
                            <option value="">All Types</option>
                            <option value="Standard Room" <?= $roomType === 'Standard Room' ? 'selected' : '' ?>>Standard Room</option>
                            <option value="Deluxe Room" <?= $roomType === 'Deluxe Room' ? 'selected' : '' ?>>Deluxe Room</option>
                            <option value="Suite" <?= $roomType === 'Suite' ? 'selected' : '' ?>>Suite</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:600;font-size:0.85rem;margin-bottom:4px;display:block;">Booking Status</label>
                        <select name="booking_status" class="form-control">
                            <option value="">All Booking Statuses</option>
                            <option value="Pending" <?= $bookingStatus === 'Pending' ? 'selected' : '' ?>>Pending</option>
                            <option value="Confirmed" <?= $bookingStatus === 'Confirmed' ? 'selected' : '' ?>>Confirmed</option>
                            <option value="Completed" <?= $bookingStatus === 'Completed' ? 'selected' : '' ?>>Completed</option>
                            <option value="Cancelled" <?= $bookingStatus === 'Cancelled' ? 'selected' : '' ?>>Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:600;font-size:0.85rem;margin-bottom:4px;display:block;">Payment Status</label>
                        <select name="payment_status" class="form-control">
                            <option value="">All Payment Statuses</option>
                            <option value="Pending Verification" <?= $paymentStatus === 'Pending Verification' ? 'selected' : '' ?>>Pending Verification</option>
                            <option value="Unpaid" <?= $paymentStatus === 'Unpaid' ? 'selected' : '' ?>>Unpaid</option>
                            <option value="Paid" <?= $paymentStatus === 'Paid' ? 'selected' : '' ?>>Paid</option>
                            <option value="Failed" <?= $paymentStatus === 'Failed' ? 'selected' : '' ?>>Failed</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:600;font-size:0.85rem;margin-bottom:4px;display:block;">Source</label>
                        <select name="source" class="form-control">
                            <option value="">All Sources</option>
                            <option value="jazzcash" <?= $source === 'jazzcash' ? 'selected' : '' ?>>JazzCash</option>
                            <option value="easypaisa" <?= $source === 'easypaisa' ? 'selected' : '' ?>>Easypaisa</option>
                            <option value="pay_at_hotel" <?= $source === 'pay_at_hotel' ? 'selected' : '' ?>>Pay at Hotel</option>
                            <option value="walk_in" <?= $source === 'walk_in' ? 'selected' : '' ?>>Walk-in</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:600;font-size:0.85rem;margin-bottom:4px;display:block;">Check-in From</label>
                        <input type="date" name="start_date" class="form-control" value="<?= adminH($startDate) ?>">
                    </div>
                    <div>
                        <label style="font-weight:600;font-size:0.85rem;margin-bottom:4px;display:block;">Check-in To</label>
                        <input type="date" name="end_date" class="form-control" value="<?= adminH($endDate) ?>">
                    </div>
                </div>

                <div class="filter-actions">
                    <a href="bookings.php" class="admin-btn admin-btn-outline admin-btn-sm" style="margin-right:auto;">Reset</a>
                    <button type="submit" class="admin-btn admin-btn-gold admin-btn-sm"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
                </div>
            </form>
        </section>

        <!-- ── MAIN BOOKINGS TABLE ────────────────────────────────────────── -->
        <section class="admin-panel">
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th class="sortable <?= $sortBy === 'id' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('id', $sortBy, $sortOrder) ?>'">ID</th>
                            <th class="sortable <?= $sortBy === 'name' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('name', $sortBy, $sortOrder) ?>'">Name</th>
                            <th class="sortable <?= $sortBy === 'phone' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('phone', $sortBy, $sortOrder) ?>'">Phone</th>
                            <th class="sortable <?= $sortBy === 'room' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('room', $sortBy, $sortOrder) ?>'">Room</th>
                            <th class="sortable <?= $sortBy === 'type' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('type', $sortBy, $sortOrder) ?>'">Type</th>
                            <th class="sortable <?= $sortBy === 'check_in' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('check_in', $sortBy, $sortOrder) ?>'">Check-in</th>
                            <th class="sortable <?= $sortBy === 'check_out' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('check_out', $sortBy, $sortOrder) ?>'">Check-out</th>
                            <th class="sortable <?= $sortBy === 'guests' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('guests', $sortBy, $sortOrder) ?>'">Guests</th>
                            <th class="sortable <?= $sortBy === 'source' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('source', $sortBy, $sortOrder) ?>'">Source</th>
                            <th class="sortable <?= $sortBy === 'payment' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('payment', $sortBy, $sortOrder) ?>'">Payment</th>
                            <th class="sortable <?= $sortBy === 'status' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('status', $sortBy, $sortOrder) ?>'">Status</th>
                            <th class="sortable <?= $sortBy === 'date' ? $sortOrder : '' ?>" onclick="location.href='<?= sortLink('date', $sortBy, $sortOrder) ?>'">Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (count($bookings) === 0): ?>
                            <tr>
                                <td colspan="13" style="text-align:center;color:#888;padding:24px;">No bookings found matching filter criteria.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($bookings as $b):
                                $bStatusBadge = match ($b['booking_status']) {
                                    'Confirmed' => 'badge-confirmed',
                                    'Cancelled' => 'badge-cancelled',
                                    default     => 'badge-pending',
                                };
                                $pStatusBadge = match ($b['payment_status']) {
                                    'Paid'                 => 'badge-confirmed',
                                    'Failed'               => 'badge-cancelled',
                                    'Pending Verification' => 'badge-pending',
                                    default                => 'badge-pending', // Unpaid
                                };
                                $rawBookingJson = json_encode($b);
                            ?>
                                <tr class="main-booking-row" 
                                    data-name="<?= adminH($b['guest_name']) ?>" 
                                    data-phone="<?= adminH($b['guest_phone']) ?>" 
                                    data-room="<?= adminH($b['room_number']) ?>">
                                    <td><strong><?= $b['id'] ?></strong><br><small style="color:#666;font-size:0.75rem;"><?= adminH($b['booking_reference'] ?? '') ?></small></td>
                                    <td><?= adminH($b['guest_name']) ?></td>
                                    <td><?= adminH($b['guest_phone']) ?></td>
                                    <td><strong><?= adminH($b['room_number']) ?></strong></td>
                                    <td><?= adminH($b['room_type']) ?></td>
                                    <td><?= adminH($b['check_in_date']) ?></td>
                                    <td><?= adminH($b['check_out_date']) ?></td>
                                    <td style="text-align:center;"><?= (int) $b['guests_count'] ?></td>
                                    <td><?= adminH(formatPaymentMethodLabel((string) $b['payment_method'])) ?></td>
                                    <td><span class="badge <?= $pStatusBadge ?>"><?= adminH($b['payment_status']) ?></span></td>
                                    <td><span class="badge <?= $bStatusBadge ?>"><?= adminH($b['booking_status']) ?></span></td>
                                    <td><small><?= adminH(date('Y-m-d H:i', strtotime($b['created_at']))) ?></small></td>
                                    <td>
                                        <div class="actions-group">
                                            <button class="btn-action btn-action-view" onclick='openDetails(<?= $rawBookingJson ?>)'>
                                                <i class="fa-solid fa-eye"></i> View
                                            </button>
                                            <button class="btn-action btn-action-edit" onclick='openEdit(<?= $rawBookingJson ?>)'>
                                                <i class="fa-solid fa-pen-to-square"></i> Edit
                                            </button>
                                            <?php if ($b['booking_status'] !== 'Cancelled'): ?>
                                                <form method="POST" style="display:inline;" onsubmit="return confirm('Cancel this booking? Room status will return to Available and cancellation email will be sent.');">
                                                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                                                    <input type="hidden" name="booking_id" value="<?= $b['id'] ?>">
                                                    <input type="hidden" name="action" value="cancel">
                                                    <button type="submit" class="btn-action btn-action-cancel" title="Cancel Booking">
                                                        <i class="fa-solid fa-ban"></i> Cancel
                                                    </button>
                                                </form>
                                                <form method="POST" style="display:inline;" onsubmit="return confirm('Mark this booking as No-Show? Room status will return to Available.');">
                                                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                                                    <input type="hidden" name="booking_id" value="<?= $b['id'] ?>">
                                                    <input type="hidden" name="action" value="noshow">
                                                    <button type="submit" class="btn-action btn-action-download" title="Mark No-Show">
                                                        <i class="fa-solid fa-user-slash"></i> No-Show
                                                    </button>
                                                </form>
                                            <?php endif; ?>
                                            <a href="../php/generate_invoice.php?booking_id=<?= $b['id'] ?>" class="btn-action btn-action-download" title="Download Invoice">
                                                <i class="fa-solid fa-file-arrow-down"></i> Invoice
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>

            <!-- Pagination block -->
            <?php if ($totalPages > 1): ?>
                <div class="pagination-wrap">
                    <div class="pagination-info">
                        Showing <?= min($totalRows, $offset + 1) ?> to <?= min($totalRows, $offset + $limit) ?> of <?= $totalRows ?> bookings
                    </div>
                    <nav class="pagination-nav">
                        <a href="<?= paginationLink(1) ?>" class="pagination-link <?= $page === 1 ? 'disabled' : '' ?>"><i class="fa-solid fa-angles-left"></i></a>
                        <a href="<?= paginationLink($page - 1) ?>" class="pagination-link <?= $page === 1 ? 'disabled' : '' ?>"><i class="fa-solid fa-angle-left"></i></a>
                        
                        <?php
                        $startPage = max(1, $page - 2);
                        $endPage = min($totalPages, $page + 2);
                        for ($p = $startPage; $p <= $endPage; $p++):
                        ?>
                            <a href="<?= paginationLink($p) ?>" class="pagination-link <?= $page === $p ? 'active' : '' ?>"><?= $p ?></a>
                        <?php endfor; ?>

                        <a href="<?= paginationLink($page + 1) ?>" class="pagination-link <?= $page === $totalPages ? 'disabled' : '' ?>"><i class="fa-solid fa-angle-right"></i></a>
                        <a href="<?= paginationLink($totalPages) ?>" class="pagination-link <?= $page === $totalPages ? 'disabled' : '' ?>"><i class="fa-solid fa-angles-right"></i></a>
                    </nav>
                </div>
            <?php endif; ?>
        </section>
    </main>
</div>

<!-- ── VIEW SCREENSHOT MODAL ────────────────────────────────────────── -->
<div id="screenshot_modal" class="modal-overlay">
    <div class="modal-container">
        <div class="modal-header">
            <h3 id="screenshot_title">Payment Screenshot</h3>
            <button class="modal-close" onclick="closeModal('screenshot_modal')"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body lightbox-content">
            <img id="screenshot_img" src="" alt="Payment Proof Screen" class="lightbox-img">
        </div>
        <div class="modal-footer">
            <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="closeModal('screenshot_modal')">Close</button>
        </div>
    </div>
</div>

<!-- ── VIEW BOOKING DETAILS MODAL ───────────────────────────────────── -->
<div id="details_modal" class="modal-overlay">
    <div class="modal-container modal-lg">
        <div class="modal-header">
            <h3>Booking Details</h3>
            <button class="modal-close" onclick="closeModal('details_modal')"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                <div>
                    <h4 style="border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:12px;color:var(--primary);">Guest Information</h4>
                    <p style="margin-bottom:8px;"><strong>Full Name:</strong> <span id="dt_name"></span></p>
                    <p style="margin-bottom:8px;"><strong>Email Address:</strong> <span id="dt_email"></span></p>
                    <p style="margin-bottom:8px;"><strong>Phone Number:</strong> <span id="dt_phone"></span></p>
                    <p style="margin-bottom:8px;"><strong>CNIC / Identity:</strong> <span id="dt_cnic"></span></p>
                    <p style="margin-bottom:8px;"><strong>Address:</strong> <span id="dt_address"></span></p>
                </div>
                <div>
                    <h4 style="border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:12px;color:var(--primary);">Stay & Pricing</h4>
                    <p style="margin-bottom:8px;"><strong>Room:</strong> <span id="dt_room"></span></p>
                    <p style="margin-bottom:8px;"><strong>Check-in Date:</strong> <span id="dt_checkin"></span></p>
                    <p style="margin-bottom:8px;"><strong>Check-out Date:</strong> <span id="dt_checkout"></span></p>
                    <p style="margin-bottom:8px;"><strong>Guests Count:</strong> <span id="dt_guests"></span></p>
                    <p style="margin-bottom:8px;"><strong>Total Amount:</strong> <strong style="color:var(--primary);" id="dt_amount"></strong></p>
                </div>
            </div>
            <div style="margin-top:20px;">
                <h4 style="border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:12px;color:var(--primary);">Payment & Status</h4>
                <p style="margin-bottom:8px;"><strong>Payment Method:</strong> <span id="dt_method"></span></p>
                <p style="margin-bottom:8px;"><strong>Payment Status:</strong> <span id="dt_pay_status"></span></p>
                <p style="margin-bottom:8px;"><strong>Booking Status:</strong> <span id="dt_book_status"></span></p>
                <p style="margin-bottom:8px;"><strong>Created Date:</strong> <span id="dt_date"></span></p>
                <p style="margin-bottom:8px;"><strong>Special Requests:</strong></p>
                <blockquote id="dt_requests" style="background:#f9f9f9;padding:12px;border-left:4px solid var(--gold);font-style:italic;"></blockquote>
            </div>
        </div>
        <div class="modal-footer">
            <a href="" id="dt_invoice_link" class="admin-btn admin-btn-gold admin-btn-sm" style="text-decoration:none;"><i class="fa-solid fa-file-invoice"></i> Download Invoice</a>
            <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="closeModal('details_modal')">Close</button>
        </div>
    </div>
</div>

<!-- ── EDIT BOOKING MODAL ───────────────────────────────────────────── -->
<div id="edit_modal" class="modal-overlay">
    <div class="modal-container modal-lg">
        <form method="POST" id="edit_form">
            <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
            <input type="hidden" name="action" value="edit">
            <input type="hidden" name="booking_id" id="edit_booking_id">

            <div class="modal-header">
                <h3>Edit Booking Details</h3>
                <button type="button" class="modal-close" onclick="closeModal('edit_modal')"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="modal-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                    <div>
                        <h4 style="border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:12px;color:var(--primary);">Guest Information</h4>
                        <div class="admin-form-group">
                            <label for="edit_guest_name">Full Name <span style="color:red;">*</span></label>
                            <input type="text" name="guest_name" id="edit_guest_name" class="form-control" required>
                        </div>
                        <div class="admin-form-group">
                            <label for="edit_guest_email">Email Address <span style="color:red;">*</span></label>
                            <input type="email" name="guest_email" id="edit_guest_email" class="form-control" required>
                        </div>
                        <div class="admin-form-group">
                            <label for="edit_guest_phone">Phone Number <span style="color:red;">*</span></label>
                            <input type="text" name="guest_phone" id="edit_guest_phone" class="form-control" required>
                        </div>
                        <div class="admin-form-group">
                            <label for="edit_guest_cnic">CNIC / ID</label>
                            <input type="text" name="guest_cnic" id="edit_guest_cnic" class="form-control">
                        </div>
                        <div class="admin-form-group">
                            <label for="edit_guest_address">Address</label>
                            <textarea name="guest_address" id="edit_guest_address" class="form-control" rows="3"></textarea>
                        </div>
                    </div>
                    <div>
                        <h4 style="border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:12px;color:var(--primary);">Stay & Pricing</h4>
                        <div class="admin-form-group">
                            <label for="edit_room_id">Select Room <span style="color:red;">*</span></label>
                            <select name="room_id" id="edit_room_id" class="form-control" required onchange="calculateEditPricing()">
                                <?php foreach ($allRooms as $rm): ?>
                                    <option value="<?= $rm['id'] ?>" data-price="<?= $rm['price_per_night'] ?>">
                                        Room <?= adminH((string) $rm['room_number']) ?> (<?= adminH((string) $rm['room_type']) ?> — PKR <?= number_format((float)$rm['price_per_night'], 2) ?>/night)
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="admin-form-group">
                            <label for="edit_check_in_date">Check-in Date <span style="color:red;">*</span></label>
                            <input type="date" name="check_in_date" id="edit_check_in_date" class="form-control" required onchange="calculateEditPricing()">
                        </div>
                        <div class="admin-form-group">
                            <label for="edit_check_out_date">Check-out Date <span style="color:red;">*</span></label>
                            <input type="date" name="check_out_date" id="edit_check_out_date" class="form-control" required onchange="calculateEditPricing()">
                        </div>
                        <div class="admin-form-group">
                            <label for="edit_guests_count">Guests Count</label>
                            <input type="number" name="guests_count" id="edit_guests_count" class="form-control" min="1" required>
                        </div>
                        <div class="admin-form-group">
                            <label for="edit_total_amount">Total Amount (PKR)</label>
                            <input type="text" id="edit_total_amount" class="form-control" style="background:#e9ecef;font-weight:700;color:var(--primary);" readonly>
                            <small style="color:#666;">Automatically recalculated based on room and dates selected.</small>
                        </div>
                    </div>
                </div>
                <div style="margin-top:20px;">
                    <h4 style="border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:12px;color:var(--primary);">Payment & Status</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                        <div class="admin-form-group">
                            <label for="edit_payment_status">Payment Status</label>
                            <select name="payment_status" id="edit_payment_status" class="form-control">
                                <option value="Unpaid">Unpaid</option>
                                <option value="Pending Verification">Pending Verification</option>
                                <option value="Paid">Paid</option>
                                <option value="Failed">Failed</option>
                            </select>
                        </div>
                        <div class="admin-form-group">
                            <label for="edit_booking_status">Booking Status</label>
                            <select name="booking_status" id="edit_booking_status" class="form-control">
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div class="admin-form-group">
                        <label for="edit_special_requests">Special Requests</label>
                        <textarea name="special_requests" id="edit_special_requests" class="form-control" rows="3"></textarea>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="submit" class="admin-btn admin-btn-gold admin-btn-sm"><i class="fa-solid fa-save"></i> Save Changes</button>
                <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" onclick="closeModal('edit_modal')">Cancel</button>
            </div>
        </form>
    </div>
</div>

<script>
// Open / Close Modals
function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Esc key closes active modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.classList.remove('active'));
    }
});

// Click overlay closes modal
document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
});

// Screenshot Lightbox opener
function openScreenshot(src, title) {
    document.getElementById('screenshot_img').src = src;
    document.getElementById('screenshot_title').textContent = title;
    openModal('screenshot_modal');
}

// Details Modal opener
function openDetails(booking) {
    document.getElementById('dt_name').textContent = booking.guest_name;
    document.getElementById('dt_email').textContent = booking.guest_email;
    document.getElementById('dt_phone').textContent = booking.guest_phone;
    document.getElementById('dt_cnic').textContent = booking.guest_cnic || '—';
    document.getElementById('dt_address').textContent = booking.guest_address || '—';
    document.getElementById('dt_room').textContent = booking.room_number + ' (' + booking.room_type + ')';
    document.getElementById('dt_checkin').textContent = booking.check_in_date;
    document.getElementById('dt_checkout').textContent = booking.check_out_date;
    document.getElementById('dt_guests').textContent = booking.guests_count;
    document.getElementById('dt_amount').textContent = 'PKR ' + parseFloat(booking.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2});
    
    // Format source label
    let sourceLabel = booking.payment_method;
    if (sourceLabel === 'jazzcash') sourceLabel = 'JazzCash';
    else if (sourceLabel === 'easypaisa') sourceLabel = 'Easypaisa';
    else if (sourceLabel === 'pay_at_hotel') sourceLabel = 'Pay at Hotel';
    else if (sourceLabel === 'walk_in') sourceLabel = 'Walk-in';
    document.getElementById('dt_method').textContent = sourceLabel;
    
    document.getElementById('dt_pay_status').textContent = booking.payment_status;
    document.getElementById('dt_book_status').textContent = booking.booking_status;
    document.getElementById('dt_date').textContent = booking.created_at;
    document.getElementById('dt_requests').textContent = booking.special_requests ? booking.special_requests : 'No special requests.';
    document.getElementById('dt_invoice_link').href = '../php/generate_invoice.php?booking_id=' + booking.id;
    
    openModal('details_modal');
}

// Edit Modal opener
function openEdit(booking) {
    document.getElementById('edit_booking_id').value = booking.id;
    document.getElementById('edit_guest_name').value = booking.guest_name;
    document.getElementById('edit_guest_email').value = booking.guest_email;
    document.getElementById('edit_guest_phone').value = booking.guest_phone;
    document.getElementById('edit_guest_cnic').value = booking.guest_cnic || '';
    document.getElementById('edit_guest_address').value = booking.guest_address || '';
    document.getElementById('edit_room_id').value = booking.room_id;
    document.getElementById('edit_check_in_date').value = booking.check_in_date;
    document.getElementById('edit_check_out_date').value = booking.check_out_date;
    document.getElementById('edit_guests_count').value = booking.guests_count;
    document.getElementById('edit_payment_status').value = booking.payment_status;
    document.getElementById('edit_booking_status').value = booking.booking_status;
    document.getElementById('edit_special_requests').value = booking.special_requests || '';
    
    calculateEditPricing();
    openModal('edit_modal');
}

// Automatic pricing calculation inside Edit form
function calculateEditPricing() {
    const checkInStr = document.getElementById('edit_check_in_date').value;
    const checkOutStr = document.getElementById('edit_check_out_date').value;
    const roomSelect = document.getElementById('edit_room_id');
    
    if (!checkInStr || !checkOutStr || !roomSelect.value) return;
    
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);
    
    let nights = 1;
    if (checkOut > checkIn) {
        const diffTime = Math.abs(checkOut - checkIn);
        nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    const selectedOption = roomSelect.options[roomSelect.selectedIndex];
    const pricePerNight = parseFloat(selectedOption.dataset.price || 0);
    const total = nights * pricePerNight;
    
    document.getElementById('edit_total_amount').value = 'PKR ' + total.toLocaleString(undefined, {minimumFractionDigits: 2});
}

// JS Live Search matching current page rows
(function() {
    const searchInput = document.getElementById('search_input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const filter = this.value.toLowerCase().trim();
            const rows = document.querySelectorAll('.main-booking-row');
            
            rows.forEach(row => {
                const name = row.dataset.name ? row.dataset.name.toLowerCase() : '';
                const phone = row.dataset.phone ? row.dataset.phone.toLowerCase() : '';
                const room = row.dataset.room ? row.dataset.room.toLowerCase() : '';
                
                if (name.includes(filter) || phone.includes(filter) || room.includes(filter)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
})();
</script>
</body>
</html>
