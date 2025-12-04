// URL base del backend
const API_BASE = "http://localhost:3000";

let authToken = null;
let currentUserId = null;
let currentMatchId = null;
let socket = null;

// Helpers
function setAuth(token, userId, email) {
  authToken = token;
  currentUserId = userId;
  localStorage.setItem("token", token);
  localStorage.setItem("userId", userId);
  localStorage.setItem("email", email || "");
}

function clearAuth() {
  authToken = null;
  currentUserId = null;
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("email");
}

function getHeaders() {
  const h = { "Content-Type": "application/json" };
  if (authToken) {
    h["Authorization"] = "Bearer " + authToken;
  }
  return h;
}

function show(elementId) {
  document.getElementById(elementId).classList.remove("hidden");
}

function hide(elementId) {
  document.getElementById(elementId).classList.add("hidden");
}

// Inicial
window.addEventListener("DOMContentLoaded", () => {
  const savedToken = localStorage.getItem("token");
  const savedUserId = localStorage.getItem("userId");
  const savedEmail = localStorage.getItem("email");

  if (savedToken && savedUserId) {
    authToken = savedToken;
    currentUserId = parseInt(savedUserId, 10);
    if (savedEmail) {
      document.getElementById("user-email").textContent = savedEmail;
    }
    onLoginSuccess();
  }

  setupEventListeners();
});

// Eventos botones
function setupEventListeners() {
  document.getElementById("btn-register").addEventListener("click", onRegister);
  document.getElementById("btn-login").addEventListener("click", onLogin);
  document.getElementById("btn-logout").addEventListener("click", onLogout);
  document.getElementById("btn-save-profile").addEventListener("click", saveProfile);
  document.getElementById("btn-add-photo").addEventListener("click", addPhoto);

  document.getElementById("btn-next-profile").addEventListener("click", loadNextProfile);
  document.getElementById("btn-swipe-left").addEventListener("click", () => sendSwipe("dislike"));
  document.getElementById("btn-swipe-right").addEventListener("click", () => sendSwipe("like"));
  document.getElementById("btn-swipe-super").addEventListener("click", () => sendSwipe("superlike"));

  document.getElementById("btn-send-chat").addEventListener("click", sendChatMessage);
}

// Registro
async function onRegister() {
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const displayName = document.getElementById("reg-display-name").value.trim();
  const age = parseInt(document.getElementById("reg-age").value, 10) || null;

  if (!email || !password || !displayName) {
    document.getElementById("auth-message").textContent = "Faltan campos para registro.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password, display_name: displayName, age })
    });

    const data = await res.json();
    if (!res.ok) {
      document.getElementById("auth-message").textContent = data.error || "Error al registrar.";
      return;
    }

    setAuth(data.token, data.userId, email);
    document.getElementById("user-email").textContent = email;
    document.getElementById("auth-message").textContent = "Registro exitoso. Sesión iniciada.";
    onLoginSuccess();
  } catch (err) {
    console.error(err);
    document.getElementById("auth-message").textContent = "Error de conexión.";
  }
}

// Login
async function onLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    document.getElementById("auth-message").textContent = "Faltan campos para login.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      document.getElementById("auth-message").textContent = data.error || "Error al iniciar sesión.";
      return;
    }

    setAuth(data.token, data.userId, email);
    document.getElementById("user-email").textContent = email;
    document.getElementById("auth-message").textContent = "Login exitoso.";
    onLoginSuccess();
  } catch (err) {
    console.error(err);
    document.getElementById("auth-message").textContent = "Error de conexión.";
  }
}

function onLogout() {
  clearAuth();
  hide("main-section");
  show("auth-section");
  document.getElementById("btn-logout").classList.add("hidden");
  document.getElementById("user-email").textContent = "";
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Cuando login/registro es exitoso
function onLoginSuccess() {
  hide("auth-section");
  show("main-section");
  document.getElementById("btn-logout").classList.remove("hidden");
  initSocket();
  loadMyProfile();
  loadNextProfile();
  loadMatches();
}

// Conexión Socket.io
function initSocket() {
  if (!authToken) return;

  socket = io(API_BASE, {
    auth: { token: authToken }
  });

  socket.on("connect", () => {
    console.log("Socket conectado");
  });

  socket.on("disconnect", () => {
    console.log("Socket desconectado");
  });

  socket.on("receive_message", (msg) => {
    if (parseInt(msg.match_id, 10) === parseInt(currentMatchId || -1, 10)) {
      appendChatMessage(msg);
    }
  });
}

// Cargar mi perfil
async function loadMyProfile() {
  try {
    const res = await fetch(`${API_BASE}/profiles/me`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(data);
      return;
    }

    const { profile, photos } = data;

    // Llenar vista
    const div = document.getElementById("my-profile-view");
    div.innerHTML = `
      <p><strong>${profile.display_name}</strong> (${profile.age || "?"} años)</p>
      <p>${profile.short_bio || ""}</p>
      <p>Género: ${profile.gender || "-"}</p>
      <p>Prefiere: ${profile.interested_in_gender || "-"}</p>
      <p>Distancia: ${profile.distance_km || 0} km</p>
      <p>Intereses: ${profile.interests || "-"}</p>
      <p>Música: ${profile.music || "-"}</p>
      <p>Idiomas: ${profile.languages || "-"}</p>
    `;

    // Rellenar inputs
    document.getElementById("prof-display-name").value = profile.display_name || "";
    document.getElementById("prof-short-bio").value = profile.short_bio || "";
    document.getElementById("prof-age").value = profile.age || "";
    document.getElementById("prof-gender").value = profile.gender || "";
    document.getElementById("prof-distance").value = profile.distance_km || "";
    document.getElementById("prof-min-age").value = profile.min_age_pref || "";
    document.getElementById("prof-max-age").value = profile.max_age_pref || "";
    document.getElementById("prof-interested-gender").value = profile.interested_in_gender || "";
    document.getElementById("prof-interests").value = profile.interests || "";
    document.getElementById("prof-music").value = profile.music || "";
    document.getElementById("prof-languages").value = profile.languages || "";
    document.getElementById("prof-lat").value = profile.location_lat || "";
    document.getElementById("prof-lng").value = profile.location_lng || "";

    // Fotos
    const photosDiv = document.getElementById("my-photos");
    photosDiv.innerHTML = "";
    photos.forEach((p) => {
      const img = document.createElement("img");
      img.src = p.image_url;
      img.title = `Foto #${p.id}`;
      photosDiv.appendChild(img);
    });
  } catch (err) {
    console.error(err);
  }
}

// Guardar cambios de perfil
async function saveProfile() {
  const body = {
    display_name: document.getElementById("prof-display-name").value.trim(),
    short_bio: document.getElementById("prof-short-bio").value.trim(),
    age: parseInt(document.getElementById("prof-age").value, 10) || null,
    gender: document.getElementById("prof-gender").value.trim(),
    distance_km: parseInt(document.getElementById("prof-distance").value, 10) || null,
    min_age_pref: parseInt(document.getElementById("prof-min-age").value, 10) || null,
    max_age_pref: parseInt(document.getElementById("prof-max-age").value, 10) || null,
    interested_in_gender: document.getElementById("prof-interested-gender").value.trim(),
    interests: document.getElementById("prof-interests").value.trim(),
    music: document.getElementById("prof-music").value.trim(),
    languages: document.getElementById("prof-languages").value.trim(),
    location_lat: parseFloat(document.getElementById("prof-lat").value) || null,
    location_lng: parseFloat(document.getElementById("prof-lng").value) || null
  };

  try {
    const res = await fetch(`${API_BASE}/profiles/me`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Error al actualizar perfil");
      return;
    }
    alert("Perfil actualizado");
    loadMyProfile();
  } catch (err) {
    console.error(err);
    alert("Error de conexión");
  }
}

// Agregar foto
async function addPhoto() {
  const url = document.getElementById("photo-url").value.trim();
  if (!url) {
    alert("Ingresa una URL de imagen");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/profiles/me/photos`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ image_url: url, sort_order: 0 })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Error al agregar foto");
      return;
    }
    document.getElementById("photo-url").value = "";
    loadMyProfile();
  } catch (err) {
    console.error(err);
    alert("Error de conexión");
  }
}

// Cargar siguiente perfil para swipe
async function loadNextProfile() {
  try {
    const res = await fetch(`${API_BASE}/swipe/next`, {
      headers: getHeaders()
    });
    const data = await res.json();
    const container = document.getElementById("swipe-profile");

    if (!data.profile) {
      container.innerHTML = "<p>No hay más perfiles disponibles por ahora.</p>";
      return;
    }

    const p = data.profile;
    const photos = data.photos || [];

    let photosHtml = "";
    if (photos.length > 0) {
      photosHtml = photos.map((ph) => `<img src="${ph.image_url}" />`).join("");
    }

    container.innerHTML = `
      <div>
        ${photosHtml}
        <h3>${p.display_name} (${p.age || "?"})</h3>
        <p>${p.short_bio || ""}</p>
        <p>Género: ${p.gender || "-"}</p>
        <p>Intereses: ${p.interests || "-"}</p>
        <p>Música: ${p.music || "-"}</p>
        <p>Idiomas: ${p.languages || "-"}</p>
        <p><small>ID usuario: ${p.user_id}</small></p>
      </div>
    `;

    // Guardar id del usuario que estamos viendo (para el swipe)
    container.dataset.toUserId = p.user_id;
  } catch (err) {
    console.error(err);
  }
}

// Enviar swipe
async function sendSwipe(action) {
  const container = document.getElementById("swipe-profile");
  const toUserId = container.dataset.toUserId;
  if (!toUserId) {
    alert("No hay perfil cargado.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/swipe`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ toUserId: parseInt(toUserId, 10), action })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Error al hacer swipe");
      return;
    }

    if (data.match) {
      alert("🎉 ¡Es un match!");
      loadMatches();
    }

    // Cargar siguiente
    loadNextProfile();
  } catch (err) {
    console.error(err);
    alert("Error de conexión");
  }
}

// Cargar lista de matches
async function loadMatches() {
  try {
    const res = await fetch(`${API_BASE}/matches`, {
      headers: getHeaders()
    });
    const matches = await res.json();
    if (!res.ok) {
      console.error(matches);
      return;
    }

    const ul = document.getElementById("matches-list");
    ul.innerHTML = "";

    matches.forEach((m) => {
      const li = document.createElement("li");
      li.textContent = `${m.display_name} (match #${m.match_id})`;
      li.dataset.matchId = m.match_id;
      li.addEventListener("click", () => selectMatch(m.match_id, li));
      ul.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

// Seleccionar match para abrir chat
async function selectMatch(matchId, liElement) {
  currentMatchId = matchId;

  // Marcar activo en la lista
  document.querySelectorAll("#matches-list li").forEach((li) => {
    li.classList.remove("active");
  });
  liElement.classList.add("active");

  document.getElementById("chat-header").textContent = `Chat Match #${matchId}`;
  show("chat-input-area");

  // Unirse al room de socket
  if (socket) {
    socket.emit("join_match", matchId);
  }

  // Cargar mensajes vía HTTP
  try {
    const res = await fetch(`${API_BASE}/matches/${matchId}/messages`, {
      headers: getHeaders()
    });
    const msgs = await res.json();
    if (!res.ok) {
      console.error(msgs);
      return;
    }
    const container = document.getElementById("chat-messages");
    container.innerHTML = "";
    msgs.forEach((msg) => appendChatMessage(msg));
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error(err);
  }
}

// Agregar mensaje al chat (UI)
function appendChatMessage(msg) {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  const isMe = parseInt(msg.sender_id, 10) === parseInt(currentUserId || -1, 10);
  div.className = "chat-message " + (isMe ? "me" : "other");
  div.textContent = msg.content;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Enviar mensaje de chat
async function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text || !currentMatchId) return;

  // Enviar por HTTP y Socket (el socket guardará en BD también según como lo implementaste)
  try {
    // Opción: mandar solo por HTTP (usa la ruta POST) y dejar que el backend no duplique.
    const res = await fetch(`${API_BASE}/matches/${currentMatchId}/messages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ content: text })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(data);
    }
  } catch (err) {
    console.error(err);
  }

  if (socket) {
    socket.emit("send_message", {
      matchId: currentMatchId,
      content: text
    });
  }

  input.value = "";
}
