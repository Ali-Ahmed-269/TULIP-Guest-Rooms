</main>
<footer class="footer public-footer">
    <div class="container">
        <p>&copy; <?= date('Y') ?> Tulip Guest Rooms. <a href="index.html">Back to home</a></p>
    </div>
</footer>
<script>
document.querySelector('.hamburger')?.addEventListener('click', function () {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;
    const open = nav.style.display === 'block';
    nav.style.display = open ? 'none' : 'block';
    this.setAttribute('aria-expanded', open ? 'false' : 'true');
});
</script>
</body>
</html>
