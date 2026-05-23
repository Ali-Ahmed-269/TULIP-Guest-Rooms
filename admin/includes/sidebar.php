<?php
/** @var string $activePage dashboard|bookings|payments|walkin|reviews|rooms|guests|reports|settings */
$activePage = $activePage ?? 'dashboard';
$adminName = adminH((string) ($_SESSION['admin_username'] ?? 'Admin'));

$nav = [
    'dashboard' => ['label' => 'Dashboard', 'icon' => 'fa-gauge-high', 'href' => 'dashboard.php'],
    'bookings'  => ['label' => 'Bookings', 'icon' => 'fa-calendar-check', 'href' => 'bookings.php'],
    'payments'  => ['label' => 'Payments', 'icon' => 'fa-credit-card', 'href' => 'payments.php'],
    'walkin'    => ['label' => 'Walk-in', 'icon' => 'fa-person-walking-luggage', 'href' => 'walkin.php'],
    'reviews'   => ['label' => 'Reviews', 'icon' => 'fa-star', 'href' => 'reviews.php'],
    'rooms'     => ['label' => 'Rooms', 'icon' => 'fa-door-open', 'href' => 'rooms.php'],
    'guests'    => ['label' => 'Guests', 'icon' => 'fa-users', 'href' => 'guests.php'],
    'reports'   => ['label' => 'Reports', 'icon' => 'fa-chart-line', 'href' => 'reports.php'],
    'settings'  => ['label' => 'Settings', 'icon' => 'fa-gear', 'href' => 'settings.php'],
];
?>
<aside class="admin-sidebar">
    <div class="sidebar-brand">
        <a href="dashboard.php">Tulip Guest Rooms</a>
        <span class="sidebar-badge">Admin</span>
    </div>
    <p class="sidebar-user"><i class="fa-solid fa-user-shield"></i> <?= $adminName ?></p>
    <nav class="sidebar-nav" aria-label="Admin navigation">
        <ul>
            <?php foreach ($nav as $key => $item): ?>
            <li>
                <a href="<?= adminH($item['href']) ?>"
                   class="<?= $activePage === $key ? 'active' : '' ?>">
                    <i class="fa-solid <?= adminH($item['icon']) ?>"></i>
                    <?= adminH($item['label']) ?>
                </a>
            </li>
            <?php endforeach; ?>
        </ul>
    </nav>
    <div class="sidebar-footer">
        <a href="logout.php" class="sidebar-logout">
            <i class="fa-solid fa-right-from-bracket"></i> Logout
        </a>
    </div>
</aside>
