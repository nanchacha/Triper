# Triper 🗺️

Triper is a modern, interactive Google Maps web application that allows you to easily discover highly-rated hotels and restaurants, and plot your journey step by step.

## ✨ Features
* **Smart Filtering**: Dynamically fetches restaurants and lodgings with a Google Maps rating of 4.0+ and 500+ reviews.
* **Visual Data**: Marker sizes scale logically based on review count, and colors change based on ratings (Blue -> Pink -> Red).
* **Deep Insights**: Hover over or click on any place to reveal a rich detail panel complete with photos, reviews, and precise addresses.
* **Route Planner**: Add selected places to your itinerary. Your route is automatically connected with visual paths right on the map!

## 🚀 Getting Started

To run this project locally, you will need your own Google Maps API Key.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nanchacha/Triper.git
   cd Triper
   ```

2. **Set up your API Key:**
   * In the project folder, locate the file named `config.example.js`.
   * Make a copy of this file and rename it to **`config.js`**.
   * Open `config.js` and replace `"YOUR_API_KEY_HERE"` with your actual Google Maps API key.
   *(Note: `config.js` is included in `.gitignore` so your private key stays safe from accidental commits!)*

3. **Run the App:**
   Simply double-click `index.html` to open it in your favorite web browser. No complex build tools required! Enjoy planning your trips!
