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

  // Animation 3: a single, reversible day → night transition.
  // Hysteresis keeps a tiny scroll near the boundary from flashing the theme.
  const ah = document.getElementById("after-hours");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let ticking = false;
  function checkNight() {
    ticking = false;
    if (!ah) return;
    const wasNight = document.body.classList.contains("night");
    const boundary = innerHeight * (wasNight ? 0.62 : 0.48);
    const night = ah.getBoundingClientRect().top < boundary;
    if (wasNight !== night) {
      document.body.classList.toggle("night", night);
      if (themeMeta) themeMeta.content = night ? "#0d0a10" : "#0b6e4f";
    }
  }
  function scheduleNightCheck() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(checkNight);
    }
  }
  addEventListener("scroll", scheduleNightCheck, { passive: true });
  addEventListener("resize", scheduleNightCheck);
  addEventListener("pageshow", scheduleNightCheck);
  // Recheck after local photos/fonts settle, including a direct #after-hours link.
  addEventListener("load", scheduleNightCheck, { once: true });
  if (document.fonts) document.fonts.ready.then(scheduleNightCheck);
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

  // Animations 1 + 2: draw the ink, or drop and settle a polaroid once.
  // Content is visible by default if JS/IntersectionObserver is unavailable.
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const revealItems = [...document.querySelectorAll("[data-reveal]")];
  const revealed = new WeakSet();
  let revealObserver = null;

  function configureReveals() {
    if (revealObserver) revealObserver.disconnect();
    revealObserver = null;
    if (motionPreference.matches || !("IntersectionObserver" in window)) {
      revealItems.forEach(el => {
        el.classList.remove("reveal");
        el.classList.add("in");
        revealed.add(el);
      });
      return;
    }

    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        revealed.add(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });

    revealItems.forEach(el => {
      if (revealed.has(el)) return;
      el.classList.add("reveal");
      // Never hide an actionable polaroid from someone tabbing through the page.
      if (el.matches("a, button")) {
        el.addEventListener("focus", () => {
          el.classList.add("in");
          revealed.add(el);
          if (revealObserver) revealObserver.unobserve(el);
        }, { once: true });
      }
      revealObserver.observe(el);
    });
  }
  configureReveals();
  if (motionPreference.addEventListener) {
    motionPreference.addEventListener("change", configureReveals);
  } else if (motionPreference.addListener) {
    motionPreference.addListener(configureReveals);
  }
})();
