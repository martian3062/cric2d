window.addEventListener('load', () => {
    Game.init();
});

const Game = {
    canvas: document.getElementById("gameCanvas"),
    ctx: null,
    errorDisplay: document.getElementById("error-display"),
    leaderboardList: document.getElementById("leaderboard-list"),
    W: 0, H: 0, state: "LOADING",
    score: 0, overs: 0, balls: 0, wickets: 0,
    ball: null, fielders: [], lastShotLandingPos: null,
    mousePos: { x: 0, y: 0 }, powerLevel: 0,
    nextBallType: "fast", outcomeMessage: "",
    sessionId: null, playerName: "Player",

    assets: {
        images: {
            batsman: { path: "/static/images/batsman.gif", img: new Image() },
            bowler: { path: "/static/images/bowler.png", img: new Image() },
            fielder: { path: "/static/images/fielder.png", img: new Image() }
        },
        sounds: { four: new Audio("/static/sounds/four.mp3"), six: new Audio("/static/sounds/six.mp3"), catch: new Audio("/static/sounds/catch.mp3"), },
        load(callback) {
            let imagesLoaded = 0;
            const totalImages = Object.keys(this.images).length;
            for (let key in this.images) {
                const imageAsset = this.images[key];
                imageAsset.img.src = imageAsset.path;
                imageAsset.img.onload = () => { if (++imagesLoaded === totalImages) callback(); };
                imageAsset.img.onerror = () => Game.showError(`FATAL ERROR: Could not load image: ${imageAsset.path}`);
            }
        }
    },

    init() {
        this.ctx = this.canvas.getContext("2d");
        this.W = this.canvas.width;
        this.H = this.canvas.height;
        document.getElementById('startGameBtn').addEventListener('click', () => {
            const nameInput = document.getElementById('playerNameInput');
            this.playerName = nameInput.value.trim() || "Player 1";
            document.getElementById('name-modal').style.display = 'none';
            this.start();
        });
    },

    start() {
        this.sessionId = document.body.dataset.sessionId;
        if (!this.sessionId) { this.showError("Critical Error: No session ID."); return; }
        this.drawMessage("LOADING ASSETS...");
        this.assets.load(async () => {
            this.drawMessage("CONNECTING...");
            const success = await this.fetchDeliveryPlan(true);
            if (success) {
                this.setupEventListeners();
                this.state = "READY";
                setInterval(this.updateLeaderboard.bind(this), 5000);
                this.updateLeaderboard();
                this.loop();
            }
        });
    },

    setupEventListeners() {
        this.canvas.addEventListener("mousemove", (e) => { this.mousePos.x = e.offsetX; this.mousePos.y = e.offsetY; });
        document.addEventListener("keydown", (e) => { if (e.code === "Space" && this.state === "READY") this.state = "CHARGING"; });
        document.addEventListener("keyup", (e) => { if (e.code === "Space" && this.state === "CHARGING") { this.state = "BALL_IN_PLAY"; this.hitBall(); } });
    },

    loop() { this.update(); this.draw(); requestAnimationFrame(this.loop.bind(this)); },
    update() { if (this.state === "CHARGING") this.powerLevel = Math.min(this.powerLevel + 1.5, 100); if (this.state === "BALL_IN_PLAY" && this.ball) this.updateBallPhysics(); },
    draw() {
        this.ctx.clearRect(0, 0, this.W, this.H);
        this.drawField();
        this.drawFielders();
        if (this.state === "LOADING") return;
        if (this.state === "READY" || this.state === "CHARGING") this.drawAimLine();
        if (this.state === "CHARGING" || this.state === "BALL_IN_PLAY") this.drawPowerBar();
        if (this.ball) this.drawBall();
        if (this.state === "OUTCOME") this.drawMessage(this.outcomeMessage);
    },

    async fetchDeliveryPlan(isInitial = false) {
        try {
            const isNewOver = !isInitial && this.balls > 0 && this.balls % 6 === 0;
            const response = await fetch("/plan-next-delivery", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: this.sessionId, lastShotLandingPos: this.lastShotLandingPos, overs: this.overs, isNewOver })
            });
            if (!response.ok) throw new Error(`Server status: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(`Server error: ${data.error}`);
            this.fielders = data.fielders;
            this.nextBallType = data.ballType;
            this.lastShotLandingPos = null;
            this.errorDisplay.style.display = 'none';
            return true;
        } catch (error) {
            this.showError("Error: Could not connect to game server.", error);
            return false;
        }
    },

    hitBall() {
        const batsmanPos = { x: this.W / 2, y: this.H / 2 + 60 };
        const dirX = this.mousePos.x - batsmanPos.x, dirY = this.mousePos.y - batsmanPos.y;
        const distance = Math.hypot(dirX, dirY);
        if (distance === 0) return;
        const normalizedDirX = dirX / distance, normalizedDirY = dirY / distance;
        const speed = 80 + (120 * (this.powerLevel / 100)), velocityFactor = speed / 90;
        this.ball = { x: batsmanPos.x, y: batsmanPos.y, vx: normalizedDirX * velocityFactor, vy: normalizedDirY * velocityFactor, r: 6, speed: Math.round(speed), type: this.nextBallType, path: [], bounced: false, deviation: (this.nextBallType !== 'fast') ? (Math.random() - 0.5) * 0.2 : 0 };
        this.lastShotLandingPos = { x: this.ball.x, y: this.ball.y };
        this.balls++;
        if (this.balls > 0 && this.balls % 6 === 0) this.overs++;
        this.updateScoreboard();
        this.powerLevel = 0;
    },

    updateBallPhysics() {
        if (!this.ball) return;
        if (this.ball.type === 'swing' && !this.ball.bounced) { this.ball.vx += -this.ball.vy * this.ball.deviation * 0.01; this.ball.vy += this.ball.vx * this.ball.deviation * 0.01; }
        if (this.ball.type === 'spin' && this.ball.bounced) { this.ball.vx += this.ball.deviation * 4.5; this.ball.type = 'fast'; }
        this.ball.x += this.ball.vx; this.ball.y += this.ball.vy;
        const pitch = { y_start: this.H / 2 - 60, y_end: this.H / 2 + 60 };
        if (this.ball.y > pitch.y_start && this.ball.y < pitch.y_end && !this.ball.bounced) { this.ball.vy *= -0.6; this.ball.bounced = true; }
        for (let f of this.fielders) {
            const dist = Math.hypot(this.ball.x - f.x, this.ball.y - f.y);
            if (dist < 120) { f.x += ((this.ball.x - f.x) / dist) * 0.7; f.y += ((this.ball.y - f.y) / dist) * 0.7; }
            if (dist < 20) { this.handleOutcome("CAUGHT!"); return; }
        }
        if (this.ball.x < 0 || this.ball.x > this.W || this.ball.y < 0 || this.ball.y > this.H) {
            const runs = this.powerLevel > 75 ? 6 : 4;
            this.score += runs;
            this.postScore();
            this.handleOutcome(`${runs} RUNS!`);
        } else if (Math.hypot(this.ball.vx, this.ball.vy) < 0.05) { this.handleOutcome("STOPPED"); }
    },

    handleOutcome(message) {
        this.lastShotLandingPos = { x: this.ball.x, y: this.ball.y };
        if (message === "CAUGHT!") { this.assets.sounds.catch.play(); this.wickets++; }
        else if (message.includes("RUNS")) {
            const runs = parseInt(message);
            if (runs === 4) this.assets.sounds.four.play(); if (runs === 6) this.assets.sounds.six.play();
        }
        this.ball = null; this.state = "OUTCOME"; this.outcomeMessage = message; this.updateScoreboard();
        setTimeout(() => { this.state = "READY"; this.outcomeMessage = ""; this.fetchDeliveryPlan(); }, 2000);
    },
    
    async postScore() { try { await fetch("/update-score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: this.playerName, score: this.score }) }); } catch (error) { console.error("Failed to post score:", error); } },
    async updateLeaderboard() { try { const response = await fetch("/leaderboard"); const data = await response.json(); this.leaderboardList.innerHTML = ""; for (const [name, pScore] of Object.entries(data)) { const li = document.createElement("li"); li.innerHTML = `<span class="player-name">${name}</span><span class="player-score">${pScore}</span>`; this.leaderboardList.appendChild(li); } } catch (error) { console.error("Failed to update leaderboard:", error); } },

    showError(message) { this.errorDisplay.textContent = message; this.errorDisplay.style.display = 'block'; console.error(message); },
    drawField() { const pitch = { x: this.W / 2 - 30, y: this.H / 2 - 60, w: 60, h: 120 }, bowlerPos = { x: this.W / 2 - 12, y: pitch.y - 30 }, batsmanDrawPos = { x: this.W / 2 - 12, y: this.H / 2 + 20 }; this.ctx.fillStyle = "#0f5132"; this.ctx.fillRect(0, 0, this.W, this.H); this.ctx.fillStyle = "#b57f43"; this.ctx.fillRect(pitch.x, pitch.y, pitch.w, pitch.h); this.ctx.fillStyle = "#fff"; [5, 28, 51].forEach(off => this.ctx.fillRect(pitch.x + off, pitch.y + 5, 2, 20)); this.ctx.drawImage(this.assets.images.batsman.img, batsmanDrawPos.x, batsmanDrawPos.y, 24, 40); this.ctx.drawImage(this.assets.images.bowler.img, bowlerPos.x, bowlerPos.y, 24, 40); },
    drawFielders() { if (!this.fielders || this.fielders.length === 0) return; this.fielders.forEach(f => this.ctx.drawImage(this.assets.images.fielder.img, f.x - 15, f.y - 15, 30, 30)); },
    drawBall() { if (!this.ball) return; this.ball.path.push({ x: this.ball.x, y: this.ball.y }); if (this.ball.path.length > 20) this.ball.path.shift(); for (let i = 0; i < this.ball.path.length; i++) { const alpha = i / this.ball.path.length; this.ctx.beginPath(); this.ctx.arc(this.ball.path[i].x, this.ball.path[i].y, this.ball.r * alpha, 0, 2 * Math.PI); this.ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.5})`; this.ctx.fill(); } this.ctx.beginPath(); this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, 2 * Math.PI); this.ctx.fillStyle = "#ffd700"; this.ctx.fill(); },
    drawAimLine() { const batsmanPos = { x: this.W / 2, y: this.H / 2 + 60 }; this.ctx.beginPath(); this.ctx.moveTo(batsmanPos.x, batsmanPos.y); this.ctx.lineTo(this.mousePos.x, this.mousePos.y); this.ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; this.ctx.lineWidth = 2; this.ctx.setLineDash([5, 10]); this.ctx.stroke(); this.ctx.setLineDash([]); },
    drawPowerBar() { const barWidth = 200, barHeight = 20, x = this.W / 2 - barWidth / 2, y = this.H - 40; this.ctx.fillStyle = "#333"; this.ctx.fillRect(x, y, barWidth, barHeight); const powerWidth = (this.powerLevel / 100) * 200, hue = 120 - (this.powerLevel / 100) * 120; this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`; this.ctx.fillRect(x, y, powerWidth, barHeight); this.ctx.strokeStyle = "#fff"; this.ctx.strokeRect(x, y, barWidth, barHeight); },
    drawMessage(text) { this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; this.ctx.fillRect(0, this.H / 2 - 40, this.W, 80); this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 40px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle"; this.ctx.fillText(text, this.W / 2, this.H / 2); },
    updateScoreboard() { document.getElementById("score").innerText = this.score; document.getElementById("over-count").innerText = `${this.overs}.${this.balls % 6}`; document.getElementById("wickets").innerText = this.wickets; const speed = this.ball ? `${this.ball.speed} km/h` : "-"; const type = this.state === "BALL_IN_PLAY" ? this.ball.type.toUpperCase() : (this.state === "READY" ? "-" : this.nextBallType.toUpperCase()); document.getElementById("ball-speed").innerText = speed; document.getElementById("ball-type").innerText = type; }
};
