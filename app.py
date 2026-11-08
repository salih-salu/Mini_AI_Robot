from flask import Flask, render_template, request, jsonify
from chatbot import get_ai_reply

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_question = data.get("question", "").strip()

    reply = get_ai_reply(user_question)
    return jsonify({"reply": reply})


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
