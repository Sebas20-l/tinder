from flask import Flask, render_template, request, redirect, session

app = Flask(__name__)
app.secret_key = "clave_secreta"

fake_users = {
    "sebastian": "1234",
    "prueba": "abcd"
}

profiles = [
    { "name": "Sofía, 21", "img": "/static/img/img1.jpg" },
    { "name": "María, 22", "img": "/static/img/img2.jpg" },
    { "name": "Laura, 20", "img": "/static/img/img3.jpg" },
]

@app.route("/")
def login():
    return render_template("login.html")

@app.route("/login", methods=["POST"])
def do_login():
    user = request.form["username"]
    pwd = request.form["password"]

    if user in fake_users and fake_users[user] == pwd:
        session["user"] = user
        return redirect("/home")
    else:
        return "Usuario o contraseña incorrectos"

@app.route("/home")
def home():
    if "user" not in session:
        return redirect("/")
    return render_template("home.html", user=session["user"])

@app.route("/swipe")
def swipe():
    if "user" not in session:
        return redirect("/")
    return render_template("swipe.html", profiles=profiles)

@app.route("/profile")
def profile():
    if "user" not in session:
        return redirect("/")
    return render_template("profile.html", user=session["user"])

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

if __name__ == "__main__":
    app.run(debug=True)
