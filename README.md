# CrickAI: The AI Fielding Challenge

**Live Demo:** [https://cric2djfk.pythonanywhere.com/](https://cric2djfk.pythonanywhere.com/)

---
## Tech Stack

* **Backend:** Flask (Python)
* **AI/Machine Learning:** Scikit-learn, NumPy
* **Frontend:** HTML5 Canvas, JavaScript (ES6)
* **Styling:** Tailwind CSS & Custom CSS for animations

---

## Project Overview

CrickAI is a top-down, 2D cricket game where a human player takes on an advanced AI opponent. The core of the game is a dynamic AI fielding system that learns from the player's shots and adapts its strategy in real-time. The player controls the batsman, aiming with the mouse and controlling power with the spacebar, while the AI manages the bowling and field placements.

<img width="634" height="367" alt="image" src="https://github.com/user-attachments/assets/0520ebbf-c24a-4a43-9c6b-915602ee4d33" />


## Features

### Core Gameplay
* **Player-Controlled Batting:** Aim your shots in 360 degrees with the mouse and control the power of your shot by holding and releasing the `Spacebar`.
* **Dynamic Ball Physics:** The ball can be delivered as a **Fast**, **Spin**, **Swing**, or challenging **Yorker** delivery, each with unique physics affecting its trajectory.
* **Real-Time Fielder Movement:** AI fielders don't just stand still; they anticipate the ball's path and move to intercept it in real-time.
* **Live Scoreboard & UI:** A sleek, modern interface built with Tailwind CSS keeps track of your score, overs, and wickets, and displays the type of ball being bowled.
* **On-Screen Animated Outcomes:** Results like "FOUR!", "SIX!", and "CAUGHT!" are displayed with dynamic, animated banners for a polished user experience.

### Advanced AI & Bonus Features
* **Machine Learning for Pattern Recognition:** The AI uses the `scikit-learn` library (`KMeans` clustering) to analyze the landing positions of your past shots. It identifies your favorite hitting areas ("hot zones") and adapts its strategy accordingly.
* **Adaptive Fielding:** If the AI detects a pattern, it will reposition its fielders to plug the gaps you are exploiting, forcing you to change your strategy. This fulfills the "Past hit patterns" requirement.
* **Strategic Bowling AI:** The AI bowler analyzes your performance. If you are scoring freely, it will switch to a defensive "Fast" or "Yorker" delivery. If you are struggling, it will attack with tricky "Swing" and "Spin" balls.
* **Real-Time Leaderboard:** The game features a live leaderboard that polls the server to display the top scores from all players, simulating a multi-player environment as per the assignment's bonus enhancements.

---


