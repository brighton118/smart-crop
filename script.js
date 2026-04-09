document.addEventListener("DOMContentLoaded", () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector(".mobile-menu-toggle");
    const navLinks = document.querySelector(".nav-links");

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", () => {
            navLinks.classList.toggle("active");
        });
    }

    // Close mobile menu when clicking a link
    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
        });
    });

    // Dark Mode Toggle
    const themeToggleBtn = document.getElementById("theme-toggle");
    const icon = themeToggleBtn.querySelector("i");
    
    // Check for saved user preference, if any, on load of the website
    const currentTheme = localStorage.getItem("theme");
    if (currentTheme) {
        document.documentElement.setAttribute("data-theme", currentTheme);
        if (currentTheme === "dark") {
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
        }
    }

    themeToggleBtn.addEventListener("click", () => {
        let theme = document.documentElement.getAttribute("data-theme");
        
        if (theme === "dark") {
            document.documentElement.setAttribute("data-theme", "light");
            localStorage.setItem("theme", "light");
            icon.classList.remove("fa-sun");
            icon.classList.add("fa-moon");
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("theme", "dark");
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
        }
    });

    // Optional: Add simple animation to numbers on scroll
    // (This part can be expanded for a more dynamic feel)
});
