const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios").default;
const mongoose = require("mongoose");

const Favorite = require("./models/favorite");

const app = express();

app.use(bodyParser.json());

app.get("/favorites", async (req, res) => {
    try {
        const favorites = await Favorite.find();
        res.status(200).json({
            favorites,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message || "Something went wrong.",
        });
    }
});

app.post("/favorites", async (req, res) => {
    const favName = req.body.name;
    const favType = req.body.type;
    const favUrl = req.body.url;

    try {
        if (favType !== "movie" && favType !== "character") {
            throw new Error('"type" should be "movie" or "character"!');
        }

        const existingFav = await Favorite.findOne({ name: favName });
        if (existingFav) {
            throw new Error("Favorite exists already!");
        }

        const favorite = new Favorite({
            name: favName,
            type: favType,
            url: favUrl,
        });

        await favorite.save();

        res.status(201).json({
            message: "Favorite saved!",
            favorite: favorite.toObject(),
        });
    } catch (error) {
        res.status(500).json({
            message: error.message || "Something went wrong.",
        });
    }
});

app.get("/movies", async (req, res) => {
    try {
        const response = await axios.get("https://swapi.dev/api/films");
        res.status(200).json({ movies: response.data });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong." });
    }
});

app.get("/people", async (req, res) => {
    try {
        const response = await axios.get("https://swapi.dev/api/people");
        res.status(200).json({ people: response.data });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong." });
    }
});

async function start() {
    try {
        await mongoose.connect("mongodb://mongodb:27017/swfavorites", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("MongoDB connected");

        app.listen(3000, () => {
            console.log("Server running on port 3000");
        });
    } catch (err) {
        console.error("Mongo connection failed:");
        console.error(err);
        process.exit(1);
    }
}

start();
