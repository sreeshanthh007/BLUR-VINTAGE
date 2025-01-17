window.onload = function () {
    // Get the preloader element
    var preloader = document.getElementById("preloader-active");

    // Add a 2-second delay before starting the fade-out effect
    setTimeout(function () {
      // Add a fade-out effect
      preloader.style.transition = "opacity 0.6s";
      preloader.style.opacity = 0;

      // Remove the preloader from the DOM after the fade-out effect is complete
      preloader.addEventListener("transitionend", function () {
        preloader.style.display = "none";
      });
    }, 1500); // 2 seconds = 2000 milliseconds
  };