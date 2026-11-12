$(function () {
  const grid = $("#productGrid");
  const priceTable = $("#priceTable");
  let activeFilter = "all";

  // Browser-local demo visitor count (not a shared analytics counter).
  try {
    let visits = Number(localStorage.getItem("albertoVisits") || 0) + 1;
    localStorage.setItem("albertoVisits", visits);
    $("#visitorCount").text(visits.toLocaleString());
  } catch (error) { $("#visitorCount").text("1"); }

  function renderProducts() {
    const search = $("#productSearch").val().trim().toLowerCase();
    const sort = $("#productSort").val();
    let filtered = watchProducts.filter(p =>
      (activeFilter === "all" || p.category === activeFilter) &&
      (p.name.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search) || p.ref.toLowerCase().includes(search))
    );
    if (sort === "low") filtered.sort((a,b) => a.price-b.price);
    if (sort === "high") filtered.sort((a,b) => b.price-a.price);
    if (sort === "name") filtered.sort((a,b) => a.name.localeCompare(b.name));
    grid.empty();
    $("#productCount").text(`${filtered.length} ${filtered.length === 1 ? "item" : "items"}`);
    if (!filtered.length) {
      grid.append('<div class="col-12"><div class="empty-state"><i class="bi bi-search"></i><h3>No watches found</h3><p>Try another name or choose a different collection.</p></div></div>');
      return;
    }
    filtered.forEach((p, index) => {
      grid.append(`
        <div class="col-sm-6 col-lg-4">
          <article class="product-card" role="button" tabindex="0" aria-label="View ${p.name} details" data-id="${p.id}" style="animation:rise .55s ${index * 55}ms both">
            <div class="product-image"><img src="${p.image}" alt="${p.name}" loading="lazy"><span class="product-tag">${p.tag}</span></div>
            <div class="product-info"><small>${p.brand} · ${p.category} collection</small><h3>${p.name}</h3>
              <div class="product-bottom"><span class="product-price">${p.priceLabel}</span><span class="view-details">View details ↗</span></div>
            </div>
          </article>
        </div>`);
    });
  }

  function renderPriceList() {
    priceTable.empty();
    watchProducts.forEach(p => priceTable.append(`<tr><td>${p.name}</td><td>${p.tag}</td><td>${p.ref}</td><td class="text-end">${p.priceLabel}</td></tr>`));
  }

  renderProducts();
  renderPriceList();
  window.addEventListener("productsUpdated", function () { renderProducts(); renderPriceList(); });
  $(".filter-btn").on("click", function () {
    $(".filter-btn").removeClass("active").attr("aria-pressed", "false");
    $(this).addClass("active").attr("aria-pressed", "true");
    activeFilter = $(this).data("filter");
    renderProducts();
  });
  $("#productSearch").on("input", renderProducts);
  $("#productSort").on("change", renderProducts);

  function showProduct(id) {
    const p = watchProducts.find(item => item.id === Number(id));
    if (!p) return;
    $("#productModalBody").html(`
      <div class="modal-product-grid">
        <img src="${p.image}" alt="${p.name}">
        <div><span class="modal-meta">${p.brand} · ${p.tag} collection · ${p.ref}</span><h2 class="mt-3">${p.name}</h2>
          <p>${p.description}</p><p class="modal-price">${p.priceLabel}</p>
          <p><b>Movement:</b> ${p.movement}<br><b>Case:</b> ${p.case}<br><b>Water resistance:</b> ${p.water}</p>
          <a class="btn btn-gold" href="#contact" data-bs-dismiss="modal">Enquire now <i class="bi bi-arrow-up-right"></i></a>
        </div>
      </div>`);
    bootstrap.Modal.getOrCreateInstance(document.getElementById("productModal")).show();
  }
  grid.on("click", ".product-card", function () { showProduct($(this).data("id")); });
  grid.on("keydown", ".product-card", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showProduct($(this).data("id")); }
  });

  $(".gallery-tile").on("click", function () {
    $("#galleryModalImage").attr("src", $(this).data("image"));
    bootstrap.Modal.getOrCreateInstance(document.getElementById("galleryModal")).show();
  });

  function updateClock() {
    const now = new Date();
    $("#liveDate").text(now.toLocaleDateString(undefined, {weekday:"short", year:"numeric", month:"short", day:"numeric"}));
    $("#liveTime").text(now.toLocaleTimeString());
    $("#year").text(now.getFullYear());
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Location is requested only after a visitor clicks the ticker label.
  $("#locationText").css("cursor", "pointer").attr({title:"Click to share your location", role:"button", tabindex:"0"});
  function requestLocation() {
    const label = $("#locationText");
    if (!navigator.geolocation) { label.text("Geolocation is not supported"); return; }
    label.text("Requesting location permission...");
    navigator.geolocation.getCurrentPosition(
      pos => label.text(`Your location: ${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`),
      () => label.text("Location unavailable — permission not granted"), {timeout:8000}
    );
  }
  $("#locationText").on("click keydown", function(e) { if (e.type === "click" || e.key === "Enter" || e.key === " ") { e.preventDefault(); requestLocation(); } });

  $(".navbar-nav .nav-link").on("click", function () {
    const menu = document.getElementById("mainMenu");
    if (menu.classList.contains("show")) bootstrap.Collapse.getOrCreateInstance(menu).hide();
    $(".navbar-nav .nav-link").removeClass("active");
    $(this).addClass("active");
  });
  const sections = $("main section[id]");
  $(window).on("scroll", function () {
    let current = "home";
    sections.each(function () { if ($(window).scrollTop() >= $(this).offset().top - 150) current = this.id; });
    $(".navbar-nav .nav-link").removeClass("active");
    $(`.navbar-nav .nav-link[href="#${current}"]`).addClass("active");
  });

  // Duplicate ticker content for a seamless continuous loop.
  const ticker = document.querySelector(".ticker-track");
  if (ticker && !ticker.dataset.duplicated) { ticker.innerHTML += ticker.innerHTML; ticker.dataset.duplicated = "true"; }

  // JSON-file authentication through the PHP API.
  const authApi = new URL("api/auth.php", window.location.href).toString();

  function setAuthMessage(selector, message, isError = false) {
    $(selector).text(message).css("color", isError ? "#f0a39b" : "#e4c995");
  }

  let currentAccountUser = null;

  function setAuthMode(mode) {
    const isLogin = mode === "login";
    $("#loginForm").prop("hidden", !isLogin);
    $("#registerForm").prop("hidden", isLogin);
    $("#showLogin").toggleClass("active", isLogin);
    $("#showRegister").toggleClass("active", !isLogin);
    $("#authTitle").html(isLogin ? "Welcome <em>back.</em>" : "Join <em>Alberto.</em>");
    $("#authSubtitle").text(isLogin ? "Sign in to your Alberto account." : "Create an account to get started.");
    setAuthMessage("#loginMessage", "");
    setAuthMessage("#registerMessage", "");
  }

  async function authRequest(action, data = {}) {
    const response = await fetch(authApi, {
      method: "POST",
      headers: {"Content-Type": "application/json", "Accept": "application/json"},
      credentials: "same-origin",
      body: JSON.stringify({action, ...data})
    });
    let result;
    try { result = await response.json(); }
    catch (error) { throw new Error("Server response was not valid JSON. Check that XAMPP/PHP is running."); }
    if (!response.ok || !result.success) throw new Error(result.message || "Request failed.");
    return result;
  }

  function showSignedIn(user) {
    const signedIn = !!(user && user.email);
    currentAccountUser = signedIn ? user : null;
    $("#profileMenu").prop("hidden", true);
    // Admin navigation is controlled by the authenticated server session.
    const isAdmin = signedIn && String(user.role || "").toLowerCase() === "admin";
    const adminItem = document.getElementById("adminNavItem");
    if (adminItem) {
      adminItem.hidden = !isAdmin;
      adminItem.style.display = isAdmin ? "list-item" : "none";
      adminItem.setAttribute("aria-hidden", isAdmin ? "false" : "true");
    }
    $("#accountButton").html(signedIn
      ? '<i class="bi bi-person-check"></i> <span id="accountButtonText"></span>'
      : '<i class="bi bi-person-circle"></i> <span id="accountButtonText">Login / Register</span>');
    if (signedIn) $("#accountButtonText").text(user.name.split(" ")[0]);
    $("#loginForm, #registerForm").prop("hidden", signedIn);
    $(".auth-heading, .auth-tabs, .auth-demo-note").toggle(!signedIn);
    $("#signedInPanel").prop("hidden", true);
  }

  async function refreshAccountUI() {
    try {
      const result = await authRequest("status");
      showSignedIn(result.user);
    } catch (error) {
      showSignedIn(null);
      setAuthMessage("#loginMessage", error.message, true);
    }
  }

  $("#showLogin, #goLogin").on("click", () => setAuthMode("login"));
  $("#showRegister, #goRegister").on("click", () => setAuthMode("register"));

  $("#registerForm").on("submit", async function (e) {
    e.preventDefault();
    const name = $("#registerName").val().trim();
    const email = $("#registerEmail").val().trim().toLowerCase();
    const password = $("#registerPassword").val();
    const confirm = $("#confirmPassword").val();
    if (password.length < 8) return setAuthMessage("#registerMessage", "Password must be at least 8 characters.", true);
    if (password !== confirm) return setAuthMessage("#registerMessage", "Passwords do not match.", true);
    try {
      await authRequest("register", {name, email, password});
      this.reset();
      setAuthMode("login");
      $("#loginEmail").val(email);
      setAuthMessage("#loginMessage", "Account created successfully. Please login with your email and password.");
    } catch (error) {
      setAuthMessage("#registerMessage", error.message, true);
    }
  });

  $("#loginForm").on("submit", async function (e) {
    e.preventDefault();
    const email = $("#loginEmail").val().trim().toLowerCase();
    const password = $("#loginPassword").val();
    try {
      await authRequest("login", {email, password});
      this.reset();
      await refreshAccountUI();
    } catch (error) {
      setAuthMessage("#loginMessage", error.message, true);
    }
  });

  $("#accountButton").on("click", function () {
    if (currentAccountUser) { $("#profileMenu").prop("hidden", !$("#profileMenu").prop("hidden")); }
    else { bootstrap.Modal.getOrCreateInstance(document.getElementById("authModal")).show(); }
  });
  $(document).on("click", function (e) { if (!$(e.target).closest(".profile-wrap").length) $("#profileMenu").prop("hidden", true); });

  $("#logoutButton").on("click", async function () {
    try {
      await authRequest("logout");
      showSignedIn(null);
      setAuthMode("login");
    } catch (error) {
      setAuthMessage("#loginMessage", error.message, true);
    }
  });

  $("#authModal").on("show.bs.modal", function () {
    refreshAccountUI();
    setAuthMode("login");
  });
  refreshAccountUI();

});
