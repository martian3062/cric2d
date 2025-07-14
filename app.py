from flask import Flask, request, jsonify, render_template
import math
import random
import traceback
from model import predictHotZones

app = Flask(__name__)

CANVAS_WIDTH = 600
CANVAS_HEIGHT = 400
BATSMAN_POS = (CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60)
BOUNDARY_MARGIN = 15
BASE_FIELD_CONFIGS = [
    [{"x": 260, "y": 280}, {"x": 180, "y": 260}, {"x": 140, "y": 210}, {"x": 170, "y": 140}, {"x": 250, "y": 110}, {"x": 350, "y": 110}, {"x": 430, "y": 170}, {"x": 460, "y": 240}, {"x": 500, "y": 180}, {"x": 100, "y": 100}, {"x": 480, "y": 60}],
    [{"x": 250, "y": 285}, {"x": 220, "y": 290}, {"x": 170, "y": 260}, {"x": 130, "y": 200}, {"x": 160, "y": 130}, {"x": 90, "y": 80}, {"x": 240, "y": 100}, {"x": 180, "y": 50}, {"x": 360, "y": 110}, {"x": 450, "y": 180}, {"x": 520, "y": 250}],
    [{"x": 550, "y": 300}, {"x": 480, "y": 150}, {"x": 500, "y": 80}, {"x": 400, "y": 50}, {"x": 560, "y": 220}, {"x": 370, "y": 140}, {"x": 430, "y": 210}, {"x": 180, "y": 160}, {"x": 140, "y": 230}, {"x": 240, "y": 140}, {"x": 120, "y": 120}]
]

sessionData = {}
leaderboard = {}

@app.route("/")
def index():
    sessionId = str(random.randint(100000, 999999))
    sessionData[sessionId] = {"shotHistory": []}
    return render_template("index.html", sessionId=sessionId)

@app.route("/plan-next-delivery", methods=["POST"])
def planNextDelivery():
    try:
        data = request.get_json()
        if not data: return jsonify({"error": "Invalid request"}), 400

        sessionId = data.get("sessionId")
        lastShotLandingPos = data.get("lastShotLandingPos")
        overs = data.get("overs", 0)

        if not sessionId or sessionId not in sessionData:
            return jsonify({"error": "Invalid session"}), 400
        
        session = sessionData[sessionId]

        if lastShotLandingPos:
            session["shotHistory"].append(lastShotLandingPos)

        configIndex = overs % len(BASE_FIELD_CONFIGS)
        adaptedFielders = [dict(f) for f in BASE_FIELD_CONFIGS[configIndex]]

        hotZones = predictHotZones(session["shotHistory"])

        if hotZones:
            indicesToMove = [3, 6]
            for i, zone in enumerate(hotZones):
                if i < len(indicesToMove):
                    fielderIndex = indicesToMove[i]
                    adaptedFielders[fielderIndex] = {"x": zone[0], "y": zone[1]}
        
        ballType = random.choice(["swing", "spin", "fast", "yorker"])
        return jsonify({"fielders": adaptedFielders, "ballType": ballType})

    except Exception as e:
        print(f"SERVER ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

@app.route("/update-score", methods=["POST"])
def updateScore():
    global leaderboard
    data = request.get_json()
    playerName = data.get("name")
    playerScore = data.get("score")
    if not playerName or playerScore is None:
        return jsonify({"status": "error", "message": "Invalid data"}), 400
    if playerName not in leaderboard or playerScore > leaderboard[playerName]:
        leaderboard[playerName] = playerScore
    return jsonify({"status": "success"})

@app.route("/leaderboard", methods=["GET"])
def getLeaderboard():
    sortedLeaderboard = sorted(leaderboard.items(), key=lambda item: item[1], reverse=True)
    return jsonify(dict(sortedLeaderboard[:10]))
