(() => {
  const TZ = "America/Chicago";
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // "Now" in Texas. ?now=2026-09-26T22:30 (local Texas time) overrides it for testing.
  function texasNow() {
    const override = new URLSearchParams(location.search).get("now");
    if (override) {
      const [d, t = "00:00"] = override.split("T");
      const [y, m, day] = d.split("-").map(Number);
      const [h, min] = t.split(":").map(Number);
      return { dow: new Date(Date.UTC(y, m - 1, day)).getUTCDay(), mins: h * 60 + min };
    }
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" })
        .formatToParts(new Date()).map(p => [p.type, p.value])
    );
    return { dow: DAYS.indexOf(parts.weekday), mins: (+parts.hour % 24) * 60 + +parts.minute };
  }

  // Brunch: daily 8 AM – 9 PM
  function brunchStatus({ mins }) {
    if (mins >= 480 && mins < 1260) return { open: true, text: "Open now · till 9 PM" };
    return { open: false, text: mins < 480 ? "Closed · opens 8 AM" : "Closed · opens 8 AM tomorrow" };
  }

  // After Hours: Fri & Sat 9 PM – 1 AM (spills into Sat/Sun morning)
  function afterHoursStatus({ dow, mins }) {
    const isNight = dow === 5 || dow === 6;
    if (isNight && mins >= 1260) return { open: true, text: "Live now · till 1 AM" };
    if ((dow === 6 || dow === 0) && mins < 60) return { open: true, text: "Live now · till 1 AM" };
    if (isNight) return { open: false, text: "Tonight · 9 PM" };
    if (dow === 4) return { open: false, text: "Tomorrow · 9 PM" };
    return { open: false, text: "Next: Friday 9 PM" };
  }

  function paint(el, s) {
    el.textContent = s.text;
    el.classList.toggle("is-open", s.open);
  }

  function updateStatus() {
    const now = texasNow();
    document.querySelectorAll("[data-status]").forEach(el => paint(el, brunchStatus(now)));
    document.querySelectorAll("[data-ah-status]").forEach(el => paint(el, afterHoursStatus(now)));
  }
  updateStatus();
  setInterval(updateStatus, 60_000);

  // Day → night: flip once After Hours reaches the middle of the screen.
  const ah = document.getElementById("after-hours");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let ticking = false;
  function checkNight() {
    ticking = false;
    const night = ah.getBoundingClientRect().top < innerHeight * 0.55;
    if (document.body.classList.contains("night") !== night) {
      document.body.classList.toggle("night", night);
      themeMeta.content = night ? "#0d0a10" : "#0b6e4f";
    }
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(checkNight); } }, { passive: true });
  addEventListener("resize", checkNight);
  checkNight();

  // Waitlist location picker
  const sheet = document.getElementById("waitlist");
  let lastFocus = null;
  function openSheet(e) {
    lastFocus = e.currentTarget;
    sheet.hidden = false;
    sheet.querySelector("[data-close]").focus();
    document.addEventListener("keydown", onKey);
  }
  function closeSheet() {
    sheet.hidden = true;
    document.removeEventListener("keydown", onKey);
    lastFocus && lastFocus.focus();
  }
  function onKey(e) { if (e.key === "Escape") closeSheet(); }
  document.querySelectorAll("[data-waitlist]").forEach(b => b.addEventListener("click", openSheet));
  sheet.addEventListener("click", e => { if (e.target === sheet || e.target.closest("[data-close]")) closeSheet(); });

  // Gentle reveal on scroll
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const items = document.querySelectorAll(".dish, .loc, .quote, .reel li, .ah__info > div, .extra");
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(el => { el.classList.add("reveal"); io.observe(el); });
  }
})();
