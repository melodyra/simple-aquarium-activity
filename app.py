from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json, os

app = Flask(__name__)
app.secret_key = 'rahasia-yang-sangat-rahasia'
DATA_FILE = 'account.json'

# Inisialisasi file user
if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w') as f:
        json.dump([], f)

# Status perangkat global
device_status = {
    "uvlamp": "off",
    "foodbottle": "closed",
    "temperature": "--"
}

# Log suhu 24 data terakhir
temperature_log = []

# Fungsi bantu: user
def load_users():
    with open(DATA_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def save_users(users):
    with open(DATA_FILE, 'w') as f:
        json.dump(users, f, indent=4)

# ROUTING UTAMA (WEB)
@app.route("/")
def home():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("index.html", username=session["username"])

@app.route("/about")
def about():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("about.html", username=session["username"])

@app.route("/monitoring")
def monitoring():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("monitoring.html", username=session["username"])

@app.route("/grafik")
def grafik():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("grafik.html", username=session["username"])

@app.route("/contact")
def contact():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("contact.html", username=session["username"])

# LOGIN / SIGNUP
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        users = load_users()
        for user in users:
            if user["username"] == username and user["password"] == password:
                session["username"] = username
                return redirect(url_for("home"))
        return "Login gagal. Username atau password salah.", 401
    return render_template("login.html")

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        users = load_users()
        if any(user["username"] == username for user in users):
            return "Username sudah digunakan. Silakan pilih yang lain.", 400
        users.append({"username": username, "password": password})
        save_users(users)
        return redirect(url_for("login"))
    return render_template("signup.html")

@app.route("/logout")
def logout():
    session.pop("username", None)
    return redirect(url_for("login"))

# API ENDPOINT UNTUK ESP32
@app.route("/get-control-status", methods=["GET"])
def get_control_status():
    try:
        return jsonify(device_status), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/control", methods=["POST"])
def control_device():
    try:
        data = request.get_json()
        device = data.get("device")
        action = data.get("action")
        if device in device_status and action in ["on", "off", "open", "closed"]:
            device_status[device] = action
            return jsonify({"status": "success", "device": device, "action": action}), 200
        return jsonify({"status": "error", "message": "Invalid device or action"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/suhu", methods=["POST"])
def receive_temperature():
    try:
        data = request.get_json()
        suhu = data.get("suhu")
        if suhu is not None:
            device_status["temperature"] = suhu
            try:
                suhu_float = float(suhu)
                temperature_log.append(suhu_float)
                if len(temperature_log) > 24:
                    temperature_log.pop(0)
            except ValueError:
                pass
            return jsonify({"status": "ok", "received": suhu}), 200
        return jsonify({"status": "error", "message": "No suhu sent"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/history", methods=["GET"])
def get_history():
    return jsonify(temperature_log), 200

# RUN APP
if __name__ == "__main__":
    app.run(debug=True)