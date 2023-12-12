require("dotenv").config();
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = express();
const File = require("./models/File");

const upload = multer({ dest: "uploads" });

mongoose.connect(process.env.DATABASE_URL);
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("index"));

app.post("/upload", upload.single("file"), async (req, res) => {
  const fileData = {
    path: req.file.path,
    originalName: req.file.originalname,
  };
  if (req.body.password !== null && req.body.password !== "") {
    fileData.password = bcrypt.hashSync(req.body.password, 10);
  }

  const file = await File.create(fileData);
  res.render("index", { fileLink: `${req.headers.origin}/file/${file.id}` });
});

app.route("/file/:id").get(handleDownload).post(handleDownload);

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id);

  if (file.password != null) {
    if (req.body.password == null) {
      res.render("password");
      return;
    }

    const matched = await bcrypt.compare(req.body.password, file.password);

    if (!matched) {
      res.render("password", { error: true });
      return;
    }
  }

  file.downloadCount++;
  await file.save();

  res.download(file.path, file.originalName);
}

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("DB Connection open");
  app.listen(PORT, () => console.log(`Listening to port ${PORT}`));
});
