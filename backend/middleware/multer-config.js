const multer = require("multer");

const MIME_TYPES = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "images");
  },
  filename: (req, file, callback) => {
    const name = file.originalname.split(" ").join("_");
    console.log(JSON.stringify(file.mimetype));
    const extension = MIME_TYPES[file.mimetype];
    if (extension == "png" || extension == "jpg") {
      callback(null, name + Date.now() + "." + extension);
    } else {
      //Comment afficher l'erreur au client??
      console.log("Merci de choisir une photo au format png, jpeg ou jpg");
    }
  },
});

module.exports = multer({ storage }).single("image");
