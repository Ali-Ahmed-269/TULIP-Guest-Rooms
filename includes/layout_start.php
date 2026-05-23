<?php
/** @var string $pageTitle */
/** @var string $activeNav home|lookup|reviews|booking */
$pageTitle = $pageTitle ?? 'Tulip Guest Rooms';
$activeNav = $activeNav ?? 'home';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/style.css">
    <link rel="stylesheet" href="assets/public-pages.css">
</head>
<body>
<header class="navbar scrolled" id="navbar">
    <div class="container nav-container">
        <a href="index.html" class="logo">Tulip Guest Rooms</a>
        <button class="hamburger" aria-label="Toggle Navigation" aria-expanded="false">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        </button>
        <nav class="nav-links" aria-label="Main Navigation">
            <ul>
                <li><a href="index.html" class="<?= $activeNav === 'home' ? 'nav-active' : '' ?>">Home</a></li>
                <li><a href="index.html#rooms">Rooms</a></li>
                <li><a href="lookup.php" class="<?= $activeNav === 'lookup' ? 'nav-active' : '' ?>">My Bookings</a></li>
                <li><a href="reviews.php" class="<?= $activeNav === 'reviews' ? 'nav-active' : '' ?>">Reviews</a></li>
                <li><a href="index.html#booking" class="<?= $activeNav === 'booking' ? 'nav-active' : '' ?>">Book Now</a></li>
            </ul>
        </nav>
    </div>
</header>
<main class="public-page">
