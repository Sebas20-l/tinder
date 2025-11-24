let index = 0;

function loadProfile() {
    document.getElementById("profile-name").textContent = profiles[index].name;
    document.getElementById("profile-img").src = profiles[index].img;
}

document.addEventListener("DOMContentLoaded", () => {
    loadProfile();

    document.querySelector(".like").addEventListener("click", () => {
        index = (index + 1) % profiles.length;
        loadProfile();
    });

    document.querySelector(".dislike").addEventListener("click", () => {
        index = (index + 1) % profiles.length;
        loadProfile();
    });
});


