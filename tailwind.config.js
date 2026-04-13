/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                navy: {
                    50: "#f0f4f8",
                    100: "#d9e2ec",
                    200: "#bcccdc",
                    300: "#9fb3c8",
                    400: "#829ab1",
                    500: "#627d98",
                    600: "#486581",
                    700: "#334e68",
                    800: "#243b53",
                    900: "#102a43",
                    950: "#0a1929",
                },
                civic: {
                    teal: "#0d9488",
                    "teal-light": "#14b8a6",
                    gold: "#d97706",
                    "gold-light": "#f59e0b",
                },
                labour: {
                    red: "#DC241f",
                    "red-dark": "#b91c1c",
                },
            },
            fontFamily: {
                heading: [
                    "Inter",
                    "system-ui",
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "sans-serif",
                ],
                body: [
                    "Inter",
                    "system-ui",
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "sans-serif",
                ],
            },
        },
    },
    plugins: [],
};